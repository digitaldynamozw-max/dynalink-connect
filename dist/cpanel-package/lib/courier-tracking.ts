import { prisma } from '@/lib/prisma'

export const RIDER_TRACKING_AUDIENCE = 'rider_tracking'
export const DELIVERY_TIMELINE_AUDIENCE = 'delivery_timeline'
export const DELIVERY_PROOF_AUDIENCE = 'delivery_proof'
export const DELIVERY_ROUTE_SNAPSHOT_AUDIENCE = 'delivery_route_snapshot'
export const LATE_DELIVERY_AUDIENCE = 'late_delivery_alert'
export const DELIVERY_EXCEPTION_AUDIENCE = 'delivery_exception'
export const DELIVERY_CUSTOMER_UPDATE_AUDIENCE = 'delivery_customer_update'
export const DELIVERY_CHANNEL_LOG_AUDIENCE = 'delivery_channel_log'
export const COURIER_ASSIGNMENT_AUDIT_AUDIENCE = 'courier_assignment_audit'

export type RiderAvailability = 'offline' | 'available' | 'busy' | 'on_delivery' | 'break'
export type DeliveryNotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp'

export type DeliveryNotificationPreferences = {
  riderAssigned: DeliveryNotificationChannel[]
  deliveryStarted: DeliveryNotificationChannel[]
  lateDelivery: DeliveryNotificationChannel[]
  deliveryCompleted: DeliveryNotificationChannel[]
  deliveryException: DeliveryNotificationChannel[]
}

export type RiderTrackingPayload = {
  availability: RiderAvailability
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  lastSeenAt: string
  activeOrderItemId: string | null
}

export type DeliveryTimelinePayload = {
  type: 'assigned' | 'started' | 'completed' | 'proof_submitted'
  label: string
  note: string
  actorRole: 'admin' | 'courier' | 'system'
  actorName: string
  createdAt: string
  courierId?: string | null
  courierName?: string | null
  recipientName?: string | null
}

export type DeliveryProofPayload = {
  recipientName: string
  signatureName: string | null
  note: string
  photoUrl: string | null
  checklist: {
    handedToRecipient: boolean
    packageSealed: boolean
    addressConfirmed: boolean
  }
  submittedAt: string
  courierId: string
  courierName: string
  latitude: number | null
  longitude: number | null
}

export type DeliveryRouteSnapshotPayload = {
  latitude: number
  longitude: number
  accuracy: number | null
  createdAt: string
  courierId: string
  courierName: string
}

export type LateDeliveryAlertPayload = {
  orderItemId: string
  orderId: string
  status: string
  estimatedDeliveryMinutes: number | null
  assignedAt: string | null
  startedAt: string | null
  expectedBy: string | null
  minutesLate: number
  triggeredAt: string
}

export type LateDeliveryState = {
  isLate: boolean
  estimatedDeliveryMinutes: number | null
  assignedAt: string | null
  startedAt: string | null
  expectedBy: string | null
  minutesLate: number
}

export type DeliveryExceptionType =
  | 'failed_attempt'
  | 'customer_unreachable'
  | 'wrong_address'
  | 'rescheduled'
  | 'returned_to_vendor'
  | 'admin_escalation'

export type DeliveryExceptionPayload = {
  type: DeliveryExceptionType
  note: string
  actorRole: 'admin' | 'courier' | 'system'
  actorName: string
  createdAt: string
  resolutionStatus: 'open' | 'resolved'
  nextAction: string | null
}

export type DeliveryCustomerUpdatePayload = {
  type:
    | 'rider_assigned'
    | 'delivery_started'
    | 'late_delivery'
    | 'delivery_completed'
    | 'delivery_exception'
  title: string
  message: string
  channel: DeliveryNotificationChannel
  requestedChannels: DeliveryNotificationChannel[]
  createdAt: string
  orderItemId: string
  orderId: string
}

