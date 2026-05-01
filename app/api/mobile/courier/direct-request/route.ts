import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-notifications'
import { COURIER_OFFER_AUDIENCE } from '@/lib/courier-dispatch'
import { RIDER_TRACKING_AUDIENCE, parseNotificationPayload, type RiderTrackingPayload } from '@/lib/courier-tracking'
import { resolveMobileRequestUser } from '@/lib/mobile-session'

type DirectRequestBody = {
  pickupAddress?: string
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropoffAddress?: string
  dropoffLatitude?: number | null
  dropoffLongitude?: number | null
  commodity?: string
  estimatedWeightKg?: number
  comment?: string | null
  paymentMethod?: 'cash' | 'mobile'
}

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
  paymentCompleted: boolean
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

async function dispatchNearestCouriersForRequest(args: {
  requestId: string
  payload: DirectRequestPayload
  maxOffers?: number
}) {
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
      where: {
        audience: COURIER_OFFER_AUDIENCE,
      },
      select: { metadata: true, deliveryStatus: true, recipientId: true },
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

  const alreadyOfferedCourierIds = new Set<string>()
  for (const offer of existingOffers) {
    const metadata = parseNotificationPayload<{ requestId?: string }>(offer.metadata)
    if (metadata?.requestId === args.requestId && offer.recipientId && offer.deliveryStatus !== 'closed') {
      alreadyOfferedCourierIds.add(offer.recipientId)
    }
  }

  const candidates = couriers
    .map((courier) => {
      const tracking = latestTracking.get(courier.id)
      if (!tracking) return null
      if (tracking.availability !== 'available') return null
      if (typeof tracking.latitude !== 'number' || typeof tracking.longitude !== 'number') return null
      if (alreadyOfferedCourierIds.has(courier.id)) return null

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
    .slice(0, args.maxOffers || 3)

  if (!candidates.length) return 0

  await prisma.notification.createMany({
    data: candidates.map((item) => ({
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
    candidates.map((item) =>
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

  return candidates.length
}

export async function POST(request: Request) {
  try {
    const resolved = await resolveMobileRequestUser(request, 'customer')
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }
    const body = (await request.json()) as DirectRequestBody

    const pickupAddress = body.pickupAddress?.trim() || ''
    const pickupLatitude = typeof body.pickupLatitude === 'number' ? body.pickupLatitude : null
    const pickupLongitude = typeof body.pickupLongitude === 'number' ? body.pickupLongitude : null
    const dropoffAddress = body.dropoffAddress?.trim() || ''
    const dropoffLatitude = typeof body.dropoffLatitude === 'number' ? body.dropoffLatitude : null
    const dropoffLongitude = typeof body.dropoffLongitude === 'number' ? body.dropoffLongitude : null
    const commodity = body.commodity?.trim() || ''
    const estimatedWeightKg = Number(body.estimatedWeightKg || 0)
    const comment = body.comment?.trim() || null
    const paymentMethod = body.paymentMethod === 'mobile' ? 'mobile' : 'cash'

    if (pickupAddress.length < 4 || dropoffAddress.length < 4) {
      return NextResponse.json({ error: 'Pickup and drop-off addresses are required.' }, { status: 400 })
    }

    if (commodity.length < 2) {
      return NextResponse.json({ error: 'Commodity is required.' }, { status: 400 })
    }

    if (!Number.isFinite(estimatedWeightKg) || estimatedWeightKg <= 0) {
      return NextResponse.json({ error: 'Estimated weight must be greater than 0.' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: resolved.user.id,
        subject: `Direct rider request: ${pickupAddress.slice(0, 40)} -> ${dropoffAddress.slice(0, 40)}`,
        message: JSON.stringify({
          type: 'mobile_direct_rider_request',
          pickupAddress,
          pickupLatitude,
          pickupLongitude,
          dropoffAddress,
          dropoffLatitude,
          dropoffLongitude,
          commodity,
          estimatedWeightKg,
          comment,
          paymentMethod,
          paymentCompleted: paymentMethod === 'cash',
          createdAt: new Date().toISOString(),
          customer: {
            id: resolved.user.id,
            email: resolved.user.email,
            mobileNumber: resolved.user.mobileNumber || null,
            name: resolved.user.name || null,
          },
        }),
        priority: 'normal',
      },
    })

    await prisma.notification.create({
      data: {
        audience: 'courier',
        channel: 'in_app',
        title: 'New direct rider request',
        message: `Pickup: ${pickupAddress}. Drop-off: ${dropoffAddress}. Commodity: ${commodity}.`,
        metadata: JSON.stringify({
          requestId: ticket.id,
          source: 'mobile_customer_request',
          paymentMethod,
        }),
      },
    })

    if (paymentMethod === 'mobile') {
      return NextResponse.json({
        requestId: ticket.id,
        requiresCheckout: true,
        checkoutMessage: 'Proceed to mobile payment checkout, then continue to request courier dispatch.',
      })
    }

    const directPayload = parseNotificationPayload<DirectRequestPayload>(ticket.message)
    if (directPayload) {
      await dispatchNearestCouriersForRequest({
        requestId: ticket.id,
        payload: directPayload,
      })
    }

    return NextResponse.json({
      requestId: ticket.id,
      requiresCheckout: false,
    })
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('unauthorized')) {
      return NextResponse.json({ error: 'Sign in with a customer account to request a rider.' }, { status: 401 })
    }
    console.error('Mobile direct rider request failed:', error)
    return NextResponse.json({ error: 'Failed to submit rider request.' }, { status: 500 })
  }
}
