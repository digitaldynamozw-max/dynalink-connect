import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user?.id || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : undefined
    const rewardAmount =
      body.rewardAmount === undefined || body.rewardAmount === null || body.rewardAmount === ''
        ? undefined
        : Number(body.rewardAmount)

    if (status && !['pending', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid referral status' }, { status: 400 })
    }

    if (rewardAmount !== undefined && (!Number.isFinite(rewardAmount) || rewardAmount < 0)) {
      return NextResponse.json({ error: 'Reward amount must be 0 or higher' }, { status: 400 })
    }

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(rewardAmount !== undefined ? { rewardAmount } : {}),
      },
      include: {
        referrer: {
          select: {
            email: true,
            name: true,
            vendorName: true,
          },
        },
        referred: {
          select: {
            email: true,
            name: true,
            vendorName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error('Admin referral update error:', error)
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
  }
}
