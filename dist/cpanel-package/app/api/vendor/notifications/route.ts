import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  DELIVERY_EXCEPTION_AUDIENCE,
  LATE_DELIVERY_AUDIENCE,
  parseNotificationPayload,
  type DeliveryExceptionPayload,
  type LateDeliveryAlertPayload,
} from '@/lib/courier-tracking'

function formatNotificationMessage(notification: { audience: string; message: string }) {
  if (notification.audience !== LATE_DELIVERY_AUDIENCE) {
    if (notification.audience === DELIVERY_EXCEPTION_AUDIENCE) {
      const payload = parseNotificationPayload<DeliveryExceptionPayload>(notification.message)
      return payload ? `${payload.type.replaceAll('_', ' ')}: ${payload.note}` : notification.message
    }
    return notification.message
  }

  const payload = parseNotificationPayload<LateDeliveryAlertPayload>(notification.message)
  if (!payload) {
    return notification.message
  }

  return `Delivery is ${payload.minutesLate} min behind schedule for order ${payload.orderId.slice(0, 8)}.`
}

export async function GET() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string } | undefined

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        audience: {
          in: ['vendor', LATE_DELIVERY_AUDIENCE, DELIVERY_EXCEPTION_AUDIENCE],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(
      notifications.map((notification) => ({
        ...notification,
        message: formatNotificationMessage(notification),
      }))
    )
  } catch (error) {
    console.error('Vendor notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string } | undefined

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        audience: {
          in: ['vendor', LATE_DELIVERY_AUDIENCE, DELIVERY_EXCEPTION_AUDIENCE],
        },
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vendor notifications mark-read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
