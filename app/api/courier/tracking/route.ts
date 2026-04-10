import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  appendDeliveryRouteSnapshot,
  syncLateDeliveryAlertsForOrderItems,
  upsertRiderTracking,
  type RiderAvailability,
} from '@/lib/courier-tracking'

const AVAILABILITY_VALUES: RiderAvailability[] = ['offline', 'available', 'busy', 'on_delivery', 'break']

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'courier') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      availability?: string
      latitude?: number
      longitude?: number
      accuracy?: number
      activeOrderItemId?: string | null
    }

    const availability = AVAILABILITY_VALUES.includes(body.availability as RiderAvailability)
      ? (body.availability as RiderAvailability)
      : 'available'

    const payload = await upsertRiderTracking({
      courierId: session.user.id,
      availability,
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      accuracy: typeof body.accuracy === 'number' ? body.accuracy : null,
      activeOrderItemId:
        typeof body.activeOrderItemId === 'string' && body.activeOrderItemId.trim().length > 0
          ? body.activeOrderItemId
          : null,
    })

    if (payload.activeOrderItemId) {
      const [courier, orderItem] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        }),
        prisma.orderItem.findUnique({
          where: { id: payload.activeOrderItemId },
          select: { id: true, orderId: true },
        }),
      ])

      if (orderItem) {
        await appendDeliveryRouteSnapshot({
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          courierId: session.user.id,
          courierName: courier?.name || courier?.email || 'Courier',
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
        })

        await syncLateDeliveryAlertsForOrderItems([orderItem.id])
      }
    }

    return NextResponse.json({ success: true, tracking: payload })
  } catch (error) {
    console.error('Courier tracking ping error:', error)
    return NextResponse.json({ error: 'Failed to update rider tracking' }, { status: 500 })
  }
}
