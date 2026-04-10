'use client'

import { useState } from 'react'

type PayoutRecord = {
  id: string
  amount: number
  status: string
  createdAt: string
  ordersIncluded: number
  reviewNotes?: string | null
  reviewedAt?: string | null
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function formatStatus(status: string) {
  return status === 'courier_on_the_way'
    ? 'Courier On The Way'
    : status.charAt(0).toUpperCase() + status.slice(1)
}

export function AdminVendorPayoutReview({ initialPayouts }: { initialPayouts: PayoutRecord[] }) {
  const [payouts, setPayouts] = useState(initialPayouts)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function reviewPayout(id: string, action: 'approve' | 'reject') {
    setBusyId(id)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to review payout request')
      }

      setPayouts((current) =>
        current.map((payout) =>
          payout.id === id
            ? {
                ...payout,
                status: payload.payout.status,
                reviewNotes: payload.payout.reviewNotes,
                reviewedAt: payload.payout.reviewedAt,
              }
            : payout
        )
      )
      setMessage(payload?.message || 'Payout updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to review payout request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="px-4 py-4">
      {message ? (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {message}
        </div>
      ) : null}

      {payouts.length === 0 ? (
        <p className="text-sm text-slate-500">No payouts recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div key={payout.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{formatMoney(payout.amount)}</p>
                  <p className="text-xs text-slate-500">{new Date(payout.createdAt).toLocaleString()}</p>
                </div>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {formatStatus(payout.status)}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">Orders included: {payout.ordersIncluded}</div>
              {payout.reviewNotes ? <div className="mt-2 text-xs text-slate-500">Notes: {payout.reviewNotes}</div> : null}
              {payout.reviewedAt ? (
                <div className="mt-1 text-xs text-slate-400">Reviewed {new Date(payout.reviewedAt).toLocaleString()}</div>
              ) : null}
              {payout.status === 'requested' ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void reviewPayout(payout.id, 'approve')}
                    disabled={busyId === payout.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyId === payout.id ? 'Saving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => void reviewPayout(payout.id, 'reject')}
                    disabled={busyId === payout.id}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busyId === payout.id ? 'Saving...' : 'Reject'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
