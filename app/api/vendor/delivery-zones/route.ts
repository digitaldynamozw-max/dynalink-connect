import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET all delivery zones for vendor
export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zones = await prisma.deliveryZone.findMany({
      where: { vendorId: session.user.id }
    })

    return NextResponse.json(zones)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch delivery zones' },
      { status: 500 }
    )
  }
}

// POST - Add new delivery zone
export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { zipCode, city, state, baseFee, perKmFee, maxDistance } = body

    const zone = await prisma.deliveryZone.create({
      data: {
        vendorId: session.user.id,
        zipCode,
        city,
        state,
        baseFee: parseFloat(baseFee),
        perKmFee: parseFloat(perKmFee),
        maxDistance: parseFloat(maxDistance),
        active: true
      }
    })

    return NextResponse.json(zone)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Delivery zone for this zip code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create delivery zone' },
      { status: 500 }
    )
  }
}