export type DeliveryRouteHealth = {
  checkpointCount: number
  lastCheckpointAt: string | null
  idleMinutes: number
  isIdle: boolean
  movementStatus: 'not_started' | 'moving' | 'stopped' | 'completed'
  recalculatedEtaMinutes: number | null
}

export type DeliveryChannelLogPayload = {
  updateType: DeliveryCustomerUpdatePayload['type']
  orderId: string
  orderItemId: string
  channel: Exclude<DeliveryNotificationChannel, 'in_app'>
  title: string
  message: string
  status: 'logged'
  createdAt: string
}

export type CourierAssignmentAuditPayload = {
  orderId: string
  orderItemId: string
  previousCourierId: string | null
  previousCourierName: string | null
  nextCourierId: string | null
  nextCourierName: string | null
  actorId: string | null
  actorName: string
  createdAt: string
}

function stringifyPayload(payload: object) {
  return JSON.stringify(payload)
}

export function getDefaultDeliveryNotificationPreferences(): DeliveryNotificationPreferences {
  return {
    riderAssigned: ['in_app', 'email'],
    deliveryStarted: ['in_app'],
    lateDelivery: ['in_app', 'sms'],
    deliveryCompleted: ['in_app', 'email'],
    deliveryException: ['in_app', 'sms'],
  }
}

export function parseDeliveryNotificationPreferences(
  value: string | null | undefined
): DeliveryNotificationPreferences {
  const fallback = getDefaultDeliveryNotificationPreferences()
  const payload = parseNotificationPayload<Partial<DeliveryNotificationPreferences>>(value)
  if (!payload) {
    return fallback
  }

  const normalize = (
    channels: DeliveryNotificationChannel[] | undefined,
    fallbackChannels: DeliveryNotificationChannel[]
  ) => {
    const validChannels = (channels || []).filter((channel): channel is DeliveryNotificationChannel =>
      ['in_app', 'email', 'sms', 'whatsapp'].includes(channel)
    )
    return validChannels.length ? validChannels : fallbackChannels
  }

  return {
    riderAssigned: normalize(payload.riderAssigned, fallback.riderAssigned),
    deliveryStarted: normalize(payload.deliveryStarted, fallback.deliveryStarted),
    lateDelivery: normalize(payload.lateDelivery, fallback.lateDelivery),
    deliveryCompleted: normalize(payload.deliveryCompleted, fallback.deliveryCompleted),
    deliveryException: normalize(payload.deliveryException, fallback.deliveryException),
  }
}

export function parseNotificationPayload<T>(message: string | null | undefined): T | null {
  if (!message) {
    return null
  }

  try {
    return JSON.parse(message) as T
  } catch {
    return null
  }
}

function resolveTimelineEventTimestamp(
  timeline: DeliveryTimelinePayload[],
  type: DeliveryTimelinePayload['type']
) {
  const matching = timeline
    .filter((event) => event.type === type)
    .map((event) => new Date(event.createdAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)

  if (!matching.length) {
    return null
  }

  return new Date(matching[0]).toISOString()
}

export function computeLateDeliveryState(args: {
  status: string
  estimatedDeliveryMinutes?: number | null
  createdAt: string | Date
  timeline?: DeliveryTimelinePayload[]
  now?: Date
}): LateDeliveryState {
  const timeline = args.timeline || []
  const estimatedDeliveryMinutes =
    typeof args.estimatedDeliveryMinutes === 'number' ? args.estimatedDeliveryMinutes : null
  const assignedAt = resolveTimelineEventTimestamp(timeline, 'assigned')
  const startedAt = resolveTimelineEventTimestamp(timeline, 'started')
  const baseline = startedAt || assignedAt || new Date(args.createdAt).toISOString()

  if (!estimatedDeliveryMinutes || estimatedDeliveryMinutes <= 0 || args.status === 'completed') {
    return {
      isLate: false,
      estimatedDeliveryMinutes,
      assignedAt,
      startedAt,
      expectedBy: null,
      minutesLate: 0,
    }
  }

  const expectedByDate = new Date(new Date(baseline).getTime() + estimatedDeliveryMinutes * 60000)
  const now = args.now || new Date()
  const overdueMs = now.getTime() - expectedByDate.getTime()
  const minutesLate = overdueMs > 0 ? Math.ceil(overdueMs / 60000) : 0

  return {
    isLate: minutesLate > 0,
    estimatedDeliveryMinutes,
    assignedAt,
    startedAt,
    expectedBy: expectedByDate.toISOString(),
    minutesLate,
  }
}

export async function upsertRiderTracking(args: {
  courierId: string
  availability: RiderAvailability
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  activeOrderItemId?: string | null
}) {
  const payload: RiderTrackingPayload = {
    availability: args.availability,
    latitude: typeof args.latitude === 'number' ? args.latitude : null,
    longitude: typeof args.longitude === 'number' ? args.longitude : null,
    accuracy: typeof args.accuracy === 'number' ? args.accuracy : null,
    lastSeenAt: new Date().toISOString(),
    activeOrderItemId: args.activeOrderItemId || null,
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        audience: RIDER_TRACKING_AUDIENCE,
        recipientId: args.courierId,
      },
    })

    await tx.notification.create({
      data: {
        recipientId: args.courierId,
        audience: RIDER_TRACKING_AUDIENCE,
        title: `Rider ${payload.availability}`,
        message: stringifyPayload(payload),
        orderItemId: payload.activeOrderItemId,
      },
    })
  })

  return payload
}

