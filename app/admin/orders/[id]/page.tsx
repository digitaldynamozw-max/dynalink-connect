import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock3, MapPin, Package, Phone, Receipt, Route, UserRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { formatOrderReceiptNumber } from '@/lib/orders'
import {
  DELIVERY_PROOF_AUDIENCE,
  DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
  DELIVERY_TIMELINE_AUDIENCE,
  RIDER_TRACKING_AUDIENCE,
  parseNotificationPayload,
  type DeliveryProofPayload,
  type DeliveryRouteSnapshotPayload,
  type DeliveryTimelinePayload,
  type RiderTrackingPayload,
} from '@/lib/courier-tracking'
import { RouteReplayCard } from '@/components/route-replay-card'
import { AdminBadge, AdminEmptyState, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

function formatStatus(status: string) {
  return status === 'courier_on_the_way'
    ? 'Courier On The Way'
    : status.charAt(0).toUpperCase() + status.slice(1)
}

function badgeTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' {
  if (status === 'completed') return 'green'
  if (status === 'courier_on_the_way') return 'blue'
  if (status === 'accepted' || status === 'paid' || status === 'pending') return 'amber'
  if (status === 'declined' || status === 'cancelled') return 'red'
  return 'neutral'
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

function getCustomerName(order: {
  user: {
    firstName: string | null
    lastName: string | null
    name: string | null
    email: string
  }
}) {
  return [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.name || order.user.email
}

function getOrderLocation(order: {
  fulfillmentMethod: string
  deliveryAddress: string | null
  user: { deliveryAddress: string | null }
  items: Array<{
    vendor: {
      storeAddress?: string | null
      storeCity?: string | null
      storeState?: string | null
    } | null
  }>
}) {
  if (order.fulfillmentMethod === 'pickup') {
    const vendor = order.items.find((item) => item.vendor)?.vendor
    const vendorAddress = [vendor?.storeAddress, vendor?.storeCity, vendor?.storeState].filter(Boolean).join(', ')
    return vendorAddress || order.deliveryAddress || order.user.deliveryAddress || 'Collection details pending'
  }

  return order.deliveryAddress || 'No address captured'
}

export default async function AdminOrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          mobileNumber: true,
          deliveryAddress: true,
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
        orderBy: { updatedAt: 'asc' },
      },
    },
  })

  if (!order) {
    notFound()
  }

  const itemIds = order.items.map((item) => item.id)

  const [assignments, riderTracking, timelines, proofs, routeSnapshots] = itemIds.length
    ? await Promise.all([
        prisma.notification.findMany({
          where: {
            audience: 'courier_assignment',
            orderItemId: { in: itemIds },
          },
          select: {
            orderItemId: true,
            recipientId: true,
            recipient: {
              select: {
                id: true,
                email: true,
                name: true,
                mobileNumber: true,
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
            orderItemId: { in: itemIds },
          },
          select: {
            orderItemId: true,
            message: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.findMany({
          where: {
            audience: DELIVERY_PROOF_AUDIENCE,
            orderItemId: { in: itemIds },
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
            orderItemId: { in: itemIds },
          },
          select: {
            orderItemId: true,
            message: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
      ])
    : [[], [], [], [], []]

  const assignmentMap = new Map(assignments.map((assignment) => [assignment.orderItemId, assignment]))
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

  const routeMap = new Map<string, DeliveryRouteSnapshotPayload[]>()
  for (const snapshot of routeSnapshots) {
    const payload = parseNotificationPayload<DeliveryRouteSnapshotPayload>(snapshot.message)
    if (!payload || !snapshot.orderItemId) continue
    const current = routeMap.get(snapshot.orderItemId) || []
    current.push(payload)
    routeMap.set(snapshot.orderItemId, current)
  }

  const customerName = getCustomerName(order)
  const receiptNumber = formatOrderReceiptNumber(order.orderNumber, order.id)
  const isPickup = order.fulfillmentMethod === 'pickup'
  const orderLocation = getOrderLocation(order)
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const flattenedTimeline = order.items
    .flatMap((item) =>
      (timelineMap.get(item.id) || []).map((event) => ({
        id: `${item.id}-${event.createdAt}-${event.type}`,
        itemName: item.product.name,
        createdAt: event.createdAt,
        label: event.label,
        note: event.note,
      }))
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/call-center"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                title="Back to call center"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order Receipt</p>
                <h1 className="text-2xl font-bold text-slate-900">Order #{receiptNumber}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge label={formatStatus(order.status)} tone={badgeTone(order.status)} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {isPickup ? 'Collection' : 'Delivery'}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {money(order.total)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Placed</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Items</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalQuantity} item(s)</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isPickup ? 'Collection timing' : 'Delivery timing'}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {order.requestedDeliveryAt ? new Date(order.requestedDeliveryAt).toLocaleString() : 'As soon as possible'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isPickup ? 'Collection point' : 'Address'}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{orderLocation}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <AdminSectionCard
            title="Bill Items"
            description="Line-by-line receipt for the order."
            contentClassName="p-0"
          >
            <AdminTableWrap>
              <table className="min-w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Item</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Store</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Line Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.product.name}</p>
                        {item.selectedOptionsSummary ? (
                          <p className="mt-1 text-xs text-slate-500">{item.selectedOptionsSummary}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.vendor?.vendorName || 'Admin Store'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-700">{money(item.price)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{money(item.price * item.quantity)}</td>
                      <td className="px-4 py-3">
                        <AdminBadge label={formatStatus(item.status)} tone={badgeTone(item.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableWrap>
          </AdminSectionCard>

          <AdminSectionCard
            title={isPickup ? 'Order History' : 'Trip History'}
            description={
              isPickup
                ? 'Collection-aware activity log for this order.'
                : 'Courier movement, fulfillment updates, and delivery milestones.'
            }
          >
            {flattenedTimeline.length === 0 ? (
              <AdminEmptyState message={isPickup ? 'No collection history has been recorded yet.' : 'No trip history has been recorded yet.'} />
            ) : (
              <div className="space-y-3">
                {flattenedTimeline.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{event.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{event.note}</p>
                        <p className="mt-2 text-xs text-slate-500">{event.itemName}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminSectionCard>

          {!isPickup ? (
            <AdminSectionCard title="Route Replay" description="Checkpoint history for active or completed delivery movement.">
              <div className="grid gap-4 lg:grid-cols-2">
                {order.items.length === 0 ? (
                  <AdminEmptyState message="No order items are attached to this receipt." />
                ) : (
                  order.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.vendor?.vendorName || 'Admin Store'}</p>
                      <RouteReplayCard
                        snapshots={(routeMap.get(item.id) || []).map((snapshot) => ({
                          latitude: snapshot.latitude,
                          longitude: snapshot.longitude,
                          accuracy: snapshot.accuracy,
                          createdAt: snapshot.createdAt,
                          courierId: snapshot.courierId,
                          courierName: snapshot.courierName,
                        }))}
                        title="Trip replay"
                        emptyLabel="No route checkpoints captured for this item."
                      />
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>
          ) : null}
        </div>

        <div className="space-y-4">
          <AdminSectionCard title="Customer Details" description="Who placed the order and how the team can reach them.">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <UserRound className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">{customerName}</p>
                  <p className="text-slate-500">{order.user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">{order.user.mobileNumber || 'No phone saved'}</p>
                  <p className="text-slate-500">Primary contact number</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">{orderLocation}</p>
                  <p className="text-slate-500">{isPickup ? 'Collection location' : 'Delivery address'}</p>
                </div>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Receipt Summary" description="Financial summary for the order.">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">{money(subtotal)}</span>
              </div>
              {!isPickup ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Delivery fee</span>
                  <span className="font-semibold text-slate-900">{money(order.deliveryFee)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Platform fee</span>
                <span className="font-semibold text-slate-900">{money(order.platformFee)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
                <span>Total</span>
                <span className="font-semibold">{money(order.total)}</span>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title={isPickup ? 'Collection Handling' : 'Fulfillment Details'}
            description={isPickup ? 'Store and collection progress for this order.' : 'Courier and proof context for the current trip.'}
          >
            <div className="space-y-3">
              {order.items.map((item) => {
                const assignment = assignmentMap.get(item.id)
                const courierName = assignment?.recipient ? assignment.recipient.name || assignment.recipient.email : 'Unassigned'
                const tracking = assignment?.recipientId ? trackingMap.get(assignment.recipientId) || null : null
                const proof = proofMap.get(item.id) || null

                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.vendor?.vendorName || 'Admin Store'}</p>
                      </div>
                      <AdminBadge label={formatStatus(item.status)} tone={badgeTone(item.status)} />
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span>{item.quantity} x {money(item.price)}</span>
                      </div>
                      {!isPickup ? (
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-slate-400" />
                          <span>{courierName}{tracking?.lastSeenAt ? ` | last seen ${new Date(tracking.lastSeenAt).toLocaleTimeString()}` : ''}</span>
                        </div>
                      ) : null}
                      {proof ? (
                        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800">
                          <Receipt className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium">{isPickup ? 'Collection proof logged' : `Delivered to ${proof.recipientName}`}</p>
                            <p className="text-xs">{proof.note || 'No note added.'}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
