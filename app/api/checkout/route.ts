import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, customerAddress } = body

    const userId = (session?.user as any)?.id as string | undefined
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

    // Calculate delivery fees by vendor
    const deliveryResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/delivery/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        customerAddress
      })
    })

    if (!deliveryResponse.ok) {
      const errData = await deliveryResponse.json()
      return NextResponse.json({ error: errData.error || 'Failed to calculate delivery fee' }, { status: 400 })
    }

    const deliveryData = await deliveryResponse.json()
    
    // Create mapping of vendorId to delivery fee
    const vendorFeeMap = new Map()
    for (const fee of deliveryData.vendorFees) {
      vendorFeeMap.set(fee.vendorId, fee.fee)
    }

    // Calculate item totals and map vendors
    const itemsWithVendors: any[] = []
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }
      
      // Verify vendor exists if vendorId is set
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
      
      itemsWithVendors.push({
        ...item,
        vendorId: product.vendorId  // Keep vendorId as null if not set
      })
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const deliveryFee = deliveryData.totalDeliveryFee
    const total = subtotal + deliveryFee

    // Create order with per-vendor delivery fees
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        deliveryFee,
        deliveryAddress: customerAddress,
        status: 'pending',
        items: {
          create: itemsWithVendors.map((item: any) => {
            const vendorDeliveryFee = vendorFeeMap.get(item.vendorId || 'admin') || 0
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              vendorId: item.vendorId || null,  // Set to null if no vendor
              deliveryFee: vendorDeliveryFee,
              vendorEarnings: (item.price * item.quantity) - (item.price * item.quantity * 0.1) // 10% commission
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