import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all orders where vendor has items
    const orders = await prisma.orderItem.findMany({
      where: { vendorId: session.user.id },
      include: {
        order: {
          include: { user: true }
        },
        product: true
      },
      orderBy: { order: { createdAt: 'desc' } }
    })

    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