export async function appendDeliveryRouteSnapshot(args: {
  orderId: string
  orderItemId: string
  courierId: string
  courierName: string
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
}) {
  if (typeof args.latitude !== 'number' || typeof args.longitude !== 'number') {
    return null
  }

  const payload: DeliveryRouteSnapshotPayload = {
    latitude: args.latitude,
    longitude: args.longitude,
    accuracy: typeof args.accuracy === 'number' ? args.accuracy : null,
    createdAt: new Date().toISOString(),
    courierId: args.courierId,
    courierName: args.courierName,
  }

  await prisma.notification.create({
    data: {
      recipientId: args.courierId,
      audience: DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      title: 'Route snapshot',
      message: stringifyPayload(payload),
    },
  })

  return payload
}

export async function createDeliveryTimelineEvent(args: {
  orderId: string
  orderItemId: string
  type: DeliveryTimelinePayload['type']
  label: string
  note: string
  actorRole: DeliveryTimelinePayload['actorRole']
  actorName: string
  courierId?: string | null
  courierName?: string | null
  recipientName?: string | null
}) {
  const payload: DeliveryTimelinePayload = {
    type: args.type,
    label: args.label,
    note: args.note,
    actorRole: args.actorRole,
    actorName: args.actorName,
    createdAt: new Date().toISOString(),
    courierId: args.courierId || null,
    courierName: args.courierName || null,
    recipientName: args.recipientName || null,
  }

  await prisma.notification.create({
    data: {
      audience: DELIVERY_TIMELINE_AUDIENCE,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      title: args.label,
      message: stringifyPayload(payload),
    },
  })

  return payload
}

