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

  const expectedBy = payload.expectedBy ? new Date(payload.expectedBy).toLocaleTimeString() : 'the expected delivery time'
  return `This order item is ${payload.minutesLate} min late. Expected by ${expectedBy}.`
}

export async function GET() {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { audience: 'admin' },
          { audience: LATE_DELIVERY_AUDIENCE, recipientId: null },
          { audience: DELIVERY_EXCEPTION_AUDIENCE, recipientId: null },
        ],
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
    console.error('Admin notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        OR: [
          { audience: 'admin' },
          { audience: LATE_DELIVERY_AUDIENCE, recipientId: null },
          { audience: DELIVERY_EXCEPTION_AUDIENCE, recipientId: null },
        ],
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin notifications mark-read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
