import { NextResponse } from 'next/server'
import { COURIER_OFFER_AUDIENCE } from '@/lib/courier-dispatch'
import { RIDER_TRACKING_AUDIENCE, parseNotificationPayload, type RiderTrackingPayload } from '@/lib/courier-tracking'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-notifications'
import { resolveMobileRequestUser } from '@/lib/mobile-session'

type DirectRequestPayload = {
  type: 'mobile_direct_rider_request'
  pickupAddress: string
  pickupLatitude: number | null
  pickupLongitude: number | null
  dropoffAddress: string
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  commodity: string
  estimatedWeightKg: number
  comment: string | null
  paymentMethod: 'cash' | 'mobile'
  paymentCompleted?: boolean
  createdAt: string
  customer: {
    id: string
    email: string
    mobileNumber: string | null
    name: string | null
  }
}

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

async function dispatchNearestCouriersForRequest(args: { requestId: string; payload: DirectRequestPayload }) {
  if (typeof args.payload.pickupLatitude !== 'number' || typeof args.payload.pickupLongitude !== 'number') {
    return 0
  }

  const [trackingNotifications, couriers, existingOffers] = await Promise.all([
    prisma.notification.findMany({
      where: { audience: RIDER_TRACKING_AUDIENCE, recipientId: { not: null } },
      select: { recipientId: true, message: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'courier', isActive: true },
      select: { id: true, name: true, email: true },
    }),
    prisma.notification.findMany({
      where: { audience: COURIER_OFFER_AUDIENCE },
      select: { metadata: true, recipientId: true, deliveryStatus: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ])

  const latestTracking = new Map<string, RiderTrackingPayload>()
  for (const notification of trackingNotifications) {
    const payload = parseNotificationPayload<RiderTrackingPayload>(notification.message)
    if (!payload || !notification.recipientId || latestTracking.has(notification.recipientId)) continue
    latestTracking.set(notification.recipientId, payload)
  }

  const offeredCourierIds = new Set<string>()
  for (const offer of existingOffers) {
    const metadata = parseNotificationPayload<{ requestId?: string }>(offer.metadata)
    if (metadata?.requestId === args.requestId && offer.recipientId && offer.deliveryStatus !== 'closed') {
      offeredCourierIds.add(offer.recipientId)
    }
  }

  const nearest = couriers
    .map((courier) => {
      const tracking = latestTracking.get(courier.id)
      if (!tracking || tracking.availability !== 'available') return null
      if (typeof tracking.latitude !== 'number' || typeof tracking.longitude !== 'number') return null
      if (offeredCourierIds.has(courier.id)) return null
      return {
        courier,
        distance: distanceKm(
          tracking.latitude,
          tracking.longitude,
          args.payload.pickupLatitude as number,
          args.payload.pickupLongitude as number
        ),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)

  if (!nearest.length) return 0

  await prisma.notification.createMany({
    data: nearest.map((item) => ({
      recipientId: item.courier.id,
      audience: COURIER_OFFER_AUDIENCE,
      channel: 'in_app',
      title: 'Direct rider request nearby',
      message: `Pickup ${args.payload.commodity} at ${args.payload.pickupAddress}.`,
      deliveryStatus: 'pending',
      metadata: JSON.stringify({
        source: 'mobile_customer_request',
        requestId: args.requestId,
        pickupAddress: args.payload.pickupAddress,
        pickupLatitude: args.payload.pickupLatitude,
        pickupLongitude: args.payload.pickupLongitude,
        dropoffAddress: args.payload.dropoffAddress,
        dropoffLatitude: args.payload.dropoffLatitude,
        dropoffLongitude: args.payload.dropoffLongitude,
        commodity: args.payload.commodity,
        estimatedWeightKg: args.payload.estimatedWeightKg,
        paymentMethod: args.payload.paymentMethod,
        courierDistanceKm: Number(item.distance.toFixed(2)),
      }),
    })),
  })

  await Promise.all(
    nearest.map((item) =>
      sendPushToUser(item.courier.id, {
        title: 'New nearby rider request',
        body: `Pickup ${args.payload.commodity} at ${args.payload.pickupAddress}.`,
        url: '/mobile?role=driver&view=orders',
        tag: `driver-offer-${args.requestId}-${item.courier.id}`,
        sound: 'default',
        priority: 'high',
        channelId: 'orders',
        data: {
          event: 'courier_offer',
          requestId: args.requestId,
        },
      })
    )
  )

  return nearest.length
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveMobileRequestUser(request, 'customer')
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const { id } = await params
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: resolved.user.id },
      select: { id: true, message: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    }

    const payload = parseNotificationPayload<DirectRequestPayload>(ticket.message)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    const nextPayload: DirectRequestPayload = {
      ...payload,
      paymentCompleted: true,
    }

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { message: JSON.stringify(nextPayload) },
    })

    const offered = await dispatchNearestCouriersForRequest({
      requestId: ticket.id,
      payload: nextPayload,
    })

    return NextResponse.json({ requestId: ticket.id, offered, status: 'searching' })
  } catch (error) {
    console.error('Mobile direct request checkout complete failed:', error)
    return NextResponse.json({ error: 'Failed to continue rider dispatch.' }, { status: 500 })
  }
}
