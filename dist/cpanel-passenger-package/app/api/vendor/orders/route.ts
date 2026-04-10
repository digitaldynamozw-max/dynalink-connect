import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DELIVERY_EXCEPTION_AUDIENCE, parseNotificationPayload, type DeliveryExceptionPayload } from '@/lib/courier-tracking'

export async function GET() {
  try {
    const session = await auth()
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

    const orderItemIds = orders.map((item) => item.id)
    const exceptions = orderItemIds.length
      ? await prisma.notification.findMany({
          where: {
            audience: DELIVERY_EXCEPTION_AUDIENCE,
            orderItemId: { in: orderItemIds },
          },
          select: {
            orderItemId: true,
            message: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    const exceptionMap = new Map<string, DeliveryExceptionPayload[]>()
    for (const exception of exceptions) {
      const payload = parseNotificationPayload<DeliveryExceptionPayload>(exception.message)
      if (!payload || !exception.orderItemId) continue
      const current = exceptionMap.get(exception.orderItemId) || []
      current.push(payload)
      exceptionMap.set(exception.orderItemId, current)
    }

    return NextResponse.json(
      orders.map((item) => ({
        ...item,
        orderNumber: item.order.orderNumber,
        exceptions: exceptionMap.get(item.id) || [],
      }))
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
