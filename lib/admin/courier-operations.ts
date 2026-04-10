import { prisma } from '@/lib/prisma'
import {
  COURIER_ASSIGNMENT_AUDIT_AUDIENCE,
  DELIVERY_EXCEPTION_AUDIENCE,
  DELIVERY_PROOF_AUDIENCE,
  DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
  DELIVERY_TIMELINE_AUDIENCE,
  RIDER_TRACKING_AUDIENCE,
  computeDeliveryRouteHealth,
  computeLateDeliveryState,
  parseNotificationPayload,
  type CourierAssignmentAuditPayload,
  type DeliveryExceptionPayload,
  type DeliveryProofPayload,
  type DeliveryRouteHealth,
  type DeliveryRouteSnapshotPayload,
  type DeliveryTimelinePayload,
  type LateDeliveryState,
  type RiderTrackingPayload,
} from '@/lib/courier-tracking'

export type CourierRow = {
  id: string
  email: string
  name: string | null
  mobileNumber: string | null
  role: string
  isActive: boolean
  updatedAt: Date
}

type AssignmentRow = {
  orderItemId: string | null
  recipientId: string | null
  recipient: {
    id: string
    email: string
    name: string | null
    isActive: boolean
  } | null
}

export type DispatchRow = {
  id: string
  orderId: string
  vendorName: string
  productName: string
  estimatedDeliveryMinutes: number | null
  status: string
  assignedCourierId: string | null
  assignedCourierName: string | null
  assignedCourierAvailability: string | null
  assignedCourierLastSeenAt: string | null
  assignedCourierLatitude: number | null
  assignedCourierLongitude: number | null
  latestEventLabel: string | null
  proofRecipientName: string | null
  deliveryFee: number
  deliveryAddress: string | null
  customerName: string
  routeReplay: DeliveryRouteSnapshotPayload[]
  lateDelivery: LateDeliveryState
  routeHealth: DeliveryRouteHealth
  exceptions: DeliveryExceptionPayload[]
  recommendedCourierId: string | null
  recommendedCourierName: string | null
  latestAssignmentAudit: CourierAssignmentAuditPayload | null
}

export type LiveCourierRow = CourierRow & {
  tracking: RiderTrackingPayload | null
  activeAssignments: number
  completedDeliveries: number
  totalDeliveryFees: number
  latestDestinations: string[]
  activeRouteReplay: DeliveryRouteSnapshotPayload[]
}

export type RiderPerformanceRow = {
  courierId: string
  courierName: string
  courierEmail: string
  availability: string
  activeAssignments: number
  completedDeliveries: number
  completionRate: number
  proofRate: number
  averageCompletionMinutes: number | null
  totalDeliveryFees: number
  lastSeenAt: string | null
}

