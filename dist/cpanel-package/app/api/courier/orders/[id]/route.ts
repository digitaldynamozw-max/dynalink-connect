import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStatusChangeNotifications, syncOrderStatus } from '@/lib/notifications'
import { isOrderItemStatus } from '@/lib/order-status'
import {
  appendDeliveryRouteSnapshot,
  createDeliveryCustomerUpdate,
  createDeliveryTimelineEvent,
  syncLateDeliveryAlertsForOrderItems,
  upsertDeliveryProof,
  upsertRiderTracking,
} from '@/lib/courier-tracking'

const COURIER_ALLOWED_STATUSES = ['courier_on_the_way', 'completed'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'courier') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courierId = session.user.id
    const {
      status,
      itemIds,
      proofRecipientName,
      proofSignatureName,
      proofNote,
      proofPhotoDataUrl,
      proofChecklist,
      latitude,
      longitude,
      accuracy,
    } = (await request.json()) as {
      status?: string
      itemIds?: string[]
      proofRecipientName?: string
      proofSignatureName?: string
      proofNote?: string
      proofPhotoDataUrl?: string
      proofChecklist?: {
        handedToRecipient?: boolean
        packageSealed?: boolean
        addressConfirmed?: boolean
      }
      latitude?: number
      longitude?: number
      accuracy?: number
    }

    if (!status || !isOrderItemStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!COURIER_ALLOWED_STATUSES.includes(status as (typeof COURIER_ALLOWED_STATUSES)[number])) {
      return NextResponse.json({ error: 'Couriers can only start or complete delivery' }, { status: 400 })
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No order items selected' }, { status: 400 })
    }

    const assignments = await prisma.notification.findMany({
      where: {
        audience: 'courier_assignment',
        recipientId: courierId,
        orderId,
        orderItemId: { in: itemIds },
      },
      select: { orderItemId: true },
    })

    const assignedIds = assignments
      .map((assignment) => assignment.orderItemId)
      .filter((value): value is string => Boolean(value))

    if (assignedIds.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more items are not assigned to you' }, { status: 403 })
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId,
        id: { in: itemIds },
      },
    })

    if (orderItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'Order items not found' }, { status: 404 })
    }

    const invalidTransition = orderItems.some((item) => {
      if (status === 'courier_on_the_way') {
        return !['accepted', 'courier_on_the_way'].includes(item.status)
      }

      if (status === 'completed') {
        return !['courier_on_the_way', 'completed'].includes(item.status)
      }

      return true
    })

    if (invalidTransition) {
      return NextResponse.json({ error: 'Invalid courier status transition' }, { status: 400 })
    }

    await prisma.orderItem.updateMany({
      where: {
        orderId,
        id: { in: itemIds },
      },
      data: { status },
    })

    await createStatusChangeNotifications(itemIds, status, 'courier')
    const overallStatus = await syncOrderStatus(orderId)

    const updatedItems = await prisma.orderItem.findMany({
      where: {
        orderId,
        id: { in: itemIds },
      },
      include: {
        order: {
          select: {
            userId: true,
          },
        },
        product: true,
        vendor: true,
      },
    })

    const courier = await prisma.user.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    const courierName = courier?.name || courier?.email || 'Courier'

    await Promise.all(
      updatedItems.map(async (item) => {
        await createDeliveryTimelineEvent({
          orderId,
          orderItemId: item.id,
          type: status === 'completed' ? 'completed' : 'started',
          label: status === 'completed' ? 'Delivery completed' : 'Delivery started',
          note:
            status === 'completed'
              ? `${courierName} marked ${item.product.name} as delivered.`
              : `${courierName} started delivery for ${item.product.name}.`,
          actorRole: 'courier',
          actorName: courierName,
          courierId,
          courierName,
        })

        await createDeliveryCustomerUpdate({
          recipientId: item.order.userId,
          orderId,
          orderItemId: item.id,
          type: status === 'completed' ? 'delivery_completed' : 'delivery_started',
          title: status === 'completed' ? 'Delivery completed' : 'Delivery on the way',
          message:
            status === 'completed'
              ? `${item.product.name} has been marked as delivered by ${courierName}.`
              : `${courierName} is on the way with ${item.product.name}.`,
        })

        if (status === 'completed' && courier) {
          const proof = await upsertDeliveryProof({
            orderId,
            orderItemId: item.id,
            courierId,
            courierName,
            recipientName:
              typeof proofRecipientName === 'string' ? proofRecipientName : null,
            signatureName:
              typeof proofSignatureName === 'string' ? proofSignatureName : null,
            note: typeof proofNote === 'string' ? proofNote : null,
            photoUrl: typeof proofPhotoDataUrl === 'string' ? proofPhotoDataUrl : null,
            checklist: proofChecklist || null,
            latitude: typeof latitude === 'number' ? latitude : null,
            longitude: typeof longitude === 'number' ? longitude : null,
          })

          await createDeliveryTimelineEvent({
            orderId,
            orderItemId: item.id,
            type: 'proof_submitted',
            label: 'Proof of delivery',
            note: `Proof submitted for ${item.product.name} to ${proof.recipientName}${proof.signatureName ? ` with signature from ${proof.signatureName}` : ''}.`,
            actorRole: 'courier',
            actorName: courierName,
            courierId,
            courierName,
            recipientName: proof.recipientName,
          })
        }

        if (courier && typeof latitude === 'number' && typeof longitude === 'number') {
          await appendDeliveryRouteSnapshot({
            orderId,
            orderItemId: item.id,
            courierId,
            courierName,
            latitude,
            longitude,
            accuracy: typeof accuracy === 'number' ? accuracy : null,
          })
        }
      })
    )

    await upsertRiderTracking({
      courierId,
      availability: status === 'completed' ? 'available' : 'on_delivery',
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      activeOrderItemId: status === 'completed' ? null : itemIds[0] || null,
    })

    await syncLateDeliveryAlertsForOrderItems(itemIds)

    return NextResponse.json({
      success: true,
      orderStatus: overallStatus,
      items: updatedItems,
    })
  } catch (error) {
    console.error('Courier order update error:', error)
    return NextResponse.json({ error: 'Failed to update courier order status' }, { status: 500 })
  }
}
