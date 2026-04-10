'use client'

import { useState } from 'react'
import { AdminTableWrap } from '@/components/admin-ui'

type ExceptionRow = {
  orderId: string | null
  orderItemId: string | null
  createdAt: string
  payload: {
    type: string
    note: string
    actorName: string
    resolutionStatus: string
  }
}

export function AdminExceptionQueue({ initialRows }: { initialRows: ExceptionRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  async function resolveException(orderId: string, orderItemId: string) {
    setResolvingId(orderItemId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/exceptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve exception')
      }

      setRows((current) =>
        current.map((row) =>
          row.orderItemId === orderItemId
            ? {
                ...row,
                payload: {
                  ...row.payload,
                  resolutionStatus: 'resolved',
                },
              }
            : row
        )
      )
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <AdminTableWrap>
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Type</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Owner</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Note</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No delivery exceptions in the queue.</td>
            </tr>
          ) : (
            rows.map((exception, index) => (
              <tr key={`${exception.orderItemId}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-700">#{exception.orderId?.slice(0, 8) || 'Unknown'}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{exception.payload.type.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{exception.payload.actorName}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{exception.payload.note}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{exception.payload.resolutionStatus}</td>
                <td className="px-3 py-2">
                  {exception.orderId && exception.orderItemId && exception.payload.resolutionStatus !== 'resolved' ? (
                    <button
                      onClick={() => void resolveException(exception.orderId || '', exception.orderItemId || '')}
                      disabled={resolvingId === exception.orderItemId}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {resolvingId === exception.orderItemId ? 'Resolving...' : 'Resolve'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Closed</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminTableWrap>
  )
}