export async function getCourierOperationsSnapshot() {
  const [orders, dispatchItems, analyticsItems, couriers, assignments, riderTracking, proofs, timelines, routeSnapshots, exceptions, assignmentAudits, channelLogs] = await Promise.all([
    prisma.order.findMany({
      include: {
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
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
    prisma.orderItem.findMany({
      where: {
        status: { in: ['accepted', 'courier_on_the_way', 'completed', 'pending'] },
      },
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
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
      take: 50,
    }),
    prisma.orderItem.findMany({
      where: {
        status: { in: ['accepted', 'courier_on_the_way', 'completed', 'pending'] },
      },
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
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
    }),
    prisma.user.findMany({
      where: { role: 'courier' },
      select: {
        id: true,
        email: true,
        name: true,
        mobileNumber: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
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
            isActive: true,
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
        audience: DELIVERY_TIMELINE_AUDIENCE,
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
    prisma.notification.findMany({
      where: {
        audience: COURIER_ASSIGNMENT_AUDIT_AUDIENCE,
        orderItemId: { not: null },
      },
      select: {
        orderItemId: true,
        message: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({
      where: {
        audience: 'delivery_channel_log',
      },
    }),
  ])

  const activeTrips = dispatchItems.filter((item) => item.status === 'courier_on_the_way').length
  const dispatchQueue = dispatchItems.filter((item) => ['pending', 'accepted'].includes(item.status)).length
  const delivered = dispatchItems.filter((item) => item.status === 'completed').length
  const totalDeliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0)
  const activeCouriers = couriers.filter((courier) => courier.isActive).length

  const assignmentMap = new Map(
    (assignments as AssignmentRow[]).map((assignment) => [assignment.orderItemId, assignment])
  )

  const trackingMap = new Map<string, RiderTrackingPayload>()
  for (const tracking of riderTracking) {
    const payload = parseNotificationPayload<RiderTrackingPayload>(tracking.message)
    if (!payload || !tracking.recipientId || trackingMap.has(tracking.recipientId)) continue
    trackingMap.set(tracking.recipientId, payload)
  }

  const proofMap = new Map<string, DeliveryProofPayload>()
  for (const proof of proofs) {
    const payload = parseNotificationPayload<DeliveryProofPayload>(proof.message)
    if (!payload || !proof.orderItemId || proofMap.has(proof.orderItemId)) continue
    proofMap.set(proof.orderItemId, payload)
  }

  const timelineMap = new Map<string, DeliveryTimelinePayload[]>()
  const latestTimelineMap = new Map<string, DeliveryTimelinePayload>()
  for (const timeline of timelines) {
    const payload = parseNotificationPayload<DeliveryTimelinePayload>(timeline.message)
    if (!payload || !timeline.orderItemId) continue
    const current = timelineMap.get(timeline.orderItemId) || []
    current.push(payload)
    timelineMap.set(timeline.orderItemId, current)
    if (!latestTimelineMap.has(timeline.orderItemId)) {
      latestTimelineMap.set(timeline.orderItemId, payload)
    }
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
  const assignmentAuditMap = new Map<string, CourierAssignmentAuditPayload>()
  for (const audit of assignmentAudits) {
    const payload = parseNotificationPayload<CourierAssignmentAuditPayload>(audit.message)
    if (!payload || !audit.orderItemId || assignmentAuditMap.has(audit.orderItemId)) continue
    assignmentAuditMap.set(audit.orderItemId, payload)
  }

  const dispatchRows: DispatchRow[] = dispatchItems.map((item) => {
    const assignment = assignmentMap.get(item.id)
    const tracking = assignment?.recipientId ? trackingMap.get(assignment.recipientId) || null : null
    const timeline = timelineMap.get(item.id) || []
    const routeReplay = routeSnapshotMap.get(item.id) || []
    const lateDelivery = computeLateDeliveryState({
      status: item.status,
      estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
      createdAt: item.order.createdAt,
      timeline,
    })
    const routeHealth = computeDeliveryRouteHealth({
      status: item.status,
      estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
      routeReplay,
      lateDelivery,
    })
    const customerName =
      [item.order.user.firstName, item.order.user.lastName].filter(Boolean).join(' ') ||
      item.order.user.name ||
      item.order.user.email

    const recommendedCourier = couriers
      .map((courier) => ({
        id: courier.id,
        name: courier.name || courier.email,
        tracking: trackingMap.get(courier.id) || null,
        activeAssignments: dispatchItems.filter(
          (dispatchItem) =>
            assignmentMap.get(dispatchItem.id)?.recipientId === courier.id &&
            dispatchItem.status !== 'completed'
        ).length,
      }))
      .filter((courier) => courier.tracking?.availability === 'available')
      .sort((left, right) => left.activeAssignments - right.activeAssignments)[0]

    return {
      id: item.id,
      orderId: item.order.id,
      vendorName: item.vendor?.vendorName || 'Admin Store',
      productName: item.product.name,
      estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
      status: item.status,
      assignedCourierId: assignment?.recipientId || null,
      assignedCourierName: assignment?.recipient ? assignment.recipient.name || assignment.recipient.email : null,
      assignedCourierAvailability: tracking?.availability || null,
      assignedCourierLastSeenAt: tracking?.lastSeenAt || null,
      assignedCourierLatitude: tracking?.latitude || null,
      assignedCourierLongitude: tracking?.longitude || null,
      latestEventLabel: latestTimelineMap.get(item.id)?.label || null,
      proofRecipientName: proofMap.get(item.id)?.recipientName || null,
      deliveryFee: item.deliveryFee,
      deliveryAddress: item.order.deliveryAddress || null,
      customerName,
      routeReplay,
      lateDelivery,
      routeHealth,
      exceptions: exceptionMap.get(item.id) || [],
      recommendedCourierId: recommendedCourier?.id || null,
      recommendedCourierName: recommendedCourier?.name || null,
      latestAssignmentAudit: assignmentAuditMap.get(item.id) || null,
    }
  })

  const liveCouriers: LiveCourierRow[] = couriers.map((courier) => {
    const trackedItems = dispatchRows.filter((item) => item.assignedCourierId === courier.id)
    const activeTrackedItem =
      trackedItems.find((item) => item.id === trackingMap.get(courier.id)?.activeOrderItemId) ||
      trackedItems.find((item) => item.status === 'courier_on_the_way') ||
      trackedItems[0] ||
      null

    return {
      ...courier,
      tracking: trackingMap.get(courier.id) || null,
      activeAssignments: trackedItems.filter((item) => item.status !== 'completed').length,
      completedDeliveries: trackedItems.filter((item) => item.status === 'completed').length,
      totalDeliveryFees: trackedItems.reduce((sum, item) => sum + item.deliveryFee, 0),
      latestDestinations: trackedItems
        .map((item) => item.deliveryAddress)
        .filter((value): value is string => Boolean(value))
        .slice(0, 3),
      activeRouteReplay: activeTrackedItem?.routeReplay || [],
    }
  })

  const performanceRows: RiderPerformanceRow[] = couriers.map((courier) => {
    const items = analyticsItems.filter((item) => assignmentMap.get(item.id)?.recipientId === courier.id)
    const completedItems = items.filter((item) => item.status === 'completed')
    const proofCount = completedItems.filter((item) => proofMap.has(item.id)).length
    const completionMinutes = completedItems
      .map((item) => {
        const itemTimeline = timelineMap.get(item.id) || []
        const assignedAt = itemTimeline.find((event) => event.type === 'assigned')?.createdAt
        const completedAt = itemTimeline.find((event) => event.type === 'completed')?.createdAt
        if (!assignedAt || !completedAt) return null
        const duration = (new Date(completedAt).getTime() - new Date(assignedAt).getTime()) / 60000
        return Number.isFinite(duration) && duration >= 0 ? duration : null
      })
      .filter((value): value is number => typeof value === 'number')

    return {
      courierId: courier.id,
      courierName: courier.name || courier.email,
      courierEmail: courier.email,
      availability: trackingMap.get(courier.id)?.availability || 'offline',
      activeAssignments: items.filter((item) => item.status !== 'completed').length,
      completedDeliveries: completedItems.length,
      completionRate: items.length ? Math.round((completedItems.length / items.length) * 100) : 0,
      proofRate: completedItems.length ? Math.round((proofCount / completedItems.length) * 100) : 0,
      averageCompletionMinutes: completionMinutes.length
        ? Math.round(completionMinutes.reduce((sum, value) => sum + value, 0) / completionMinutes.length)
        : null,
      totalDeliveryFees: items.reduce((sum, item) => sum + item.deliveryFee, 0),
      lastSeenAt: trackingMap.get(courier.id)?.lastSeenAt || null,
    }
  })

  return {
    orders,
    couriers,
    dispatchRows,
    liveCouriers,
    performanceRows,
    metrics: {
      activeTrips,
      dispatchQueue,
      delivered,
      totalDeliveryFees,
      activeCouriers,
      courierAccounts: couriers.length,
      assignedDeliveries: dispatchRows.filter((item) => item.assignedCourierId).length,
      overdueDeliveries: dispatchRows.filter((item) => item.lateDelivery.isLate).length,
      openExceptions: dispatchRows.filter((item) =>
        (item.exceptions || []).some((exception) => exception.resolutionStatus !== 'resolved')
      ).length,
      averageCourierUtilization: couriers.length
        ? Math.round(
            (liveCouriers.reduce((sum, courier) => sum + courier.activeAssignments, 0) / couriers.length) * 10
          ) / 10
        : 0,
      outboundUpdateLogs: channelLogs,
    },
  }
}
