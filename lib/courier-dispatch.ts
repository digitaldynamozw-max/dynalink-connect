import { prisma } from '@/lib/prisma'
import { RIDER_TRACKING_AUDIENCE, createDeliveryCustomerUpdate, createDeliveryTimelineEvent, parseNotificationPayload, type RiderTrackingPayload } from '@/lib/courier-tracking'
import { createStatusChangeNotifications, syncOrderStatus } from '@/lib/notifications'
import { sendPushToUser } from '@/lib/push-notifications'

export const COURIER_OFFER_AUDIENCE = 'courier_offer'

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(toLat - fromLat)
  const dLng = toRadians(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDispatchTriggerAt(acceptedAt: Date, preparationMinutes: number) {
  // Ring only when the vendor-side prep window has fully elapsed.
  return new Date(acceptedAt.getTime() + Math.max(preparationMinutes, 0) * 60000)
}

export async function dispatchDueCourierOffers() {
  const now = new Date()
  const acceptedItems = await prisma.orderItem.findMany({
    where: {
      status: 'accepted',
      vendor: {
        latitude: { not: null },
        longitude: { not: null },
      },
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          deliveryAddress: true,
          requestedDeliveryAt: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorName: true,
          storeAddress: true,
          storeCity: true,
          storeState: true,
          latitude: true,
          longitude: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { order: { createdAt: 'asc' } },
  })

  const dueItems = acceptedItems.filter(
    (item) =>
      getDispatchTriggerAt(item.updatedAt, item.preparationMinutes).getTime() <= now.getTime()
  )
  if (!dueItems.length) {
    return { scanned: acceptedItems.length, offered: 0 }
  }

  const [trackingNotifications, existingOffers, assignments, couriers] = await Promise.all([
    prisma.notification.findMany({
      where: { audience: RIDER_TRACKING_AUDIENCE, recipientId: { not: null } },
      select: { recipientId: true, message: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { audience: COURIER_OFFER_AUDIENCE, orderItemId: { in: dueItems.map((item) => item.id) } },
      select: { orderItemId: true, createdAt: true, deliveryStatus: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { audience: 'courier_assignment', orderItemId: { in: dueItems.map((item) => item.id) } },
      select: { orderItemId: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'courier', isActive: true },
      select: { id: true, name: true, email: true },
    }),
  ])

  const latestTracking = new Map<string, RiderTrackingPayload>()
  for (const notification of trackingNotifications) {
    const payload = parseNotificationPayload<RiderTrackingPayload>(notification.message)
    if (!payload || !notification.recipientId || latestTracking.has(notification.recipientId)) continue
    latestTracking.set(notification.recipientId, payload)
  }

  const assignedItemIds = new Set(assignments.map((assignment) => assignment.orderItemId).filter(Boolean))
  const freshOfferItemIds = new Set(
    existingOffers
      .filter((offer) => offer.orderItemId && offer.deliveryStatus !== 'accepted' && now.getTime() - new Date(offer.createdAt).getTime() < 5 * 60000)
      .map((offer) => offer.orderItemId as string)
  )

  let offered = 0

  for (const item of dueItems) {
    const vendor = item.vendor
    if (!vendor || vendor.latitude == null || vendor.longitude == null) continue
    const vendorLatitude = vendor.latitude
    const vendorLongitude = vendor.longitude
    if (assignedItemIds.has(item.id) || freshOfferItemIds.has(item.id)) continue

    const closestCourier = couriers
      .map((courier) => {
        const tracking = latestTracking.get(courier.id)
        if (!tracking) return null
        if (tracking.availability !== 'available') return null
        if (typeof tracking.latitude !== 'number' || typeof tracking.longitude !== 'number') return null

        return {
          ...courier,
          tracking,
          distanceKm: distanceKm(tracking.latitude, tracking.longitude, vendorLatitude, vendorLongitude),
        }
      })
      .filter((courier): courier is NonNullable<typeof courier> => Boolean(courier))
      .sort((left, right) => left.distanceKm - right.distanceKm)[0]

    if (!closestCourier) continue

    const payload = {
      orderItemId: item.id,
      orderId: item.order.id,
      orderNumber: item.order.orderNumber,
      productName: item.product.name,
      vendorName: vendor.vendorName || 'Vendor',
      vendorAddress: [vendor.storeAddress, vendor.storeCity, vendor.storeState].filter(Boolean).join(', '),
      customerAddress: item.order.deliveryAddress || 'No delivery address saved',
      vendorLatitude,
      vendorLongitude,
      courierDistanceKm: Number(closestCourier.distanceKm.toFixed(2)),
      triggeredAt: now.toISOString(),
    }

    await prisma.notification.create({
      data: {
        recipientId: closestCourier.id,
        audience: COURIER_OFFER_AUDIENCE,
        channel: 'in_app',
        orderId: item.order.id,
        orderItemId: item.id,
        title: 'Nearby pickup ready soon',
        message: `${item.product.name} at ${payload.vendorName} is ready for courier acceptance.`,
        deliveryStatus: 'pending',
        metadata: JSON.stringify(payload),
      },
    })

    await sendPushToUser(closestCourier.id, {
      title: 'Order ready for pickup',
      body: `${item.product.name} at ${payload.vendorName} is ready for collection.`,
      url: '/mobile?role=driver&view=orders',
      tag: `driver-order-offer-${item.order.id}-${item.id}`,
      sound: 'default',
      priority: 'high',
      channelId: 'orders',
      data: {
        event: 'courier_offer',
        orderId: item.order.id,
        orderItemId: item.id,
      },
    })

    offered += 1
  }

  return { scanned: acceptedItems.length, offered }
}

export async function acceptCourierOffer(args: {
  offerId: string
  courierId: string
  courierName: string
}) {
  const offer = await prisma.notification.findFirst({
    where: {
      id: args.offerId,
      audience: COURIER_OFFER_AUDIENCE,
      recipientId: args.courierId,
    },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      metadata: true,
      deliveryStatus: true,
    },
  })

  if (!offer?.orderId || !offer.orderItemId) {
    throw new Error('Offer not found')
  }

  const orderId = offer.orderId
  const orderItemId = offer.orderItemId

  if (offer.deliveryStatus === 'accepted') {
    throw new Error('Offer already accepted')
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        select: { id: true, userId: true },
      },
      product: { select: { name: true } },
    },
  })

  if (!item || item.status !== 'accepted') {
    throw new Error('This order is no longer waiting for courier acceptance')
  }

  const existingAssignment = await prisma.notification.findFirst({
    where: { audience: 'courier_assignment', orderItemId },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  })

  if (existingAssignment) {
    throw new Error('This order already has a courier')
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.update({
      where: { id: offer.id },
      data: { deliveryStatus: 'accepted', sentAt: new Date() },
    })

    await tx.notification.updateMany({
      where: {
        audience: COURIER_OFFER_AUDIENCE,
        orderItemId,
        id: { not: offer.id },
      },
      data: { deliveryStatus: 'closed', failedAt: new Date() },
    })

    await tx.notification.create({
      data: {
        recipientId: args.courierId,
        audience: 'courier_assignment',
        orderId,
        orderItemId,
        title: 'Delivery assigned',
        message: `You accepted delivery for ${item.product.name}.`,
      },
    })

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'courier_assigned' },
    })
  })

  await createStatusChangeNotifications([orderItemId], 'courier_assigned', 'courier', { [orderItemId]: 'accepted' })
  await syncOrderStatus(orderId)
  await createDeliveryTimelineEvent({
    orderId,
    orderItemId,
    type: 'assigned',
    label: 'Courier accepted pickup',
    note: `${args.courierName} accepted the courier offer and is heading to the vendor.`,
    actorRole: 'courier',
    actorName: args.courierName,
    courierId: args.courierId,
    courierName: args.courierName,
  })
  await createDeliveryCustomerUpdate({
    recipientId: item.order.userId,
    orderId,
    orderItemId,
    type: 'rider_assigned',
    title: 'Courier accepted your order',
    message: `${args.courierName} accepted the pickup and is heading to the vendor.`,
  })

  return { orderId, orderItemId }
}

