'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RouteReplayCard } from '@/components/route-replay-card'

interface OrderItem {
  id: string
  quantity: number
  price: number
  status: string
  selectedOptionsSummary?: string | null
  estimatedDeliveryMinutes?: number | null
  preparationMinutes?: number | null
  additionalDelayMinutes?: number | null
  deliveryFee?: number
  vendor?: {
    id: string
    vendorName?: string | null
  } | null
  assignedCourier?: {
    id: string
    name: string
    phone: string | null
    tracking: {
      availability: string
      latitude: number | null
      longitude: number | null
      accuracy: number | null
      lastSeenAt: string
      activeOrderItemId: string | null
    } | null
  } | null
  timeline?: Array<{
    label: string
    note: string
    createdAt: string
    recipientName?: string | null
  }>
  proof?: {
    recipientName: string
    note: string
    photoUrl: string | null
    submittedAt: string
    latitude: number | null
    longitude: number | null
  } | null
  routeReplay?: Array<{
    latitude: number
    longitude: number
    accuracy: number | null
    createdAt: string
    courierId: string
    courierName: string
  }>
  lateDelivery?: {
    isLate: boolean
    estimatedDeliveryMinutes: number | null
    assignedAt: string | null
    startedAt: string | null
    expectedBy: string | null
    minutesLate: number
  }
  exceptions?: Array<{
    type: string
    note: string
    createdAt: string
    resolutionStatus: string
    nextAction?: string | null
  }>
  customerUpdates?: Array<{
    type: string
    title: string
    message: string
    createdAt: string
  }>
  routeHealth?: {
    checkpointCount: number
    lastCheckpointAt: string | null
    idleMinutes: number
    isIdle: boolean
    movementStatus: string
    recalculatedEtaMinutes: number | null
  }
  product: {
    id: string
    name: string
    image?: string
  }
}

interface Order {
  id: string
  orderNumber?: string
  status: string
  total: number
  deliveryFee: number
  deliveryAddress?: string | null
  createdAt: string
  items: OrderItem[]
}

