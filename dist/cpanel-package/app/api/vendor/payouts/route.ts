import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type SessionUser = {
  id?: string
}

const ACTIVE_PAYOUT_STATUSES = ['requested', 'approved', 'processing'] as const

function calculateVendorEarnings(amount: number, commissionRate: number, deliveryFee: number) {
  const commission = amount * (commissionRate / 100)
  return amount - commission + deliveryFee
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = (session.user as SessionUser).id

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const availableOrderItems = await prisma.orderItem.findMany({
      where: {
        vendorId,
        payoutId: null,
        order: {
          status: 'paid'
        }
      },
      include: {
        order: true
      }
    })

    const pendingEarnings = availableOrderItems.reduce(
      (sum, item) =>
        sum + calculateVendorEarnings(item.price * item.quantity, vendor.commissionRate, item.deliveryFee),
      0
    )

    const formattedPayouts = payouts.map((payout) => ({
      id: payout.id,
      amount: payout.amount,
      createdAt: payout.createdAt.toISOString(),
      status: payout.status,
      processedAt: payout.processedAt?.toISOString() || null,
      reviewedAt: payout.reviewedAt?.toISOString() || null,
      reviewNotes: payout.reviewNotes || null,
      ordersIncluded: payout.ordersIncluded,
      paymentMethod: payout.paymentMethod,
      transactionId: payout.transactionId
    }))

    const completedPayouts = payouts
      .filter((payout) => payout.status === 'completed')
      .reduce((sum, payout) => sum + payout.amount, 0)

    const requestedPayouts = payouts
      .filter((payout) => ACTIVE_PAYOUT_STATUSES.includes(payout.status as (typeof ACTIVE_PAYOUT_STATUSES)[number]))
      .reduce((sum, payout) => sum + payout.amount, 0)

    const failedPayouts = payouts
      .filter((payout) => ['failed', 'rejected'].includes(payout.status))
      .reduce((sum, payout) => sum + payout.amount, 0)

    return NextResponse.json({
      payouts: formattedPayouts,
      pendingPayout: pendingEarnings,
      requestedPayouts,
      totalEarnings: completedPayouts + requestedPayouts + pendingEarnings,
      completedPayouts,
      failedPayouts,
      lastPayoutDate: payouts.find((payout) => payout.status === 'completed')?.processedAt?.toISOString() || null,
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

    const vendorId = (session.user as SessionUser).id
    const body = await request.json().catch(() => ({}))
    const { paymentMethod = 'bank_transfer' } = body

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        payoutId: null,
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
    const totalAmount = unpaidOrders.reduce(
      (sum, item) =>
        sum + calculateVendorEarnings(item.price * item.quantity, vendor.commissionRate, item.deliveryFee),
      0
    )

    const payout = await prisma.$transaction(async (tx) => {
      const createdPayout = await tx.vendorPayout.create({
        data: {
          vendorId,
          amount: totalAmount,
          ordersIncluded: unpaidOrders.length,
          paymentMethod,
          status: 'requested',
        }
      })

      await tx.orderItem.updateMany({
        where: {
          id: { in: unpaidOrders.map((item) => item.id) },
        },
        data: {
          payoutId: createdPayout.id,
        },
      })

      return createdPayout
    })

    return NextResponse.json({
      success: true,
      payout,
      message: `Payout request submitted for admin approval: $${totalAmount.toFixed(2)}`
    })
  } catch (error) {
    console.error('Error creating payout:', error)
    return NextResponse.json(
      { error: 'Failed to create payout' },
      { status: 500 }
    )
  }
}
