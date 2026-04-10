import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDeliveryQuote } from '@/lib/delivery'
import { generateUniqueOrderNumber, getStoreKey } from '@/lib/orders'
import {
  getResolvedProductOptionGroups,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'
import crypto from 'crypto'

interface CheckoutItem {
  productId: string
  quantity: number
  price: number
  name?: string
  selectedOptions?: SelectedProductOption[]
  selectedOptionsSummary?: string | null
}

const BASE_DELIVERY_MINUTES = 120

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, customerAddress } = body as {
      items: CheckoutItem[]
      customerAddress: string
    }

    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!customerAddress) {
      return NextResponse.json({ error: 'Customer address is required' }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
      },
      select: {
        id: true,
        vendorId: true,
        category: true,
        price: true,
        salePrice: true,
        onSale: true,
        optionGroupsJson: true,
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
          },
        },
      },
    })

    const productMap = new Map(products.map((product) => [product.id, product]))

    const itemsWithVendors: Array<
      CheckoutItem & {
        vendorId: string | null
        finalUnitPrice: number
        selectedOptionsJson: string | null
        selectedOptionsSummary: string | null
      }
    > = []
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }
      if (product.vendorId) {
        const vendor = await prisma.user.findUnique({
          where: { id: product.vendorId }
        })
        if (!vendor) {
          return NextResponse.json(
            { error: `Vendor for product ${item.productId} not found` },
            { status: 404 }
          )
        }
      }

      const optionGroups = getResolvedProductOptionGroups({
        optionGroupsJson: product.optionGroupsJson,
        category: product.category,
        vendorCategory: product.vendor?.vendorCategory,
        vendorName: product.vendor?.vendorName,
      })
      const resolvedOptions = validateAndResolveSelectedOptions(
        optionGroups,
        Object.fromEntries((item.selectedOptions || []).map((option) => [option.groupId, option.valueId]))
      )
      if (!resolvedOptions.ok) {
        return NextResponse.json(
          { error: `${item.name || 'Product'}: ${resolvedOptions.error}` },
          { status: 400 }
        )
      }
      const baseUnitPrice = product.onSale && product.salePrice ? product.salePrice : product.price
      
      itemsWithVendors.push({
        ...item,
        vendorId: product.vendorId,
        finalUnitPrice: baseUnitPrice + resolvedOptions.optionsTotal,
        selectedOptionsJson: resolvedOptions.selectedOptions.length
          ? JSON.stringify(resolvedOptions.selectedOptions)
          : null,
        selectedOptionsSummary: resolvedOptions.selectedSummary || null,
      })
    }

    const storeKeys = [...new Set(itemsWithVendors.map((item) => getStoreKey(item.vendorId)))]
    if (storeKeys.length > 1) {
      return NextResponse.json(
        { error: 'Customers can only place an order from one store at a time.' },
        { status: 400 }
      )
    }

    const deliveryData = await calculateDeliveryQuote(
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      customerAddress
    )

    const unavailableVendors = deliveryData.vendorFees.filter((fee) => fee.available === false)
    if (unavailableVendors.length > 0) {
      const message = unavailableVendors
        .map((vendor) => `${vendor.vendorName}: ${vendor.availabilityMessage || 'Delivery unavailable right now.'}`)
        .join(' ')

      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    const vendorFeeMap = new Map<string, { fee: number; durationMinutes: number | null }>()
    for (const fee of deliveryData.vendorFees) {
      vendorFeeMap.set(fee.vendorId, {
        fee: fee.fee,
        durationMinutes: fee.durationMinutes ?? null,
      })
    }

    const subtotal = itemsWithVendors.reduce((sum, item) => sum + item.finalUnitPrice * item.quantity, 0)
    const deliveryFee = deliveryData.totalDeliveryFee
    const total = subtotal + deliveryFee

    const orderNumber = await generateUniqueOrderNumber()

    // Create order with per-vendor delivery fees
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        total,
        deliveryFee,
        deliveryAddress: customerAddress,
        status: 'pending',
        items: {
          create: itemsWithVendors.map((item) => {
            const vendorDelivery = vendorFeeMap.get(item.vendorId || 'admin') || {
              fee: 0,
              durationMinutes: null,
            }
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: item.finalUnitPrice,
              vendorId: item.vendorId || null,
              selectedOptionsJson: item.selectedOptionsJson,
              selectedOptionsSummary: item.selectedOptionsSummary,
              preparationMinutes: 0,
              additionalDelayMinutes: 0,
              deliveryFee: vendorDelivery.fee,
              estimatedDeliveryMinutes: BASE_DELIVERY_MINUTES,
              vendorEarnings:
                (item.finalUnitPrice * item.quantity) - (item.finalUnitPrice * item.quantity * 0.1) // 10% commission
            }
          })
        }
      }
    })

    // Generate PayNow reference
    const payNowRef = crypto.randomBytes(8).toString('hex').toUpperCase()
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        payNowRef: payNowRef,
      },
    })

    // Return payment details for PayNow
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      payNowRef: payNowRef,
      amount: total,
      subtotal,
      deliveryFee,
      vendorFees: deliveryData.vendorFees,
      successUrl: `${process.env.NEXTAUTH_URL}/success?orderId=${order.id}`,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Detailed error:', errorMessage)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: errorMessage 
    }, { status: 500 })
  }
}
