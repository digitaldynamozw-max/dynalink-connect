import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncVendorLedgerBalance } from '@/lib/vendor-ledger'

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user && (session.user as { role?: string }).role === 'admin'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = (session?.user as { id?: string } | undefined)?.id || null
    const { id } = await params
    const body = await request.json()
    const action = String(body.action || '').trim().toLowerCase()
    const reviewNotes =
      typeof body.reviewNotes === 'string' && body.reviewNotes.trim()
        ? body.reviewNotes.trim()
        : null

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payout action' }, { status: 400 })
    }

    const payout = await prisma.vendorPayout.findUnique({
      where: { id },
      include: {
        items: {
          select: { id: true },
        },
      },
    })

    if (!payout) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 })
    }

    if (payout.status !== 'requested') {
      return NextResponse.json({ error: 'Only requested payouts can be reviewed' }, { status: 400 })
    }

    const reviewedAt = new Date()

    if (action === 'approve') {
      const updated = await prisma.$transaction(async (tx) => {
        const ledger = await syncVendorLedgerBalance(tx, payout.vendorId)
        if (!ledger) {
          throw new Error('Vendor not found')
        }

        if (ledger.ledgerBalance < payout.amount) {
          throw new Error('Vendor balance is lower than the requested payout amount')
        }
        const approvedPayout = await tx.vendorPayout.update({
          where: { id },
          data: {
            status: 'approved',
            reviewedAt,
            reviewedById: adminId,
            reviewNotes,
            processedAt: reviewedAt,
          },
        })

        await syncVendorLedgerBalance(tx, payout.vendorId)

        return approvedPayout
      })

      return NextResponse.json({
        success: true,
        payout: updated,
        message: 'Payout request approved and deducted from the vendor balance.',
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rejectedPayout = await tx.vendorPayout.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedAt,
          reviewedById: adminId,
          reviewNotes,
        },
      })

      await tx.orderItem.updateMany({
        where: {
          payoutId: id,
        },
        data: {
          payoutId: null,
        },
      })

      await syncVendorLedgerBalance(tx, payout.vendorId)

      return rejectedPayout
    })

    return NextResponse.json({
      success: true,
      payout: updated,
      message: 'Payout request rejected and earnings released back to the vendor.',
    })
  } catch (error) {
    console.error('Admin payout review error:', error)
    return NextResponse.json({ error: 'Failed to review payout request' }, { status: 500 })
  }
}
