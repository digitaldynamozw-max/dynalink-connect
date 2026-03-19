import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const referrals = await (prisma as any).referral.findMany({
      where: { referrerId: session.user.id },
      include: {
        referred: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const completed = referrals.filter(r => r.status === 'completed').length
    const pending = referrals.filter(r => r.status === 'pending').length
    const totalRewards = referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.rewardAmount, 0)

    return NextResponse.json({
      referrals,
      completed,
      pending,
      totalRewards
    })
  } catch (error) {
    console.error('Referrals fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists with that email
    const referred = await prisma.user.findUnique({
      where: { email }
    })

    if (!referred) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
    }

    if (referred.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
    }

    // Check if referral already exists
    const existingReferral = await (prisma as any).referral.findFirst({
      where: {
        referrerId: session.user.id,
        referredId: referred.id
      }
    })

    if (existingReferral) {
      return NextResponse.json({ error: 'You have already referred this user' }, { status: 400 })
    }

    // Create referral
    const referral = await (prisma as any).referral.create({
      data: {
        referrerId: session.user.id,
        referredId: referred.id,
        status: 'pending'
      },
      include: {
        referred: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    // TODO: Send email notification to referred user

    return NextResponse.json({
      message: 'Referral sent successfully',
      referral
    })
  } catch (error) {
    console.error('Referral creation error:', error)
    return NextResponse.json({ error: 'Failed to send referral' }, { status: 500 })
  }
}
