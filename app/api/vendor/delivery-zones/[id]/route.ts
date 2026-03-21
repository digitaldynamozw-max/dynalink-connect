import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const zone = await prisma.deliveryZone.findUnique({
      where: { id }
    })

    if (!zone || zone.vendorId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.deliveryZone.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete delivery zone' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const zone = await prisma.deliveryZone.findUnique({
      where: { id }
    })

    if (!zone || zone.vendorId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data: {
        baseFee: body.baseFee ? parseFloat(body.baseFee) : undefined,
        perKmFee: body.perKmFee ? parseFloat(body.perKmFee) : undefined,
        maxDistance: body.maxDistance ? parseFloat(body.maxDistance) : undefined,
        active: body.active !== undefined ? body.active : undefined
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update delivery zone' },
      { status: 500 }
    )
  }
}
