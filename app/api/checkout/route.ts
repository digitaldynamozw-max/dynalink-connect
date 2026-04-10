import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDeliveryQuote } from '@/lib/delivery'
import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { generateUniqueOrderNumber, getStoreKey } from '@/lib/orders'
import {
  getResolvedProductOptionGroups,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'
import { calculateCommissionSurcharge, calculateVendorSettlement, roundCurrency } from '@/lib/vendor-ledger'
import { sendOrderReceipt } from '@/lib/order-receipts'
import crypto from 'crypto'

interface CheckoutItem {
  productId: string
  quantity: number
  price: number
  name?: string
  selectedOptions?: SelectedProductOption[]
  selectedOptionsSummary?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, customerAddress, requestedDeliveryAt, fulfillmentMethod } = body as {
      items: CheckoutItem[]
      customerAddress?: string
      requestedDeliveryAt?: string | null
      fulfillmentMethod?: 'delivery' | 'pickup'
    }

    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await ensureSiteSettings()
    const selectedFulfillmentMethod = fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery'

    if (settings.platformOrdersPaused) {
      return NextResponse.json({ error: 'The marketplace is not accepting orders right now.' }, { status: 400 })
    }

    if (settings.allStoresTemporarilyClosed) {
      return NextResponse.json({ error: 'All stores are temporarily closed right now.' }, { status: 400 })
    }

    if (selectedFulfillmentMethod === 'pickup' && !settings.pickupEnabled) {
      return NextResponse.json({ error: 'Collection is not available right now.' }, { status: 400 })
    }

    if (selectedFulfillmentMethod === 'delivery' && !customerAddress) {
      return NextResponse.json({ error: 'Customer address is required' }, { status: 400 })
    }

    const scheduledDeliveryAt = requestedDeliveryAt
      ? new Date(requestedDeliveryAt)
      : null

    if (scheduledDeliveryAt && Number.isNaN(scheduledDeliveryAt.getTime())) {
      return NextResponse.json({ error: 'Invalid requested delivery time' }, { status: 400 })
    }

    if (scheduledDeliveryAt && scheduledDeliveryAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Requested delivery time must be in the future' },
        { status: 400 }
      )
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
            commissionRate: true,
            storeAddress: true,
            storeCity: true,
            storeState: true,
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
        if (vendor.temporarilyClosed) {
          return NextResponse.json(
            { error: `${vendor.vendorName || 'This store'} is temporarily closed.` },
            { status: 400 }
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

    const pickupVendor = products[0]?.vendor
    const pickupAddress = [pickupVendor?.storeAddress, pickupVendor?.storeCity, pickupVendor?.storeState]
      .filter(Boolean)
      .join(', ')

    const deliveryData =
      selectedFulfillmentMethod === 'delivery'
        ? await calculateDeliveryQuote(
            items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            customerAddress || ''
          )
        : {
            customerAddress: pickupAddress || settings.platformStoreAddress || 'Collection from vendor shop',
            vendorFees: [],
            totalDeliveryFee: 0,
          }

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
    const vendorCommissionTotal = roundCurrency(
      itemsWithVendors.reduce((sum, item) => {
        const product = productMap.get(item.productId)
        const commissionRate = product?.vendor?.commissionRate ?? 0
        return sum + calculateCommissionSurcharge(item.finalUnitPrice * item.quantity, commissionRate)
      }, 0)
    )
    const platformFee = roundCurrency(Number(settings.platformFeePerOrder || 0) + vendorCommissionTotal)
    const total = roundCurrency(subtotal + deliveryFee + platformFee)

    const orderNumber = await generateUniqueOrderNumber()

    // Create order with per-vendor delivery fees
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        total,
        deliveryFee,
        platformFee,
        fulfillmentMethod: selectedFulfillmentMethod,
        deliveryAddress:
          selectedFulfillmentMethod === 'pickup'
            ? pickupAddress || settings.platformStoreAddress || null
            : customerAddress || null,
        requestedDeliveryAt: scheduledDeliveryAt,
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
              estimatedDeliveryMinutes:
                selectedFulfillmentMethod === 'pickup' ? 0 : settings.globalDeliveryEtaMinutes,
              vendorEarnings: calculateVendorSettlement(item.finalUnitPrice * item.quantity, vendorDelivery.fee),
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

    await sendOrderReceipt(order.id)

    // Return payment details for PayNow
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      payNowRef: payNowRef,
      amount: total,
      subtotal,
      deliveryFee,
      platformFee,
      vendorCommissionTotal,
      fulfillmentMethod: selectedFulfillmentMethod,
      requestedDeliveryAt: order.requestedDeliveryAt,
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
