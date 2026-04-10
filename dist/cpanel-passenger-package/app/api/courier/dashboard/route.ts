import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DELIVERY_EXCEPTION_AUDIENCE,
  DELIVERY_PROOF_AUDIENCE,
  DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
  DELIVERY_TIMELINE_AUDIENCE,
  RIDER_TRACKING_AUDIENCE,
  computeDeliveryRouteHealth,
  computeLateDeliveryState,
  parseNotificationPayload,
  type DeliveryExceptionPayload,
  type DeliveryProofPayload,
  type DeliveryRouteSnapshotPayload,
  type DeliveryTimelinePayload,
  type RiderTrackingPayload,
} from '@/lib/courier-tracking'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'courier') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [courier, assignments, tracking] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
          isActive: true,
          updatedAt: true,
        },
      }),
      prisma.notification.findMany({
        where: {
          audience: 'courier_assignment',
          recipientId: session.user.id,
          orderItemId: {
            not: null,
          },
        },
        select: {
          orderItemId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 18,
      }),
      prisma.notification.findFirst({
        where: {
          audience: RIDER_TRACKING_AUDIENCE,
          recipientId: session.user.id,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!courier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    }

    const assignedOrderItemIds = assignments
      .map((assignment) => assignment.orderItemId)
      .filter((value): value is string => Boolean(value))

    const orderItems = assignedOrderItemIds.length
      ? await prisma.orderItem.findMany({
          where: {
            id: { in: assignedOrderItemIds },
            status: { in: ['pending', 'accepted', 'courier_on_the_way', 'completed'] },
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                deliveryAddress: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    mobileNumber: true,
                  },
                },
              },
            },
            product: {
              select: {
                name: true,
              },
            },
            vendor: {
              select: {
                vendorName: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 18,
        })
      : []

    const [timelineNotifications, proofNotifications, routeSnapshotNotifications, exceptionNotifications] = assignedOrderItemIds.length
      ? await Promise.all([
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_TIMELINE_AUDIENCE,
              orderItemId: { in: assignedOrderItemIds },
            },
            select: {
              orderItemId: true,
              createdAt: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_PROOF_AUDIENCE,
              orderItemId: { in: assignedOrderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
              orderItemId: { in: assignedOrderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_EXCEPTION_AUDIENCE,
              orderItemId: { in: assignedOrderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
        ])
      : [[], [], [], []]

    const timelineMap = new Map<string, DeliveryTimelinePayload[]>()
    for (const notification of timelineNotifications) {
      const payload = parseNotificationPayload<DeliveryTimelinePayload>(notification.message)
      if (!payload || !notification.orderItemId) continue
      const current = timelineMap.get(notification.orderItemId) || []
      current.push(payload)
      timelineMap.set(notification.orderItemId, current)
    }

    const proofMap = new Map<string, DeliveryProofPayload>()
    for (const notification of proofNotifications) {
      const payload = parseNotificationPayload<DeliveryProofPayload>(notification.message)
      if (!payload || !notification.orderItemId || proofMap.has(notification.orderItemId)) continue
      proofMap.set(notification.orderItemId, payload)
    }
    const routeSnapshotMap = new Map<string, DeliveryRouteSnapshotPayload[]>()
    for (const notification of routeSnapshotNotifications) {
      const payload = parseNotificationPayload<DeliveryRouteSnapshotPayload>(notification.message)
      if (!payload || !notification.orderItemId) continue
      const current = routeSnapshotMap.get(notification.orderItemId) || []
      current.push(payload)
      routeSnapshotMap.set(notification.orderItemId, current)
    }
    const exceptionMap = new Map<string, DeliveryExceptionPayload[]>()
    for (const notification of exceptionNotifications) {
      const payload = parseNotificationPayload<DeliveryExceptionPayload>(notification.message)
      if (!payload || !notification.orderItemId) continue
      const current = exceptionMap.get(notification.orderItemId) || []
      current.push(payload)
      exceptionMap.set(notification.orderItemId, current)
    }

    const activeTrips = orderItems.filter((item) => item.status === 'courier_on_the_way').length
    const dispatchQueue = orderItems.filter((item) => ['pending', 'accepted'].includes(item.status)).length
    const completedDeliveries = orderItems.filter((item) => item.status === 'completed').length
    const deliveryFees = orderItems.reduce((sum, item) => sum + item.deliveryFee, 0)

    return NextResponse.json({
      courier,
      tracking: parseNotificationPayload<RiderTrackingPayload>(tracking?.message),
      metrics: {
        activeTrips,
        dispatchQueue,
        completedDeliveries,
        deliveryFees,
      },
      items: orderItems.map((item) => {
        const routeReplay = routeSnapshotMap.get(item.id) || []
        const lateDelivery = computeLateDeliveryState({
          status: item.status,
          estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
          createdAt: item.order.createdAt,
          timeline: timelineMap.get(item.id) || [],
        })

        return {
          id: item.id,
          status: item.status,
          estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
          deliveryFee: item.deliveryFee,
          updatedAt: item.updatedAt,
          productName: item.product.name,
          vendorName: item.vendor?.vendorName || 'Admin Store',
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          deliveryAddress: item.order.deliveryAddress || 'No address saved',
          customerName:
            [item.order.user.firstName, item.order.user.lastName].filter(Boolean).join(' ') ||
            item.order.user.name ||
            item.order.user.email,
          customerPhone: item.order.user.mobileNumber || 'No phone saved',
          createdAt: item.order.createdAt,
          timeline: timelineMap.get(item.id) || [],
          proof: proofMap.get(item.id) || null,
          routeReplay,
          exceptions: exceptionMap.get(item.id) || [],
          lateDelivery,
          routeHealth: computeDeliveryRouteHealth({
            status: item.status,
            estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
            routeReplay,
            lateDelivery,
          }),
        }
      }),
    })
  } catch (error) {
    console.error('Courier dashboard fetch error:', error)
    return NextResponse.json({ error: 'Failed to load courier dashboard' }, { status: 500 })
  }
}
