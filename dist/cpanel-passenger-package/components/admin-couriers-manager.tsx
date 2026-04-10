'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Route } from 'lucide-react'
import { AdminBadge, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

type CourierRow = {
  id: string
  email: string
  name: string | null
  mobileNumber: string | null
  role: string
  isActive: boolean
  updatedAt: string | Date
}

const emptyForm = {
  name: '',
  email: '',
  mobileNumber: '',
}

export function AdminCouriersManager({
  initialCouriers,
}: {
  initialCouriers: CourierRow[]
}) {
  const [couriers, setCouriers] = useState(initialCouriers)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeCouriers = useMemo(
    () => couriers.filter((courier) => courier.isActive).length,
    [couriers]
  )

  async function createCourier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role: 'courier',
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create courier')
      }

      setCouriers((current) => [payload.courier as CourierRow, ...current])
      setForm(emptyForm)
      window.alert(
        `Courier created for ${payload.courier.name || payload.courier.email}. Temporary password: ${payload.temporaryPassword}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create courier')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleCourier(courierId: string, nextActive: boolean) {
    setSavingId(courierId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/workers/${courierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update courier')
      }

      setCouriers((current) =>
        current.map((courier) => (courier.id === courierId ? (payload as CourierRow) : courier))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update courier')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <AdminSectionCard
        title="Register Courier"
        description="Create courier accounts for riders and dispatch staff from admin."
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={createCourier} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Courier name"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-400"
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Courier email"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-400"
          />
          <input
            value={form.mobileNumber}
            onChange={(event) => setForm((current) => ({ ...current, mobileNumber: event.target.value }))}
            placeholder="Phone number"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? 'Creating...' : 'Create Courier'}
          </button>
        </form>
      </AdminSectionCard>

      <AdminSectionCard
        title="Courier Team"
        description={`${couriers.length} courier accounts in the system, ${activeCouriers} currently active.`}
        contentClassName="p-0"
      >
        <AdminTableWrap>
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Courier</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Phone</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Role</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Updated</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {couriers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No couriers registered yet.
                  </td>
                </tr>
              ) : (
                couriers.map((courier) => (
                  <tr key={courier.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <Route className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-900">{courier.name || courier.email}</p>
                          <p className="text-xs text-slate-500">{courier.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{courier.mobileNumber || 'Not set'}</td>
                    <td className="px-3 py-2">
                      <AdminBadge label={courier.role} tone="neutral" />
                    </td>
                    <td className="px-3 py-2">
                      <AdminBadge label={courier.isActive ? 'Active' : 'Inactive'} tone={courier.isActive ? 'green' : 'amber'} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{new Date(courier.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => void toggleCourier(courier.id, !courier.isActive)}
                        disabled={savingId === courier.id}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                          courier.isActive
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {savingId === courier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {courier.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableWrap>
      </AdminSectionCard>
    </div>
  )
}