function formatStatus(status: string) {
  switch (status) {
    case 'courier_on_the_way':
      return 'Courier On The Way'
    case 'declined':
      return 'Declined'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function getStatusClasses(status: string) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'courier_on_the_way') return 'bg-blue-100 text-blue-700'
  if (status === 'accepted') return 'bg-amber-100 text-amber-700'
  if (status === 'declined') return 'bg-red-200 text-red-900'
  if (status === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function getLateAlertClasses(isLate: boolean | undefined) {
  return isLate ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    const fetchOrders = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || 'Failed to load orders')
        }
        const data = await res.json()
        setOrders(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void fetchOrders()
  }, [router, session, status])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
        <p className="text-sm font-medium text-slate-600">Loading your orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
        <div className="text-center">
          <h1 className="mb-3 text-xl font-bold text-red-600">Error</h1>
          <p className="text-sm text-slate-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
        <div className="text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900">No orders yet</h1>
          <p className="mb-5 text-sm text-slate-600">Browse products and place an order to see it here.</p>
          <button
            onClick={() => router.push('/products')}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Shop now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#fef3c7)] p-4 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">My Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Track order progress, delivery updates, and item-level activity in a tighter view.</p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Order #{order.orderNumber || order.id.slice(0, 8)}</h2>
                  <p className="text-xs text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-600">Delivery address: {order.deliveryAddress || 'Not provided'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                  <span className="text-base font-bold text-slate-900">${order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <p>Items: {order.items.length}</p>
                <p>Delivery fee: ${order.deliveryFee.toFixed(2)}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-[1rem] border border-slate-200 p-3">
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-14 w-14 rounded-xl object-cover"
                        width={56}
                        height={56}
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-600">Vendor: {item.vendor?.vendorName || 'Admin Store'}</p>
                      <p className="text-xs text-slate-600">Rider: {item.assignedCourier?.name || 'Awaiting assignment'}</p>
                      {item.assignedCourier?.phone ? <p className="text-[11px] text-slate-500">Phone: {item.assignedCourier.phone}</p> : null}
                      {item.assignedCourier?.tracking ? (
                        <p className="text-[11px] text-slate-500">
                          Rider status: {item.assignedCourier.tracking.availability} · Last seen{' '}
                          {new Date(item.assignedCourier.tracking.lastSeenAt).toLocaleTimeString()}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-600">Qty: {item.quantity}</p>
                      <p className="text-xs text-slate-600">${item.price.toFixed(2)} each</p>
                      {item.selectedOptionsSummary ? <p className="text-[11px] text-slate-500">{item.selectedOptionsSummary}</p> : null}

                      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(item.status)}`}>
                        {formatStatus(item.status)}
                      </p>

                      {typeof item.estimatedDeliveryMinutes === 'number' ? (
                        <p className="mt-2 text-[11px] text-slate-500">ETA {item.estimatedDeliveryMinutes} min</p>
                      ) : null}

                      {typeof item.preparationMinutes === 'number' && item.preparationMinutes > 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Prep {item.preparationMinutes} min + extra {item.additionalDelayMinutes ?? 0} min
                        </p>
                      ) : null}

                      {item.proof ? (
                        <div className="mt-2 rounded-xl bg-emerald-50 p-2 text-[11px] text-emerald-700">
                          Delivered to {item.proof.recipientName}. {item.proof.note}
                        </div>
                      ) : null}

                      {item.lateDelivery?.estimatedDeliveryMinutes ? (
                        <div className={`mt-2 rounded-xl border p-2 text-[11px] ${getLateAlertClasses(item.lateDelivery.isLate)}`}>
                          {item.lateDelivery.isLate ? (
                            <p>
                              Late by {item.lateDelivery.minutesLate} min.
                              {item.lateDelivery.expectedBy ? ` Expected by ${new Date(item.lateDelivery.expectedBy).toLocaleTimeString()}.` : ''}
                            </p>
                          ) : (
                            <p>
                              Delivery is on track.
                              {item.lateDelivery.expectedBy ? ` Expected by ${new Date(item.lateDelivery.expectedBy).toLocaleTimeString()}.` : ''}
                            </p>
                          )}
                        </div>
                      ) : null}

                      {item.routeHealth ? (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                          <p className="font-medium text-slate-900">Route health</p>
                          <p className="mt-1">
                            {item.routeHealth.checkpointCount} checkpoints · {item.routeHealth.movementStatus}
                            {item.routeHealth.isIdle ? ` · idle ${item.routeHealth.idleMinutes} min` : ''}
                          </p>
                          {typeof item.routeHealth.recalculatedEtaMinutes === 'number' ? (
                            <p className="mt-1">Recalculated ETA: {item.routeHealth.recalculatedEtaMinutes} min</p>
                          ) : null}
                        </div>
                      ) : null}

                      {item.exceptions?.length ? (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-red-700">Delivery exceptions</p>
                          <div className="space-y-1">
                            {item.exceptions.slice(0, 3).map((exception, index) => (
                              <p key={`${item.id}-exception-${index}`} className="text-[11px] text-red-800">
                                <span className="font-medium">{exception.type.replaceAll('_', ' ')}</span> · {exception.note}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {item.timeline?.length ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Delivery Tracking</p>
                          <div className="space-y-1">
                            {item.timeline.slice(0, 5).map((event, index) => (
                              <p key={`${item.id}-${event.createdAt}-${index}`} className="text-[11px] text-slate-600">
                                <span className="font-medium text-slate-800">{event.label}</span> · {new Date(event.createdAt).toLocaleString()}
                              </p>
                            ))}
                          </div>
                          {item.assignedCourier?.tracking &&
                          typeof item.assignedCourier.tracking.latitude === 'number' &&
                          typeof item.assignedCourier.tracking.longitude === 'number' ? (
                            <a
                              href={`https://maps.google.com/?q=${item.assignedCourier.tracking.latitude},${item.assignedCourier.tracking.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-[11px] font-medium text-blue-600 hover:text-blue-700"
                            >
                              Track rider on map
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      <RouteReplayCard
                        snapshots={item.routeReplay || []}
                        title="Route Replay"
                        emptyLabel="Route replay will appear after the rider starts sharing checkpoints."
                      />

                      {item.customerUpdates?.length ? (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Communication log</p>
                          <div className="space-y-1">
                            {item.customerUpdates.slice(0, 4).map((update, index) => (
                              <p key={`${item.id}-update-${index}`} className="text-[11px] text-slate-600">
                                <span className="font-medium text-slate-800">{update.title}</span> · {new Date(update.createdAt).toLocaleString()}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
