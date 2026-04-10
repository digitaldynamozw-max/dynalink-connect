import { AdminBadge, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'
import type { RiderPerformanceRow } from '@/lib/admin/courier-operations'

function toneForAvailability(availability: string): 'neutral' | 'blue' | 'green' | 'amber' | 'red' {
  if (availability === 'on_delivery') return 'blue'
  if (availability === 'available') return 'green'
  if (availability === 'busy' || availability === 'break') return 'amber'
  return 'neutral'
}

export function AdminRiderPerformance({
  rows,
}: {
  rows: RiderPerformanceRow[]
}) {
  return (
    <AdminSectionCard title="Rider Performance Analytics" description="Completion quality, proof coverage, and dispatch performance by courier.">
      <AdminTableWrap>
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Rider</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Active Jobs</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Completed</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Completion Rate</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Proof Rate</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Avg Time</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Fees</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  No rider analytics available yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.courierId} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-700">
                    <p className="font-medium text-slate-900">{row.courierName}</p>
                    <p className="text-[11px] text-slate-500">{row.courierEmail}</p>
                  </td>
                  <td className="px-3 py-2">
                    <AdminBadge label={row.availability} tone={toneForAvailability(row.availability)} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{row.activeAssignments}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{row.completedDeliveries}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{row.completionRate}%</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{row.proofRate}%</td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {typeof row.averageCompletionMinutes === 'number' ? `${row.averageCompletionMinutes} min` : 'Not enough data'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">${row.totalDeliveryFees.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : 'No ping yet'}
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
