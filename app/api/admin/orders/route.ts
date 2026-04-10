import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
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
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [orders, assignments, riderTracking, timelines, proofs, routeSnapshots, exceptions] = await Promise.all([
      prisma.order.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
              mobileNumber: true,
            },
          },
          items: {
            include: {
              product: true,
              vendor: {
                select: {
                  id: true,
                  vendorName: true,
                  storeAddress: true,
                  storeCity: true,
                  storeState: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          audience: 'courier_assignment',
          orderItemId: { not: null },
        },
        select: {
          orderItemId: true,
          recipientId: true,
          recipient: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          audience: RIDER_TRACKING_AUDIENCE,
          recipientId: { not: null },
        },
        select: {
          recipientId: true,
          message: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          audience: DELIVERY_TIMELINE_AUDIENCE,
          orderItemId: { not: null },
        },
        select: {
          orderItemId: true,
          message: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          audience: DELIVERY_PROOF_AUDIENCE,
          orderItemId: { not: null },
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
          orderItemId: { not: null },
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
          orderItemId: { not: null },
        },
        select: {
          orderItemId: true,
          message: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const assignmentMap = new Map(
      assignments.map((assignment) => [assignment.orderItemId, assignment])
    )
    const trackingMap = new Map<string, RiderTrackingPayload>()
    for (const tracking of riderTracking) {
      const payload = parseNotificationPayload<RiderTrackingPayload>(tracking.message)
      if (!payload || !tracking.recipientId || trackingMap.has(tracking.recipientId)) continue
      trackingMap.set(tracking.recipientId, payload)
    }
    const timelineMap = new Map<string, DeliveryTimelinePayload[]>()
    for (const timeline of timelines) {
      const payload = parseNotificationPayload<DeliveryTimelinePayload>(timeline.message)
      if (!payload || !timeline.orderItemId) continue
      const current = timelineMap.get(timeline.orderItemId) || []
      current.push(payload)
      timelineMap.set(timeline.orderItemId, current)
    }
    const proofMap = new Map<string, DeliveryProofPayload>()
    for (const proof of proofs) {
      const payload = parseNotificationPayload<DeliveryProofPayload>(proof.message)
      if (!payload || !proof.orderItemId || proofMap.has(proof.orderItemId)) continue
      proofMap.set(proof.orderItemId, payload)
    }
    const routeSnapshotMap = new Map<string, DeliveryRouteSnapshotPayload[]>()
    for (const snapshot of routeSnapshots) {
      const payload = parseNotificationPayload<DeliveryRouteSnapshotPayload>(snapshot.message)
      if (!payload || !snapshot.orderItemId) continue
      const current = routeSnapshotMap.get(snapshot.orderItemId) || []
      current.push(payload)
      routeSnapshotMap.set(snapshot.orderItemId, current)
    }
    const exceptionMap = new Map<string, DeliveryExceptionPayload[]>()
    for (const exception of exceptions) {
      const payload = parseNotificationPayload<DeliveryExceptionPayload>(exception.message)
      if (!payload || !exception.orderItemId) continue
      const current = exceptionMap.get(exception.orderItemId) || []
      current.push(payload)
      exceptionMap.set(exception.orderItemId, current)
    }

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        items: order.items.map((item) => {
          const assignment = assignmentMap.get(item.id)
          const timeline = timelineMap.get(item.id) || []
          const routeReplay = routeSnapshotMap.get(item.id) || []
          const lateDelivery = computeLateDeliveryState({
            status: item.status,
            estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
            createdAt: order.createdAt,
            timeline,
          })
          return {
            ...item,
            assignedCourierId: assignment?.recipientId || null,
            assignedCourierName: assignment?.recipient
              ? assignment.recipient.name || assignment.recipient.email
              : null,
            assignedCourierTracking:
              assignment?.recipientId ? trackingMap.get(assignment.recipientId) || null : null,
            timeline,
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
      }))
    )
  } catch (error) {
    console.error('Admin orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch admin orders' }, { status: 500 })
  }
}
