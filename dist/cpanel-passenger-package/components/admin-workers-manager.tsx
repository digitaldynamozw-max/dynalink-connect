'use client'

import { useMemo, useState } from 'react'
import { Loader2, Route, Search, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { AdminBadge, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

export type WorkerRow = {
  id: string
  email: string
  name: string | null
  vendorName: string | null
  role: string
  isActive: boolean
  isVendor: boolean
  updatedAt: string | Date
  _count: {
    orders: number
    supportTickets: number
    products: number
  }
}

const roleOptions = [
  { value: 'admin', label: 'Admin Staff' },
  { value: 'vendor', label: 'Vendor Staff' },
  { value: 'courier', label: 'Courier Staff' },
  { value: 'user', label: 'General User' },
] as const

function roleTone(role: string): 'blue' | 'green' | 'amber' | 'neutral' {
  if (role === 'admin') return 'blue'
  if (role === 'vendor') return 'green'
  if (role === 'courier') return 'neutral'
  if (role === 'user') return 'amber'
  return 'neutral'
}

export function AdminWorkersManager({
  initialWorkers,
}: {
  initialWorkers: WorkerRow[]
}) {
  const [workers, setWorkers] = useState(initialWorkers)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'vendor' | 'courier' | 'user'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const adminCount = workers.filter((worker) => worker.role === 'admin').length
  const vendorCount = workers.filter((worker) => worker.role === 'vendor').length
  const courierCount = workers.filter((worker) => worker.role === 'courier').length
  const filteredWorkers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return workers.filter((worker) => {
      if (roleFilter !== 'all' && worker.role !== roleFilter) {
        return false
      }

      if (statusFilter === 'active' && !worker.isActive) {
        return false
      }

      if (statusFilter === 'inactive' && worker.isActive) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const haystack = `${worker.vendorName || ''} ${worker.name || ''} ${worker.email}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [roleFilter, search, statusFilter, workers])
  const allFilteredSelected =
    filteredWorkers.length > 0 && filteredWorkers.every((worker) => selectedIds.includes(worker.id))

  async function updateWorker(workerId: string, payload: Partial<Pick<WorkerRow, 'role' | 'isActive'>>) {
    const worker = workers.find((entry) => entry.id === workerId)
    const workerLabel = worker?.vendorName || worker?.name || worker?.email || 'this worker'
    const actionLabel =
      payload.role !== undefined
        ? `change the role for ${workerLabel} to "${payload.role}"`
        : payload.isActive === true
          ? `activate ${workerLabel}`
          : `deactivate ${workerLabel}`

    const confirmed = window.confirm(`Are you sure you want to ${actionLabel}?`)
    if (!confirmed) {
      return
    }

    setSavingId(workerId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/workers/${workerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update worker')
      }

      setWorkers((current) =>
        current.map((worker) => (worker.id === workerId ? data : worker))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update worker')
    } finally {
      setSavingId(null)
    }
  }

  async function applyBulkUpdate(payload: Partial<Pick<WorkerRow, 'role' | 'isActive'>>) {
    if (selectedIds.length === 0) {
      setError('Select at least one worker first')
      return
    }

    const actionLabel =
      payload.role !== undefined
        ? `set role to "${payload.role}"`
        : payload.isActive === true
          ? 'activate'
          : 'deactivate'

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} for ${selectedIds.length} selected worker${selectedIds.length === 1 ? '' : 's'}?`
    )

    if (!confirmed) {
      return
    }

    setBulkSaving(true)
    setError(null)

    try {
      const updates = await Promise.all(
        selectedIds.map(async (workerId) => {
          const response = await fetch(`/api/admin/workers/${workerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          const data = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(data?.error || 'Failed to update selected workers')
          }

          return data as WorkerRow
        })
      )

      setWorkers((current) =>
        current.map((worker) => updates.find((updated) => updated.id === worker.id) || worker)
      )
      setSelectedIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update selected workers')
    } finally {
      setBulkSaving(false)
    }
  }

  function toggleSelected(workerId: string) {
    setSelectedIds((current) =>
      current.includes(workerId)
        ? current.filter((id) => id !== workerId)
        : [...current, workerId]
    )
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredWorkers.some((worker) => worker.id === id)))
      return
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredWorkers.map((worker) => worker.id)])))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Admin Staff</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{adminCount}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vendor Staff</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{vendorCount}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserCog className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Courier Staff</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{courierCount}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Route className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Workers</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{workers.filter((worker) => worker.isActive).length}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <UsersRound className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <AdminSectionCard
        title="Staff Role Control"
        description="Assign worker roles and control account access directly from this department."
        contentClassName="p-0"
        action={
          <>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              title="Filter workers by role"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin staff</option>
              <option value="vendor">Vendor staff</option>
              <option value="courier">Courier staff</option>
              <option value="user">General users</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              title="Filter workers by access"
            >
              <option value="all">All access</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff"
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none md:w-48"
              />
            </div>
            <select
              disabled={bulkSaving || selectedIds.length === 0}
              onChange={(event) => {
                const value = event.target.value
                if (!value) return
                void applyBulkUpdate({ role: value })
                event.target.value = ''
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 disabled:opacity-50"
              title="Bulk role update"
              defaultValue=""
            >
              <option value="" disabled>Bulk role</option>
              <option value="admin">Set Admin Staff</option>
              <option value="vendor">Set Vendor Staff</option>
              <option value="courier">Set Courier Staff</option>
              <option value="user">Set General User</option>
            </select>
            <button
              onClick={() => void applyBulkUpdate({ isActive: true })}
              disabled={bulkSaving || selectedIds.length === 0}
              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
            >
              Activate Selected
            </button>
            <button
              onClick={() => void applyBulkUpdate({ isActive: false })}
              disabled={bulkSaving || selectedIds.length === 0}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Deactivate Selected
            </button>
          </>
        }
      >
        {error ? (
          <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        ) : null}
        <AdminTableWrap>
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-4 w-4 rounded border-slate-300"
                    title="Select all filtered workers"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Name</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Current Role</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Role Control</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Access</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Workload</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No workers match the current filters.
                  </td>
                </tr>
              ) : filteredWorkers.map((worker) => {
                const busy = savingId === worker.id || bulkSaving
                return (
                  <tr key={worker.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(worker.id)}
                        onChange={() => toggleSelected(worker.id)}
                        className="h-4 w-4 rounded border-slate-300"
                        title="Select worker"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{worker.vendorName || worker.name || worker.email}</p>
                      <p className="text-xs text-slate-500">{worker.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <AdminBadge label={worker.role} tone={roleTone(worker.role)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={worker.role}
                          disabled={busy}
                          onChange={(event) => void updateWorker(worker.id, { role: event.target.value })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                          title="Worker role"
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => void updateWorker(worker.id, { isActive: !worker.isActive })}
                        disabled={busy}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                          worker.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {worker.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {worker._count.orders} orders | {worker._count.products} products | {worker._count.supportTickets} tickets
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </AdminTableWrap>
      </AdminSectionCard>
    </div>
  )
}