export async function createAdminCourierOffer(args: {
  orderItemId: string
  courierId: string
  actorName: string
}) {
  const now = new Date()

  const [orderItem, courier, latestTracking, existingAssignment, existingFreshOffer] = await Promise.all([
    prisma.orderItem.findUnique({
      where: { id: args.orderItemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryAddress: true,
            requestedDeliveryAt: true,
          },
        },
        vendor: {
          select: {
            vendorName: true,
            storeAddress: true,
            storeCity: true,
            storeState: true,
            latitude: true,
            longitude: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.user.findFirst({
      where: {
        id: args.courierId,
        role: 'courier',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),
    prisma.notification.findFirst({
      where: {
        audience: RIDER_TRACKING_AUDIENCE,
        recipientId: args.courierId,
      },
      select: {
        message: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findFirst({
      where: {
        audience: 'courier_assignment',
        orderItemId: args.orderItemId,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findFirst({
      where: {
        audience: COURIER_OFFER_AUDIENCE,
        orderItemId: args.orderItemId,
        deliveryStatus: { not: 'accepted' },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!orderItem) {
    throw new Error('Order item not found')
  }

  if (!courier) {
    throw new Error('Courier not found')
  }

  if (!['accepted', 'courier_assigned', 'arrived_at_vendor'].includes(orderItem.status)) {
    throw new Error('This order is not in a dispatch-offer state')
  }

  if (existingAssignment) {
    throw new Error('This order already has a courier assignment')
  }

  if (
    existingFreshOffer &&
    now.getTime() - new Date(existingFreshOffer.createdAt).getTime() < 5 * 60000
  ) {
    throw new Error('A recent courier offer already exists for this order')
  }

  const vendor = orderItem.vendor
  if (!vendor || vendor.latitude == null || vendor.longitude == null) {
    throw new Error('Vendor location is required before sending a courier offer')
  }

  const tracking = latestTracking ? parseNotificationPayload<RiderTrackingPayload>(latestTracking.message) : null
  if (!tracking || tracking.availability !== 'available') {
    throw new Error('This rider is not currently available for new offers')
  }

  const payload = {
    orderItemId: orderItem.id,
    orderId: orderItem.order.id,
    orderNumber: orderItem.order.orderNumber,
    productName: orderItem.product.name,
    vendorName: vendor.vendorName || 'Vendor',
    vendorAddress: [vendor.storeAddress, vendor.storeCity, vendor.storeState].filter(Boolean).join(', '),
    customerAddress: orderItem.order.deliveryAddress || 'No delivery address saved',
    vendorLatitude: vendor.latitude,
    vendorLongitude: vendor.longitude,
    triggeredAt: now.toISOString(),
    triggeredBy: args.actorName,
    manualDispatch: true,
  }

  const offer = await prisma.notification.create({
    data: {
      recipientId: courier.id,
      audience: COURIER_OFFER_AUDIENCE,
      channel: 'in_app',
      orderId: orderItem.order.id,
      orderItemId: orderItem.id,
      title: 'Dispatch offer ready now',
      message: `${orderItem.product.name} at ${payload.vendorName} is ready for courier acceptance.`,
      deliveryStatus: 'pending',
      metadata: JSON.stringify(payload),
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  await createDeliveryTimelineEvent({
    orderId: orderItem.order.id,
    orderItemId: orderItem.id,
    type: 'assigned',
    label: 'Courier offer sent',
    note: `${args.actorName} offered this dispatch to ${courier.name || courier.email}.`,
    actorRole: 'admin',
    actorName: args.actorName,
    courierId: courier.id,
    courierName: courier.name || courier.email,
  })

  return {
    offerId: offer.id,
    createdAt: offer.createdAt.toISOString(),
    courierId: courier.id,
    courierName: courier.name || courier.email,
  }
}

export async function closeAdminCourierOffer(args: {
  orderItemId: string
  actorName: string
}) {
  const pendingOffer = await prisma.notification.findFirst({
    where: {
      audience: COURIER_OFFER_AUDIENCE,
      orderItemId: args.orderItemId,
      deliveryStatus: 'pending',
    },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      recipient: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!pendingOffer?.orderId || !pendingOffer.orderItemId) {
    throw new Error('No pending courier offer found for this order')
  }

  await prisma.notification.update({
    where: { id: pendingOffer.id },
    data: {
      deliveryStatus: 'closed',
      failedAt: new Date(),
    },
  })

  await createDeliveryTimelineEvent({
    orderId: pendingOffer.orderId,
    orderItemId: pendingOffer.orderItemId,
    type: 'assigned',
    label: 'Courier offer closed',
    note: `${args.actorName} closed the pending offer for ${pendingOffer.recipient?.name || pendingOffer.recipient?.email || 'the rider'}.`,
    actorRole: 'admin',
    actorName: args.actorName,
  })

  return {
    orderId: pendingOffer.orderId,
    orderItemId: pendingOffer.orderItemId,
    courierName: pendingOffer.recipient?.name || pendingOffer.recipient?.email || null,
  }
}
