import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createDeliveryCustomerUpdate,
  createDeliveryException,
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
    if (!session?.user?.id || session.user.role !== 'courier') {
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
        recipientId: session.user.id,
      },
      select: { id: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'This order item is not assigned to you' }, { status: 403 })
    }

    const courier = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    })

    const payload = await createDeliveryException({
      orderId,
      orderItemId: body.orderItemId,
      type: body.type,
      note: body.note?.trim() || 'Courier reported a delivery exception.',
      actorRole: 'courier',
      actorName: courier?.name || courier?.email || 'Courier',
      customerId: orderItem.order.userId,
      vendorId: orderItem.vendorId,
      courierId: session.user.id,
      nextAction: body.nextAction,
    })

    await createDeliveryCustomerUpdate({
      recipientId: orderItem.order.userId,
      orderId,
      orderItemId: body.orderItemId,
      type: 'delivery_exception',
      title: 'Delivery issue reported',
      message: `${payload.type.replaceAll('_', ' ')}: ${payload.note}`,
    })

    return NextResponse.json({ success: true, exception: payload })
  } catch (error) {
    console.error('Courier exception creation error:', error)
    return NextResponse.json({ error: 'Failed to create delivery exception' }, { status: 500 })
  }
}