export async function createDeliveryCustomerUpdate(args: {
  recipientId: string
  orderId: string
  orderItemId: string
  type: DeliveryCustomerUpdatePayload['type']
  title: string
  message: string
  requestedChannels?: DeliveryNotificationChannel[]
}) {
  const recipient = await prisma.user.findUnique({
    where: { id: args.recipientId },
    select: {
      notificationPreferencesJson: true,
      mobileNumber: true,
    },
  })
  const preferences = parseDeliveryNotificationPreferences(recipient?.notificationPreferencesJson)
  const preferenceKeyMap: Record<
    DeliveryCustomerUpdatePayload['type'],
    keyof DeliveryNotificationPreferences
  > = {
    rider_assigned: 'riderAssigned',
    delivery_started: 'deliveryStarted',
    late_delivery: 'lateDelivery',
    delivery_completed: 'deliveryCompleted',
    delivery_exception: 'deliveryException',
  }
  const preferredChannels = preferences[preferenceKeyMap[args.type]]
  const requestedChannels = args.requestedChannels?.length ? args.requestedChannels : preferredChannels
  const requestedChannelSet = [...new Set(requestedChannels.filter(Boolean))]
  const payload: DeliveryCustomerUpdatePayload = {
    type: args.type,
    title: args.title,
    message: args.message,
    channel: 'in_app',
    requestedChannels: requestedChannelSet,
    createdAt: new Date().toISOString(),
    orderId: args.orderId,
    orderItemId: args.orderItemId,
  }

  const notifications: Array<{
    recipientId: string
    audience: string
    channel: DeliveryNotificationChannel
    orderId: string
    orderItemId: string
    title: string
    message: string
    deliveryStatus: string
    sentAt?: Date
    metadata?: string
  }> = []

  if (requestedChannelSet.includes('in_app')) {
    notifications.push({
      recipientId: args.recipientId,
      audience: DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
      channel: 'in_app',
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      title: args.title,
      message: stringifyPayload(payload),
      deliveryStatus: 'sent',
      sentAt: new Date(),
    })
  }

  for (const channel of requestedChannelSet.filter(
    (value): value is Exclude<DeliveryNotificationChannel, 'in_app'> => value !== 'in_app'
  )) {
    const channelPayload: DeliveryChannelLogPayload = {
      updateType: args.type,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      channel,
      title: args.title,
      message: args.message,
      status: 'logged',
      createdAt: new Date().toISOString(),
    }

    notifications.push({
      recipientId: args.recipientId,
      audience: DELIVERY_CHANNEL_LOG_AUDIENCE,
      channel,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      title: args.title,
      message: stringifyPayload(channelPayload),
      deliveryStatus: 'logged',
      metadata: stringifyPayload({
        recipientHasMobileNumber: Boolean(recipient?.mobileNumber),
      }),
    })
  }

  if (notifications.length) {
    await prisma.notification.createMany({
      data: notifications,
    })
  }

  return payload
}

export async function upsertDeliveryProof(args: {
  orderId: string
  orderItemId: string
  courierId: string
  courierName: string
  recipientName?: string | null
  signatureName?: string | null
  note?: string | null
  photoUrl?: string | null
  checklist?: {
    handedToRecipient?: boolean
    packageSealed?: boolean
    addressConfirmed?: boolean
  } | null
  latitude?: number | null
  longitude?: number | null
}) {
  const payload: DeliveryProofPayload = {
    recipientName: args.recipientName?.trim() || 'Recipient confirmed',
    signatureName: args.signatureName?.trim() || null,
    note: args.note?.trim() || 'Delivery completed by rider.',
    photoUrl: args.photoUrl?.trim() || null,
    checklist: {
      handedToRecipient: Boolean(args.checklist?.handedToRecipient),
      packageSealed: Boolean(args.checklist?.packageSealed),
      addressConfirmed: Boolean(args.checklist?.addressConfirmed),
    },
    submittedAt: new Date().toISOString(),
    courierId: args.courierId,
    courierName: args.courierName,
    latitude: typeof args.latitude === 'number' ? args.latitude : null,
    longitude: typeof args.longitude === 'number' ? args.longitude : null,
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        audience: DELIVERY_PROOF_AUDIENCE,
        orderItemId: args.orderItemId,
      },
    })

    await tx.notification.create({
      data: {
        recipientId: args.courierId,
        audience: DELIVERY_PROOF_AUDIENCE,
        orderId: args.orderId,
        orderItemId: args.orderItemId,
        title: 'Proof of delivery submitted',
        message: stringifyPayload(payload),
        channel: 'in_app',
        deliveryStatus: 'sent',
        sentAt: new Date(),
      },
    })

    await tx.orderItem.update({
      where: { id: args.orderItemId },
      data: {
        proofPhotoDataUrl: payload.photoUrl,
        proofSignatureName: payload.signatureName,
        proofChecklistJson: stringifyPayload(payload.checklist),
        proofSubmittedAt: new Date(payload.submittedAt),
        proofAuditNote: payload.note,
      },
    })
  })

  return payload
}

