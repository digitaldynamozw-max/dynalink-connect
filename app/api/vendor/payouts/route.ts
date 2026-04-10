import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActingVendorId } from '@/lib/vendor-actor'
import { syncVendorLedgerBalance } from '@/lib/vendor-ledger'

const PAYOUT_ELIGIBLE_ITEM_STATUSES = ['accepted', 'courier_on_the_way', 'completed'] as const
const MINIMUM_PAYOUT_AMOUNT = 5

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = resolveActingVendorId(request, session).vendorId

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, commissionRate: true }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const [payouts, recentCompletedSales] = await Promise.all([
      prisma.vendorPayout.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.orderItem.findMany({
        where: {
          vendorId,
          status: 'completed',
        },
        select: {
          id: true,
          quantity: true,
          vendorEarnings: true,
          payoutId: true,
          updatedAt: true,
          product: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ])

    // Calculate pending earnings
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

    const failedPayouts = payouts
      .filter((payout) => ['failed', 'rejected'].includes(payout.status))
      .reduce((sum, payout) => sum + payout.amount, 0)

    const ledger = await syncVendorLedgerBalance(prisma, vendorId)
    if (!ledger) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    return NextResponse.json({
      payouts: formattedPayouts,
      pendingPayout: ledger.availableBalance,
      requestedPayouts: ledger.requestedPayouts,
      totalEarnings: ledger.totalEarnings,
      completedPayouts,
      failedPayouts,
      lastPayoutDate: payouts.find((payout) => payout.status === 'completed')?.processedAt?.toISOString() || null,
      commissionRate: vendor.commissionRate,
      completedSalesTotal: ledger.completedSalesTotal,
      recentCompletedSales: recentCompletedSales.map((item) => ({
        id: item.id,
        orderId: item.order.id,
        orderNumber: item.order.orderNumber || item.order.id.slice(0, 8),
        orderStatus: item.order.status,
        productName: item.product.name,
        quantity: item.quantity,
        vendorEarnings: item.vendorEarnings,
        payoutStatus: item.payoutId ? 'Allocated to payout' : 'Available in balance',
        completedAt: item.updatedAt.toISOString(),
      })),
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

    const vendorId = resolveActingVendorId(request, session).vendorId
    const body = await request.json().catch(() => ({}))
    const { paymentMethod = 'bank_transfer' } = body

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, commissionRate: true }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const eligibleOrders = await prisma.orderItem.findMany({
      where: {
        vendorId,
        payoutId: null,
        status: {
          in: [...PAYOUT_ELIGIBLE_ITEM_STATUSES],
        },
      },
      include: {
        order: true
      }
    })

    const ledger = await syncVendorLedgerBalance(prisma, vendorId)
    if (!ledger) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    if (ledger.availableBalance <= 0) {
      return NextResponse.json(
        { error: 'No available balance for payout. Pending payout requests are already holding your current balance.' },
        { status: 400 }
      )
    }

    if (ledger.availableBalance < MINIMUM_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum payout request is $${MINIMUM_PAYOUT_AMOUNT.toFixed(2)}.` },
        { status: 400 }
      )
    }

    const totalAmount = ledger.availableBalance

    const payout = await prisma.$transaction(async (tx) => {
      const createdPayout = await tx.vendorPayout.create({
        data: {
          vendorId,
          amount: totalAmount,
          ordersIncluded: eligibleOrders.length,
          paymentMethod,
          status: 'requested',
        }
      })

      if (eligibleOrders.length > 0) {
        await tx.orderItem.updateMany({
          where: {
            id: { in: eligibleOrders.map((item) => item.id) },
          },
          data: {
            payoutId: createdPayout.id,
          },
        })
      }

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
