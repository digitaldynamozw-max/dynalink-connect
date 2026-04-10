import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createCourierAssignmentAudit,
  createDeliveryCustomerUpdate,
  createDeliveryTimelineEvent,
  syncLateDeliveryAlertsForOrderItems,
} from '@/lib/courier-tracking'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const orderItemId = typeof body.orderItemId === 'string' ? body.orderItemId : ''
    const courierId =
      typeof body.courierId === 'string' && body.courierId.trim().length > 0 ? body.courierId : null

    if (!orderItemId) {
      return NextResponse.json({ error: 'Order item is required' }, { status: 400 })
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
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

    const existingAssignment = await prisma.notification.findFirst({
      where: {
        audience: 'courier_assignment',
        orderItemId,
      },
      select: {
        recipientId: true,
        recipient: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    let courier:
      | {
          id: string
          email: string
          name: string | null
          isActive: boolean
        }
      | null = null

    if (courierId) {
      courier = await prisma.user.findFirst({
        where: {
          id: courierId,
          role: 'courier',
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      })

      if (!courier) {
        return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: {
          audience: 'courier_assignment',
          orderItemId,
        },
      })

      if (courier) {
        await tx.notification.create({
          data: {
            recipientId: courier.id,
            audience: 'courier_assignment',
            orderId: orderItem.order.id,
            orderItemId,
            title: 'New delivery assignment',
            message: `You have been assigned to deliver ${orderItem.product.name}.`,
          },
        })
      }

      const previousCourierName =
        existingAssignment?.recipient
          ? existingAssignment.recipient.name || existingAssignment.recipient.email
          : 'Unassigned'
      const nextCourierName = courier ? courier.name || courier.email : 'Unassigned'

      if (previousCourierName !== nextCourierName) {
        await tx.notification.create({
          data: {
            audience: 'admin',
            orderId: orderItem.order.id,
            orderItemId,
            title: `Courier assignment updated for order ${orderItem.order.id.slice(0, 8)}`,
            message: `${orderItem.product.name} moved from ${previousCourierName} to ${nextCourierName}.`,
          },
        })
      }
    })

    await createCourierAssignmentAudit({
      orderId: orderItem.order.id,
      orderItemId,
      previousCourierId: existingAssignment?.recipientId || null,
      previousCourierName:
        existingAssignment?.recipient
          ? existingAssignment.recipient.name || existingAssignment.recipient.email
          : null,
      nextCourierId: courier?.id || null,
      nextCourierName: courier ? courier.name || courier.email : null,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email || 'Admin dispatch',
    })

    await createDeliveryTimelineEvent({
      orderId: orderItem.order.id,
      orderItemId,
      type: 'assigned',
      label: courier ? 'Rider assigned' : 'Rider unassigned',
      note: courier
        ? `${courier.name || courier.email} was assigned to ${orderItem.product.name}.`
        : `${orderItem.product.name} was returned to the unassigned dispatch queue.`,
      actorRole: 'admin',
      actorName: 'Admin dispatch',
      courierId: courier?.id || null,
      courierName: courier ? courier.name || courier.email : null,
    })

    if (courier) {
      await createDeliveryCustomerUpdate({
        recipientId: orderItem.order.userId,
        orderId: orderItem.order.id,
        orderItemId,
        type: 'rider_assigned',
        title: 'Rider assigned to your order',
        message: `${courier.name || courier.email} has been assigned to deliver ${orderItem.product.name}.`,
      })
    }

    await syncLateDeliveryAlertsForOrderItems([orderItemId])

    return NextResponse.json({
      success: true,
      assignment: courier
        ? {
            courierId: courier.id,
            courierName: courier.name || courier.email,
          }
        : null,
    })
  } catch (error) {
    console.error('Courier assignment error:', error)
    return NextResponse.json({ error: 'Failed to update courier assignment' }, { status: 500 })
  }
}