export async function createCourierAssignmentAudit(args: {
  orderId: string
  orderItemId: string
  previousCourierId?: string | null
  previousCourierName?: string | null
  nextCourierId?: string | null
  nextCourierName?: string | null
  actorId?: string | null
  actorName: string
}) {
  const payload: CourierAssignmentAuditPayload = {
    orderId: args.orderId,
    orderItemId: args.orderItemId,
    previousCourierId: args.previousCourierId || null,
    previousCourierName: args.previousCourierName || null,
    nextCourierId: args.nextCourierId || null,
    nextCourierName: args.nextCourierName || null,
    actorId: args.actorId || null,
    actorName: args.actorName,
    createdAt: new Date().toISOString(),
  }

  await prisma.notification.create({
    data: {
      audience: COURIER_ASSIGNMENT_AUDIT_AUDIENCE,
      channel: 'in_app',
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      title: 'Courier assignment audit',
      message: stringifyPayload(payload),
      deliveryStatus: 'logged',
    },
  })

  return payload
}

export async function createDeliveryException(args: {
  orderId: string
  orderItemId: string
  type: DeliveryExceptionType
  note: string
  actorRole: 'admin' | 'courier' | 'system'
  actorName: string
  customerId?: string | null
  vendorId?: string | null
  courierId?: string | null
  nextAction?: string | null
}) {
  const payload: DeliveryExceptionPayload = {
    type: args.type,
    note: args.note.trim(),
    actorRole: args.actorRole,
    actorName: args.actorName,
    createdAt: new Date().toISOString(),
    resolutionStatus: 'open',
    nextAction: args.nextAction?.trim() || null,
  }

  const recipientIds = [...new Set([args.customerId || null, args.vendorId || null, args.courierId || null].filter(Boolean))]

  const notifications = recipientIds.map((recipientId) => ({
    recipientId: recipientId || null,
    audience: DELIVERY_EXCEPTION_AUDIENCE,
    orderId: args.orderId,
    orderItemId: args.orderItemId,
    title: `Delivery exception: ${args.type.replaceAll('_', ' ')}`,
    message: stringifyPayload(payload),
  }))

  notifications.push({
    recipientId: null,
    audience: DELIVERY_EXCEPTION_AUDIENCE,
    orderId: args.orderId,
    orderItemId: args.orderItemId,
    title: `Delivery exception: ${args.type.replaceAll('_', ' ')}`,
    message: stringifyPayload(payload),
  })

  await prisma.notification.createMany({
    data: notifications,
  })

  if (args.customerId && (args.type === 'admin_escalation' || args.type === 'wrong_address' || args.type === 'failed_attempt')) {
    await prisma.supportTicket.create({
      data: {
        userId: args.customerId,
        subject: `Delivery exception for order ${args.orderId.slice(0, 8)}`,
        message: `${payload.type.replaceAll('_', ' ')}: ${payload.note}`,
        status: 'open',
        priority: args.type === 'admin_escalation' ? 'high' : 'normal',
      },
    })
  }

  return payload
}

export function computeDeliveryRouteHealth(args: {
  status: string
  estimatedDeliveryMinutes?: number | null
  routeReplay?: DeliveryRouteSnapshotPayload[]
  lateDelivery?: LateDeliveryState
  now?: Date
}): DeliveryRouteHealth {
  const routeReplay = args.routeReplay || []
  const lastCheckpointAt = routeReplay.at(-1)?.createdAt || null
  const now = args.now || new Date()
  const idleMinutes = lastCheckpointAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(lastCheckpointAt).getTime()) / 60000))
    : 0

  let movementStatus: DeliveryRouteHealth['movementStatus'] = 'not_started'
  if (args.status === 'completed') {
    movementStatus = 'completed'
  } else if (routeReplay.length > 0) {
    movementStatus = idleMinutes >= 10 ? 'stopped' : 'moving'
  }

  const recalculatedEtaMinutes =
    args.status === 'completed'
      ? 0
      : args.lateDelivery?.isLate
        ? (args.estimatedDeliveryMinutes || 0) + args.lateDelivery.minutesLate
        : args.estimatedDeliveryMinutes || null

  return {
    checkpointCount: routeReplay.length,
    lastCheckpointAt,
    idleMinutes,
    isIdle: movementStatus === 'stopped',
    movementStatus,
    recalculatedEtaMinutes,
  }
}

