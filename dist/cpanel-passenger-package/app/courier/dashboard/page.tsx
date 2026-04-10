'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock3, Loader2, MapPin, Route, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { RouteReplayCard } from '@/components/route-replay-card'

type RiderAvailability = 'offline' | 'available' | 'busy' | 'on_delivery' | 'break'

type DeliveryTimeline = {
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

type DeliveryProof = {
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

type RiderTracking = {
  availability: RiderAvailability
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  lastSeenAt: string
  activeOrderItemId: string | null
}

type CourierDashboardData = {
  courier: {
    id: string
    name: string | null
    email: string
    mobileNumber: string | null
    isActive: boolean
    updatedAt: string
  }
  metrics: {
    activeTrips: number
    dispatchQueue: number
    completedDeliveries: number
    deliveryFees: number
  }
  tracking: RiderTracking | null
  items: Array<{
    id: string
    status: string
    estimatedDeliveryMinutes: number | null
    deliveryFee: number
    updatedAt: string
    productName: string
    vendorName: string
    orderId: string
    deliveryAddress: string
    customerName: string
    customerPhone: string
    createdAt: string
    timeline: DeliveryTimeline[]
    proof: DeliveryProof | null
    routeReplay: Array<{
      latitude: number
      longitude: number
      accuracy: number | null
      createdAt: string
      courierId: string
      courierName: string
    }>
    lateDelivery: {
      isLate: boolean
      estimatedDeliveryMinutes: number | null
      assignedAt: string | null
      startedAt: string | null
      expectedBy: string | null
      minutesLate: number
    }
    exceptions: Array<{
      type: string
      note: string
      createdAt: string
      resolutionStatus: string
      nextAction?: string | null
    }>
    routeHealth: {
      checkpointCount: number
      lastCheckpointAt: string | null
      idleMinutes: number
      isIdle: boolean
      movementStatus: string
      recalculatedEtaMinutes: number | null
    }
  }>
}

function formatStatus(status: string) {
  return status === 'courier_on_the_way'
    ? 'Courier On The Way'
    : status.charAt(0).toUpperCase() + status.slice(1)
}

function lateToneClasses(isLate: boolean) {
  return isLate
    ? 'border-[rgba(255,186,95,0.45)] bg-[rgba(255,186,95,0.16)] text-amber-950'
    : 'border-[rgba(102,215,171,0.38)] bg-[rgba(102,215,171,0.14)] text-emerald-950'
}

export default function CourierDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<CourierDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<RiderAvailability>('available')
  const [sharingLocation, setSharingLocation] = useState(false)
  const [lastPingAt, setLastPingAt] = useState<string | null>(null)
  const [proofDrafts, setProofDrafts] = useState<Record<string, {
    recipientName: string
    signatureName: string
    note: string
    photoDataUrl: string
    checklist: {
      handedToRecipient: boolean
      packageSealed: boolean
      addressConfirmed: boolean
    }
  }>>({})
  const [exceptionDrafts, setExceptionDrafts] = useState<Record<string, { type: string; note: string; nextAction: string }>>({})
  const [focusActiveTrip, setFocusActiveTrip] = useState(true)

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role

    if (status === 'loading') {
      return
    }

    if (!session?.user?.email) {
      router.push('/auth/signin')
      return
    }

    if (role !== 'courier') {
      router.push('/')
      return
    }

    void fetchDashboard()
  }, [router, session, status])

  async function fetchDashboard() {
    try {
      const response = await fetch('/api/courier/dashboard')
      if (!response.ok) {
        throw new Error('Failed to load courier dashboard')
      }

      const payload = (await response.json()) as CourierDashboardData
      setDashboard(payload)
      setAvailability(payload.tracking?.availability || 'available')
      setLastPingAt(payload.tracking?.lastSeenAt || null)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const recentItems = useMemo(() => {
    const items = dashboard?.items || []
    const sorted = [...items].sort((left, right) => {
      const leftEta = left.routeHealth?.recalculatedEtaMinutes ?? left.estimatedDeliveryMinutes ?? Number.MAX_SAFE_INTEGER
      const rightEta = right.routeHealth?.recalculatedEtaMinutes ?? right.estimatedDeliveryMinutes ?? Number.MAX_SAFE_INTEGER
      return leftEta - rightEta
    })

    if (focusActiveTrip) {
      const active = sorted.filter((item) => item.status === 'courier_on_the_way')
      return (active.length ? active : sorted).slice(0, 10)
    }

    return sorted.slice(0, 10)
  }, [dashboard?.items, focusActiveTrip])
  const activeTrackingOrderItemId = dashboard?.tracking?.activeOrderItemId || null
  const hasDashboard = Boolean(dashboard?.courier.id)

  async function pingTracking(nextAvailability: RiderAvailability, activeOrderItemId?: string | null) {
    try {
      const sendPing = async (coords?: GeolocationCoordinates) => {
        const response = await fetch('/api/courier/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            availability: nextAvailability,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            accuracy: coords?.accuracy,
            activeOrderItemId: activeOrderItemId || null,
          }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to update rider tracking')
        }

        setLastPingAt(payload?.tracking?.lastSeenAt || new Date().toISOString())
        setDashboard((current) =>
          current
            ? {
                ...current,
                tracking: payload?.tracking || current.tracking,
              }
            : current
        )
      }

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setSharingLocation(true)
            void sendPing(position.coords)
          },
          () => {
            setSharingLocation(false)
            void sendPing()
          },
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        )
      } else {
        await sendPing()
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!hasDashboard) return

    void pingTracking(availability, activeTrackingOrderItemId)
    const intervalId = window.setInterval(() => {
      void pingTracking(availability, activeTrackingOrderItemId)
    }, 45000)

    return () => window.clearInterval(intervalId)
  }, [activeTrackingOrderItemId, availability, hasDashboard])

  async function updateDeliveryStatus(orderId: string, itemId: string, nextStatus: 'courier_on_the_way' | 'completed') {
    setUpdatingItemId(itemId)

    try {
      const proofDraft = proofDrafts[itemId]
      const response = await fetch(`/api/courier/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          status: nextStatus,
          proofRecipientName: nextStatus === 'completed' ? proofDraft?.recipientName : undefined,
          proofSignatureName: nextStatus === 'completed' ? proofDraft?.signatureName : undefined,
          proofNote: nextStatus === 'completed' ? proofDraft?.note : undefined,
          proofPhotoDataUrl: nextStatus === 'completed' ? proofDraft?.photoDataUrl : undefined,
          proofChecklist: nextStatus === 'completed' ? proofDraft?.checklist : undefined,
          latitude: dashboard?.tracking?.latitude ?? undefined,
          longitude: dashboard?.tracking?.longitude ?? undefined,
          accuracy: dashboard?.tracking?.accuracy ?? undefined,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update delivery status')
      }

      setDashboard((current) => {
        if (!current) return current

        const items = current.items.map((item) =>
          item.id === itemId
            ? (() => {
                const timelineEvent: DeliveryTimeline = {
                  type: nextStatus === 'completed' ? 'completed' : 'started',
                  label: nextStatus === 'completed' ? 'Delivery completed' : 'Delivery started',
                  note:
                    nextStatus === 'completed'
                      ? `${current.courier.name || current.courier.email} completed this delivery.`
                      : `${current.courier.name || current.courier.email} started this delivery.`,
                  actorRole: 'courier',
                  actorName: current.courier.name || current.courier.email,
                  createdAt: new Date().toISOString(),
                  courierId: current.courier.id,
                  courierName: current.courier.name || current.courier.email,
                  recipientName:
                    nextStatus === 'completed' ? proofDraft?.recipientName?.trim() || 'Recipient confirmed' : null,
                }

                return {
                ...item,
                status: nextStatus,
                proof:
                  nextStatus === 'completed'
                    ? {
                        recipientName: proofDraft?.recipientName?.trim() || 'Recipient confirmed',
                        signatureName: proofDraft?.signatureName?.trim() || null,
                        note: proofDraft?.note?.trim() || 'Delivery completed by rider.',
                        photoUrl: proofDraft?.photoDataUrl?.trim() || null,
                        checklist: proofDraft?.checklist || {
                          handedToRecipient: false,
                          packageSealed: false,
                          addressConfirmed: false,
                        },
                        submittedAt: new Date().toISOString(),
                        courierId: current.courier.id,
                        courierName: current.courier.name || current.courier.email,
                        latitude: current.tracking?.latitude ?? null,
                        longitude: current.tracking?.longitude ?? null,
                      }
                    : item.proof,
                timeline: [timelineEvent, ...(item.timeline || [])],
                lateDelivery:
                  nextStatus === 'completed'
                    ? {
                        ...item.lateDelivery,
                        isLate: false,
                        minutesLate: 0,
                      }
                    : item.lateDelivery,
              }
              })()
            : item
        )
        const nextAvailability =
          items.some((item) => item.status === 'courier_on_the_way') ? 'on_delivery' : 'available'

        return {
          ...current,
          items,
          metrics: {
            activeTrips: items.filter((item) => item.status === 'courier_on_the_way').length,
            dispatchQueue: items.filter((item) => ['pending', 'accepted'].includes(item.status)).length,
            completedDeliveries: items.filter((item) => item.status === 'completed').length,
            deliveryFees: items.reduce((sum, item) => sum + item.deliveryFee, 0),
          },
          tracking: {
            ...(current.tracking || {
              availability,
              latitude: null,
              longitude: null,
              accuracy: null,
              lastSeenAt: new Date().toISOString(),
              activeOrderItemId: null,
            }),
            availability: nextAvailability,
            activeOrderItemId: nextAvailability === 'on_delivery' ? itemId : null,
            lastSeenAt: new Date().toISOString(),
          },
        }
      })

      setProofDrafts((current) => {
        const next = { ...current }
        delete next[itemId]
        return next
      })
      setAvailability((current) => (nextStatus === 'completed' ? current : 'on_delivery'))
    } catch (error) {
      console.error(error)
      window.alert(error instanceof Error ? error.message : 'Failed to update delivery status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function reportException(orderId: string, itemId: string) {
    const draft = exceptionDrafts[itemId]
    if (!draft?.type) {
      window.alert('Select an exception type first.')
      return
    }

    try {
      const response = await fetch(`/api/courier/orders/${orderId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: itemId,
          type: draft.type,
          note: draft.note,
          nextAction: draft.nextAction,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to report delivery exception')
      }

      setDashboard((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      exceptions: [payload.exception, ...(item.exceptions || [])],
                    }
                  : item
              ),
            }
          : current
      )
      setExceptionDrafts((current) => {
        const next = { ...current }
        delete next[itemId]
        return next
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to report delivery exception')
    }
  }

  async function handleProofPhotoSelected(itemId: string, file: File | null) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProofDrafts((current) => ({
        ...current,
        [itemId]: {
          recipientName: current[itemId]?.recipientName || '',
          signatureName: current[itemId]?.signatureName || '',
          note: current[itemId]?.note || '',
          photoDataUrl: result,
          checklist: current[itemId]?.checklist || {
            handedToRecipient: false,
            packageSealed: false,
            addressConfirmed: false,
          },
        },
      }))
    }

    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="theme-app-shell flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-600">Loading courier dashboard...</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="theme-app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Courier Dashboard Unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">We couldn&apos;t load courier operations right now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-app-shell min-h-screen">
      <div className="border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.16))] backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="theme-kicker inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
              <Route className="h-3.5 w-3.5" />
              Courier Dashboard
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{dashboard.courier.name || dashboard.courier.email}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Live rider operations, delivery history, proof of delivery, and dispatch tracking.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[var(--border)]">{dashboard.courier.email}</span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[var(--border)]">{dashboard.courier.mobileNumber || 'No phone saved'}</span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[var(--border)]">
                {dashboard.courier.isActive ? 'Active account' : 'Inactive account'}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[var(--border)]">
                Last ping {lastPingAt ? new Date(lastPingAt).toLocaleTimeString() : 'pending'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {(['available', 'busy', 'on_delivery', 'break', 'offline'] as RiderAvailability[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setAvailability(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    availability === option ? 'theme-accent-btn text-white' : 'theme-secondary-btn'
                  }`}
                >
                  {option.replace('_', ' ')}
                </button>
              ))}
              <span className="text-xs text-slate-500">
                {sharingLocation ? 'Location sharing active' : 'Location permission not confirmed'}
              </span>
              <button
                onClick={() => setFocusActiveTrip((current) => !current)}
                className="theme-secondary-btn rounded-full px-3 py-1.5 text-xs font-semibold"
              >
                {focusActiveTrip ? 'Show all assigned items' : 'Focus active trip'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard icon={Truck} label="Active Deliveries" value={dashboard.metrics.activeTrips} helper="Rider deliveries currently moving" />
          <MetricCard icon={Clock3} label="Dispatch Queue" value={dashboard.metrics.dispatchQueue} helper="Orders waiting for rider flow" />
          <MetricCard icon={Route} label="Completed" value={dashboard.metrics.completedDeliveries} helper="Finished delivery items in view" />
          <MetricCard icon={Wallet} label="Delivery Fees" value={`$${dashboard.metrics.deliveryFees.toFixed(2)}`} helper="Tracked delivery fee total" />
        </div>

        <section className="theme-panel overflow-hidden rounded-[1.35rem]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Rider Delivery History</h2>
            <p className="mt-1 text-xs text-slate-500">Latest deliveries assigned to this rider, including completed history.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-[var(--brand-accent-soft)]/40">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Customer</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Vendor</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">ETA</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No courier items available yet.
                    </td>
                  </tr>
                ) : (
                  recentItems.map((item) => (
                    <tr key={item.id} className="border-b border-white/10">
                      <td className="px-3 py-2 text-xs text-slate-700">
                        #{item.orderId.slice(0, 8)}
                        <p className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                        {item.proof ? (
                          <div className="mt-2 rounded-lg border border-[rgba(102,215,171,0.38)] bg-[rgba(102,215,171,0.16)] px-2 py-1.5 text-[11px] text-emerald-950">
                            Proof checklist: {item.proof.checklist.handedToRecipient ? 'recipient' : 'recipient pending'} |{' '}
                            {item.proof.checklist.packageSealed ? 'sealed' : 'seal pending'} |{' '}
                            {item.proof.checklist.addressConfirmed ? 'address confirmed' : 'address pending'}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        <p className="font-medium text-slate-900">{item.customerName}</p>
                        <p className="text-[11px] text-slate-500">{item.customerPhone}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">{item.vendorName}</td>
                      <td className="px-3 py-2 text-xs text-slate-900">
                        <p>{item.productName}</p>
                        <p className="text-[11px] text-slate-500">{item.deliveryAddress}</p>
                        {item.proof ? (
                          <div className="mt-1 space-y-1 text-[11px] text-emerald-600">
                            <p>Delivered to {item.proof.recipientName}</p>
                            {item.proof.signatureName ? <p>Signed by {item.proof.signatureName}</p> : null}
                          </div>
                        ) : null}
                        {item.lateDelivery?.estimatedDeliveryMinutes ? (
                          <div className={`mt-2 rounded-lg border px-2 py-1.5 text-[11px] ${lateToneClasses(item.lateDelivery.isLate)}`}>
                            {item.lateDelivery.isLate ? (
                              <span>
                                Late by {item.lateDelivery.minutesLate} min
                                {item.lateDelivery.expectedBy ? ` (expected ${new Date(item.lateDelivery.expectedBy).toLocaleTimeString()})` : ''}
                              </span>
                            ) : (
                              <span>
                                On schedule
                                {item.lateDelivery.expectedBy ? ` until ${new Date(item.lateDelivery.expectedBy).toLocaleTimeString()}` : ''}
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--brand-accent-soft)]/50 px-2 py-1.5 text-[11px] text-slate-700">
                          {item.routeHealth.checkpointCount} checkpoints · {item.routeHealth.movementStatus}
                          {item.routeHealth.isIdle ? ` · idle ${item.routeHealth.idleMinutes} min` : ''}
                          {typeof item.routeHealth.recalculatedEtaMinutes === 'number'
                            ? ` · ETA ${item.routeHealth.recalculatedEtaMinutes} min`
                            : ''}
                        </div>
                        {item.exceptions.length ? (
                          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-800">
                            Latest exception: {item.exceptions[0]?.type.replaceAll('_', ' ')} · {item.exceptions[0]?.note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {typeof item.estimatedDeliveryMinutes === 'number' ? `${item.estimatedDeliveryMinutes} min` : 'Not set'}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatStatus(item.status)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {item.status !== 'courier_on_the_way' && item.status !== 'completed' ? (
                            <button
                              onClick={() => void updateDeliveryStatus(item.orderId, item.id, 'courier_on_the_way')}
                              disabled={updatingItemId === item.id}
                              className="theme-accent-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                            >
                              {updatingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                              Start Delivery
                            </button>
                          ) : null}
                          {item.status === 'courier_on_the_way' ? (
                            <>
                              <input
                                value={proofDrafts[item.id]?.recipientName || ''}
                                onChange={(event) =>
                                  setProofDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      recipientName: event.target.value,
                                      signatureName: current[item.id]?.signatureName || '',
                                      note: current[item.id]?.note || '',
                                      photoDataUrl: current[item.id]?.photoDataUrl || '',
                                      checklist: current[item.id]?.checklist || {
                                        handedToRecipient: false,
                                        packageSealed: false,
                                        addressConfirmed: false,
                                      },
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur placeholder:text-slate-500"
                                placeholder="Recipient"
                              />
                              <input
                                value={proofDrafts[item.id]?.signatureName || ''}
                                onChange={(event) =>
                                  setProofDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      recipientName: current[item.id]?.recipientName || '',
                                      signatureName: event.target.value,
                                      note: current[item.id]?.note || '',
                                      photoDataUrl: current[item.id]?.photoDataUrl || '',
                                      checklist: current[item.id]?.checklist || {
                                        handedToRecipient: false,
                                        packageSealed: false,
                                        addressConfirmed: false,
                                      },
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur placeholder:text-slate-500"
                                placeholder="Signature name"
                              />
                              <input
                                value={proofDrafts[item.id]?.note || ''}
                                onChange={(event) =>
                                  setProofDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      recipientName: current[item.id]?.recipientName || '',
                                      signatureName: current[item.id]?.signatureName || '',
                                      note: event.target.value,
                                      photoDataUrl: current[item.id]?.photoDataUrl || '',
                                      checklist: current[item.id]?.checklist || {
                                        handedToRecipient: false,
                                        packageSealed: false,
                                        addressConfirmed: false,
                                      },
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur placeholder:text-slate-500"
                                placeholder="Delivery note"
                              />
                              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/16 bg-white/24 px-2 py-1.5 text-[11px] text-slate-700 backdrop-blur">
                                Upload proof photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => void handleProofPhotoSelected(item.id, event.target.files?.[0] || null)}
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {([
                                  ['handedToRecipient', 'Handed to recipient'],
                                  ['packageSealed', 'Package sealed'],
                                  ['addressConfirmed', 'Address confirmed'],
                                ] as const).map(([key, label]) => (
                                  <label
                                    key={`${item.id}-${key}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-white/16 bg-white/24 px-2 py-1 text-[11px] text-slate-700 backdrop-blur"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={Boolean(proofDrafts[item.id]?.checklist?.[key])}
                                      onChange={(event) =>
                                        setProofDrafts((current) => ({
                                          ...current,
                                          [item.id]: {
                                            recipientName: current[item.id]?.recipientName || '',
                                            signatureName: current[item.id]?.signatureName || '',
                                            note: current[item.id]?.note || '',
                                            photoDataUrl: current[item.id]?.photoDataUrl || '',
                                            checklist: {
                                              handedToRecipient: current[item.id]?.checklist?.handedToRecipient || false,
                                              packageSealed: current[item.id]?.checklist?.packageSealed || false,
                                              addressConfirmed: current[item.id]?.checklist?.addressConfirmed || false,
                                              [key]: event.target.checked,
                                            },
                                          },
                                        }))
                                      }
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                              {proofDrafts[item.id]?.photoDataUrl ? (
                                <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--brand-accent-soft)]/45 p-2">
                                  <Image
                                    src={proofDrafts[item.id]?.photoDataUrl}
                                    alt="Proof preview"
                                    width={160}
                                    height={96}
                                    className="max-h-24 rounded-md object-cover"
                                  />
                                </div>
                              ) : null}
                              <button
                                onClick={() => void updateDeliveryStatus(item.orderId, item.id, 'completed')}
                                disabled={updatingItemId === item.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#3dbb8b,#21936d)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(33,147,109,0.7)] transition hover:brightness-105 disabled:opacity-60"
                              >
                                {updatingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Complete Delivery
                              </button>
                            </>
                          ) : null}
                          {item.status === 'completed' ? (
                            <span className="inline-flex rounded-lg border border-white/16 bg-white/22 px-3 py-1.5 text-[11px] font-semibold text-slate-700 backdrop-blur">
                              Delivered
                            </span>
                          ) : null}
                        </div>
                        {item.status === 'courier_on_the_way' ? (
                          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Exception workflow</p>
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={exceptionDrafts[item.id]?.type || ''}
                                onChange={(event) =>
                                  setExceptionDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      type: event.target.value,
                                      note: current[item.id]?.note || '',
                                      nextAction: current[item.id]?.nextAction || '',
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur"
                                title="Exception type"
                              >
                                <option value="">Select exception</option>
                                <option value="customer_unreachable">Customer unreachable</option>
                                <option value="wrong_address">Wrong address</option>
                                <option value="failed_attempt">Failed attempt</option>
                                <option value="rescheduled">Rescheduled</option>
                                <option value="returned_to_vendor">Returned to vendor</option>
                                <option value="admin_escalation">Admin escalation</option>
                              </select>
                              <input
                                value={exceptionDrafts[item.id]?.note || ''}
                                onChange={(event) =>
                                  setExceptionDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      type: current[item.id]?.type || '',
                                      note: event.target.value,
                                      nextAction: current[item.id]?.nextAction || '',
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur placeholder:text-slate-500"
                                placeholder="Exception note"
                              />
                              <input
                                value={exceptionDrafts[item.id]?.nextAction || ''}
                                onChange={(event) =>
                                  setExceptionDrafts((current) => ({
                                    ...current,
                                    [item.id]: {
                                      type: current[item.id]?.type || '',
                                      note: current[item.id]?.note || '',
                                      nextAction: event.target.value,
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/16 bg-white/30 px-2 py-1.5 text-[11px] text-slate-800 backdrop-blur placeholder:text-slate-500"
                                placeholder="Next action"
                              />
                              <button
                                onClick={() => void reportException(item.orderId, item.id)}
                                className="rounded-lg bg-[linear-gradient(135deg,#f2aa52,#c97a28)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(201,122,40,0.68)] transition hover:brightness-105"
                              >
                                Report issue
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {item.timeline.length ? (
                          <div className="mt-3 rounded-lg bg-[var(--brand-accent-soft)]/45 p-2">
                            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Delivery timeline
                            </p>
                            <div className="space-y-1">
                              {item.timeline.slice(0, 4).map((event, index) => (
                                <div key={`${item.id}-${event.createdAt}-${index}`} className="text-[11px] text-slate-600">
                                  <span className="font-medium text-slate-800">{event.label}</span> · {new Date(event.createdAt).toLocaleString()}
                                </div>
                              ))}
                            </div>
                            {item.proof && typeof item.proof.latitude === 'number' && typeof item.proof.longitude === 'number' ? (
                              <a
                                href={`https://maps.google.com/?q=${item.proof.latitude},${item.proof.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand-accent-strong)] hover:text-[var(--brand-accent)]"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                View drop-off map
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                        <RouteReplayCard
                          snapshots={item.routeReplay || []}
                          title="Route Replay"
                          emptyLabel="Route replay starts once live delivery checkpoints are captured."
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Truck
  label: string
  value: string | number
  helper: string
}) {
  return (
    <div className="theme-panel rounded-[1rem] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] text-slate-600">{helper}</p>
        </div>
        <div className="theme-icon-chip inline-flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
