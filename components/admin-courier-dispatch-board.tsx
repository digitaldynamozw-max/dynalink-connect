'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminBadge, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

type CourierOption = {
  id: string
  email: string
  name: string | null
  isActive: boolean
}

type DispatchRow = {
  id: string
  orderId: string
  vendorName: string
  productName: string
  estimatedDeliveryMinutes: number | null
  status: string
  assignedCourierId: string | null
  assignedCourierName: string | null
  assignedCourierAvailability?: string | null
  assignedCourierLastSeenAt?: string | null
  assignedCourierLatitude?: number | null
  assignedCourierLongitude?: number | null
  latestEventLabel?: string | null
  proofRecipientName?: string | null
  lateDelivery?: {
    isLate: boolean
    expectedBy: string | null
    minutesLate: number
  }
  routeHealth?: {
    checkpointCount: number
    idleMinutes: number
    isIdle: boolean
    movementStatus: string
    recalculatedEtaMinutes: number | null
  }
  exceptions?: Array<{
    type: string
    note: string
    resolutionStatus: string
  }>
  recommendedCourierId?: string | null
  recommendedCourierName?: string | null
  latestAssignmentAudit?: {
    previousCourierName: string | null
    nextCourierName: string | null
    actorName: string
    createdAt: string
  } | null
}

function itemTone(status: string): 'blue' | 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'courier_on_the_way') return 'blue'
  if (status === 'completed') return 'green'
  if (status === 'accepted') return 'amber'
  if (status === 'declined' || status === 'cancelled') return 'red'
  return 'neutral'
}

function formatStatus(status: string) {
  return status === 'courier_on_the_way' ? 'Courier On The Way' : status.charAt(0).toUpperCase() + status.slice(1)
}

export function AdminCourierDispatchBoard({
  initialItems,
  couriers,
}: {
  initialItems: DispatchRow[]
  couriers: CourierOption[]
}) {
  const [items, setItems] = useState(initialItems)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'late' | 'exceptions' | 'unassigned'>('all')

  const activeCouriers = useMemo(() => couriers.filter((courier) => courier.isActive), [couriers])
  const visibleItems = useMemo(() => {
    if (filter === 'late') return items.filter((item) => item.lateDelivery?.isLate)
    if (filter === 'exceptions') return items.filter((item) => (item.exceptions?.length || 0) > 0)
    if (filter === 'unassigned') return items.filter((item) => !item.assignedCourierId)
    return items
  }, [filter, items])

  async function updateAssignment(orderItemId: string, courierId: string) {
    setSavingId(orderItemId)
    setError(null)

    try {
      const response = await fetch('/api/admin/couriers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId,
          courierId: courierId || null,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to assign courier')
      }

      setItems((current) =>
        current.map((item) =>
          item.id === orderItemId
            ? {
                ...item,
                assignedCourierId: payload.assignment?.courierId || null,
                assignedCourierName: payload.assignment?.courierName || null,
              }
            : item
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign courier')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminSectionCard
      title="Rider Dispatch Board"
      description="Assign delivery items to active couriers and review movement."
      action={
        <div className="flex flex-wrap gap-2">
          {(['all', 'late', 'exceptions', 'unassigned'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                filter === option ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <AdminTableWrap>
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Vendor</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">ETA</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Courier</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Tracking</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Assign</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No delivery items ready for courier coordination.
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-700">#{item.orderId.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{item.vendorName}</td>
                  <td className="px-3 py-2 text-xs text-slate-900">{item.productName}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {typeof item.estimatedDeliveryMinutes === 'number' ? `${item.estimatedDeliveryMinutes} min` : 'Not set'}
                  </td>
                  <td className="px-3 py-2">
                    <AdminBadge label={formatStatus(item.status)} tone={itemTone(item.status)} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    <p>{item.assignedCourierName || 'Unassigned'}</p>
                    {item.assignedCourierAvailability ? (
                      <p className="mt-1 text-[11px] text-slate-500">{item.assignedCourierAvailability}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    <p>{item.latestEventLabel || 'No timeline yet'}</p>
                    {item.lateDelivery?.isLate ? (
                      <p className="mt-1 text-[11px] font-medium text-amber-700">
                        Late by {item.lateDelivery.minutesLate} min
                      </p>
                    ) : null}
                    {item.exceptions?.length ? (
                      <p className="mt-1 text-[11px] font-medium text-red-700">
                        {item.exceptions[0]?.type.replaceAll('_', ' ')}
                      </p>
                    ) : null}
                    {item.routeHealth?.isIdle ? (
                      <p className="mt-1 text-[11px] text-amber-700">Idle {item.routeHealth.idleMinutes} min</p>
                    ) : null}
                    {item.proofRecipientName ? (
                      <p className="mt-1 text-[11px] text-emerald-600">Delivered to {item.proofRecipientName}</p>
                    ) : item.assignedCourierLastSeenAt ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Last seen {new Date(item.assignedCourierLastSeenAt).toLocaleTimeString()}
                      </p>
                    ) : null}
                    {typeof item.assignedCourierLatitude === 'number' && typeof item.assignedCourierLongitude === 'number' ? (
                      <a
                        href={`https://maps.google.com/?q=${item.assignedCourierLatitude},${item.assignedCourierLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-[11px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        Open live map
                      </a>
                    ) : null}
                    {item.latestAssignmentAudit ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Reassigned by {item.latestAssignmentAudit.actorName} at{' '}
                        {new Date(item.latestAssignmentAudit.createdAt).toLocaleTimeString()}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.assignedCourierId || ''}
                        disabled={savingId === item.id}
                        onChange={(event) => void updateAssignment(item.id, event.target.value)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                        title="Assign courier"
                      >
                        <option value="">Unassigned</option>
                        {activeCouriers.map((courier) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.name || courier.email}
                          </option>
                        ))}
                      </select>
                      {!item.assignedCourierId && item.recommendedCourierId ? (
                        <button
                          onClick={() => void updateAssignment(item.id, item.recommendedCourierId || '')}
                          disabled={savingId === item.id}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Assign {item.recommendedCourierName}
                        </button>
                      ) : null}
                      {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>
    </AdminSectionCard>
  )
}