export async function syncLateDeliveryAlertsForOrderItems(orderItemIds: string[]) {
  if (!orderItemIds.length) {
    return []
  }

  const uniqueOrderItemIds = [...new Set(orderItemIds)]
  const [items, timelines, assignments] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        id: { in: uniqueOrderItemIds },
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: {
        audience: DELIVERY_TIMELINE_AUDIENCE,
        orderItemId: { in: uniqueOrderItemIds },
      },
      select: {
        orderItemId: true,
        message: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: {
        audience: 'courier_assignment',
        orderItemId: { in: uniqueOrderItemIds },
      },
      select: {
        orderItemId: true,
        recipientId: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const timelineMap = new Map<string, DeliveryTimelinePayload[]>()
  for (const notification of timelines) {
    const payload = parseNotificationPayload<DeliveryTimelinePayload>(notification.message)
    if (!payload || !notification.orderItemId) continue
    const current = timelineMap.get(notification.orderItemId) || []
    current.push(payload)
    timelineMap.set(notification.orderItemId, current)
  }

  const assignmentMap = new Map<string, string | null>()
  for (const assignment of assignments) {
    if (!assignment.orderItemId || assignmentMap.has(assignment.orderItemId)) continue
    assignmentMap.set(assignment.orderItemId, assignment.recipientId || null)
  }

  await prisma.notification.deleteMany({
    where: {
      audience: LATE_DELIVERY_AUDIENCE,
      orderItemId: { in: uniqueOrderItemIds },
    },
  })

  const lateNotifications = items.flatMap((item) => {
    const lateState = computeLateDeliveryState({
      status: item.status,
      estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
      createdAt: item.order.createdAt,
      timeline: timelineMap.get(item.id) || [],
    })

    if (!lateState.isLate) {
      return []
    }

    const payload: LateDeliveryAlertPayload = {
      orderItemId: item.id,
      orderId: item.orderId,
      status: item.status,
      estimatedDeliveryMinutes: lateState.estimatedDeliveryMinutes,
      assignedAt: lateState.assignedAt,
      startedAt: lateState.startedAt,
      expectedBy: lateState.expectedBy,
      minutesLate: lateState.minutesLate,
      triggeredAt: new Date().toISOString(),
    }

    const title = `Late delivery alert for order ${item.orderId.slice(0, 8)}`

    return [
      {
        recipientId: null,
        audience: LATE_DELIVERY_AUDIENCE,
        title,
        message: stringifyPayload(payload),
        orderId: item.orderId,
        orderItemId: item.id,
        read: false,
      },
      {
        recipientId: item.order.userId,
        audience: LATE_DELIVERY_AUDIENCE,
        title,
        message: stringifyPayload(payload),
        orderId: item.orderId,
        orderItemId: item.id,
        read: false,
      },
      ...(item.vendorId
        ? [
            {
              recipientId: item.vendorId,
              audience: LATE_DELIVERY_AUDIENCE,
              title,
              message: stringifyPayload(payload),
              orderId: item.orderId,
              orderItemId: item.id,
              read: false,
            },
          ]
        : []),
      ...(assignmentMap.get(item.id)
        ? [
            {
              recipientId: assignmentMap.get(item.id),
              audience: LATE_DELIVERY_AUDIENCE,
              title,
              message: stringifyPayload(payload),
              orderId: item.orderId,
              orderItemId: item.id,
              read: false,
            },
          ]
        : []),
    ]
  })

  if (lateNotifications.length) {
    await prisma.notification.createMany({
      data: lateNotifications,
    })
  }

  return lateNotifications
}
