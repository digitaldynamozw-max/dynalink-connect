import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DELIVERY_CHANNEL_LOG_AUDIENCE,
  DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
  DELIVERY_EXCEPTION_AUDIENCE,
  LATE_DELIVERY_AUDIENCE,
  getDefaultDeliveryNotificationPreferences,
  parseDeliveryNotificationPreferences,
  parseNotificationPayload,
  type DeliveryChannelLogPayload,
  type DeliveryCustomerUpdatePayload,
  type DeliveryExceptionPayload,
  type DeliveryNotificationPreferences,
  type LateDeliveryAlertPayload,
} from '@/lib/courier-tracking'
import { ORDER_RECEIPT_AUDIENCE } from '@/lib/order-receipts'

function formatNotification(notification: {
  id: string
  audience: string
  channel: string
  title: string
  message: string
  createdAt: Date
  read: boolean
  deliveryStatus?: string | null
  orderId: string | null
  orderItemId: string | null
}) {
  if (notification.audience === DELIVERY_CUSTOMER_UPDATE_AUDIENCE) {
    const payload = parseNotificationPayload<DeliveryCustomerUpdatePayload>(notification.message)
    return {
      ...notification,
      message: payload?.message || notification.message,
      type: payload?.type || 'delivery_update',
    }
  }

  if (notification.audience === DELIVERY_EXCEPTION_AUDIENCE) {
    const payload = parseNotificationPayload<DeliveryExceptionPayload>(notification.message)
    return {
      ...notification,
      message: payload ? `${payload.type.replaceAll('_', ' ')}: ${payload.note}` : notification.message,
      type: payload?.type || 'delivery_exception',
      resolutionStatus: payload?.resolutionStatus || 'open',
      nextAction: payload?.nextAction || null,
    }
  }

  if (notification.audience === LATE_DELIVERY_AUDIENCE) {
    const payload = parseNotificationPayload<LateDeliveryAlertPayload>(notification.message)
    return {
      ...notification,
      message: payload
        ? `Order item is ${payload.minutesLate} min late${payload.expectedBy ? ` and was expected by ${new Date(payload.expectedBy).toLocaleTimeString()}` : ''}.`
        : notification.message,
      type: 'late_delivery',
    }
  }

  if (notification.audience === DELIVERY_CHANNEL_LOG_AUDIENCE) {
    const payload = parseNotificationPayload<DeliveryChannelLogPayload>(notification.message)
    return {
      ...notification,
      message: payload
        ? `${payload.channel.toUpperCase()} update logged: ${payload.message}`
        : notification.message,
      type: payload?.updateType || 'delivery_channel_log',
      channel: payload?.channel || notification.channel || 'in_app',
      deliveryStatus: notification.deliveryStatus || payload?.status || 'logged',
    }
  }

  if (notification.audience === ORDER_RECEIPT_AUDIENCE) {
    const payload = parseNotificationPayload<{ message?: string }>(notification.message)
    return {
      ...notification,
      message: payload?.message || notification.message,
      type: 'order_receipt',
      channel: notification.channel || 'in_app',
    }
  }

  return {
    ...notification,
    type: 'general',
  }
}

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [notifications, user] = await Promise.all([
      prisma.notification.findMany({
      where: {
        recipientId: userId,
        audience: {
          in: [
            DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
            DELIVERY_EXCEPTION_AUDIENCE,
            LATE_DELIVERY_AUDIENCE,
            DELIVERY_CHANNEL_LOG_AUDIENCE,
            ORDER_RECEIPT_AUDIENCE,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          notificationPreferencesJson: true,
        },
      }),
    ])

    return NextResponse.json({
      notifications: notifications.map(formatNotification),
      preferences: parseDeliveryNotificationPreferences(user?.notificationPreferencesJson),
    })
  } catch (error) {
    console.error('Profile notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null) as
      | {
          markRead?: boolean
          preferences?: DeliveryNotificationPreferences
        }
      | null

    const updates: Record<string, unknown> = {}
    if (body?.preferences) {
      const nextPreferences = {
        ...getDefaultDeliveryNotificationPreferences(),
        ...body.preferences,
      }
      updates.notificationPreferencesJson = JSON.stringify(nextPreferences)
    }

    if (Object.keys(updates).length) {
      await prisma.user.update({
        where: { id: userId },
        data: updates,
      })
    }

    if (body?.markRead !== false) {
      await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          audience: {
            in: [
            DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
            DELIVERY_EXCEPTION_AUDIENCE,
            LATE_DELIVERY_AUDIENCE,
            DELIVERY_CHANNEL_LOG_AUDIENCE,
            ORDER_RECEIPT_AUDIENCE,
          ],
        },
          read: false,
        },
        data: {
          read: true,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile notifications mark-read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
