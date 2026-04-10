import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      const updated = await prisma.vendorPayout.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedAt,
          reviewedById: adminId,
          reviewNotes,
          processedAt: reviewedAt,
        },
      })

      return NextResponse.json({
        success: true,
        payout: updated,
        message: 'Payout request approved.',
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
