import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = (session.user as any).id

    // Get vendor info
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, commissionRate: true }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Get all payouts for this vendor
    const payouts = await prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate pending earnings
    const pendingOrders = await prisma.orderItem.findMany({
      where: {
        vendorId,
        order: {
          status: 'paid'
        }
      },
      include: {
        order: true
      }
    })

    let pendingEarnings = 0
    for (const item of pendingOrders) {
      const commission = (item.price * item.quantity) * (vendor.commissionRate / 100)
      const earnings = (item.price * item.quantity) - commission + item.deliveryFee
      pendingEarnings += earnings
    }

    return NextResponse.json({
      payouts,
      pendingEarnings,
      totalEarnings: payouts.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0) + pendingEarnings,
      commissionRate: vendor.commissionRate
    })
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = (session.user as any).id
    const body = await request.json()
    const { paymentMethod = 'bank_transfer' } = body

    // Get vendor info
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, commissionRate: true }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Get unpaid order items
    const unpaidOrders = await prisma.orderItem.findMany({
      where: {
        vendorId,
        order: {
          status: 'paid'
        }
      },
      include: {
        order: true
      }
    })

    if (unpaidOrders.length === 0) {
      return NextResponse.json({ error: 'No pending earnings' }, { status: 400 })
    }

    // Calculate total payout amount
    let totalAmount = 0
    for (const item of unpaidOrders) {
      const commission = (item.price * item.quantity) * (vendor.commissionRate / 100)
      const earnings = (item.price * item.quantity) - commission + item.deliveryFee
      totalAmount += earnings
    }

    // Create payout record
    const payout = await prisma.vendorPayout.create({
      data: {
        vendorId,
        amount: totalAmount,
        ordersIncluded: unpaidOrders.length,
        paymentMethod,
        status: 'pending',
        processedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      payout,
      message: `Payout request created for $${totalAmount.toFixed(2)}`
    })
  } catch (error) {
    console.error('Error creating payout:', error)
    return NextResponse.json(
      { error: 'Failed to create payout' },
      { status: 500 }
    )
  }
}
