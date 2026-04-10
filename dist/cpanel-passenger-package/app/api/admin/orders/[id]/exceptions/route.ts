import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createDeliveryCustomerUpdate,
  createDeliveryException,
  parseNotificationPayload,
  DELIVERY_EXCEPTION_AUDIENCE,
  type DeliveryExceptionPayload,
  type DeliveryExceptionType,
} from '@/lib/courier-tracking'

const ALLOWED_EXCEPTION_TYPES: DeliveryExceptionType[] = [
  'failed_attempt',
  'customer_unreachable',
  'wrong_address',
  'rescheduled',
  'returned_to_vendor',
  'admin_escalation',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = (await request.json()) as {
      orderItemId?: string
      type?: DeliveryExceptionType
      note?: string
      nextAction?: string
    }

    if (!body.orderItemId || !body.type || !ALLOWED_EXCEPTION_TYPES.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid exception payload' }, { status: 400 })
    }

    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: body.orderItemId,
        orderId,
      },
      include: {
        order: {
          select: {
            userId: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    const assignment = await prisma.notification.findFirst({
      where: {
        audience: 'courier_assignment',
        orderId,
        orderItemId: body.orderItemId,
      },
      select: { recipientId: true },
      orderBy: { createdAt: 'desc' },
    })

    const payload = await createDeliveryException({
      orderId,
      orderItemId: body.orderItemId,
      type: body.type,
      note: body.note?.trim() || 'Admin logged a delivery exception.',
      actorRole: 'admin',
      actorName: 'Admin dispatch',
      customerId: orderItem.order.userId,
      vendorId: orderItem.vendorId,
      courierId: assignment?.recipientId || null,
      nextAction: body.nextAction,
    })

    await createDeliveryCustomerUpdate({
      recipientId: orderItem.order.userId,
      orderId,
      orderItemId: body.orderItemId,
      type: 'delivery_exception',
      title: 'Delivery issue under review',
      message: `${payload.type.replaceAll('_', ' ')}: ${payload.note}`,
    })

    return NextResponse.json({ success: true, exception: payload })
  } catch (error) {
    console.error('Admin exception creation error:', error)
    return NextResponse.json({ error: 'Failed to create delivery exception' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = (await request.json()) as {
      orderItemId?: string
    }

    if (!body.orderItemId) {
      return NextResponse.json({ error: 'Order item is required' }, { status: 400 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        audience: DELIVERY_EXCEPTION_AUDIENCE,
        orderId,
        orderItemId: body.orderItemId,
      },
      select: {
        id: true,
        message: true,
      },
    })

    await Promise.all(
      notifications.map(async (notification) => {
        const payload = parseNotificationPayload<DeliveryExceptionPayload>(notification.message)
        if (!payload) return
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            read: true,
            message: JSON.stringify({
              ...payload,
              resolutionStatus: 'resolved',
            }),
          },
        })
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin exception resolve error:', error)
    return NextResponse.json({ error: 'Failed to resolve delivery exception' }, { status: 500 })
  }
}
