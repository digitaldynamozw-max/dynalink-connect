'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, DollarSign, Edit, Lock, RotateCcw, Search, Trash2, Unlock, Users, Wallet, X } from 'lucide-react'
import { AdminBadge, AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

interface User {
  id: string
  email: string
  name: string
  vendorName?: string
  role: string
  accountBalance: number
  isActive?: boolean
  createdAt: string
}

type AccountFilter = 'all' | 'clients' | 'vendors' | 'active' | 'blocked'

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default function ClientsPage() {
  const [clients, setClients] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [showCreditModal, setShowCreditModal] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [passwordReset, setPasswordReset] = useState<string | null>(null)
  const [creditLoading, setCreditLoading] = useState(false)
  const [creditError, setCreditError] = useState<string | null>(null)
  const [creditSuccess, setCreditSuccess] = useState(false)
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    void fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = (await res.json()) as User[]
        setClients(data)
      } else {
        setError(`Failed to load clients: ${res.status}`)
      }
    } catch (err) {
      setError(`Error fetching clients: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditStart = (client: User) => {
    setEditingId(client.id)
    setEditForm(client)
  }

  const handleEditSave = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        setEditingId(null)
        await fetchClients()
      } else {
        setError('Failed to update client')
      }
    } catch {
      setError('Error updating client')
    }
  }

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (res.ok) {
        await fetchClients()
      } else {
        setError('Failed to update client status')
      }
    } catch {
      setError('Error updating client')
    }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${id}/reset-password`, {
        method: 'POST',
      })

      if (res.ok) {
        setPasswordReset(id)
        window.setTimeout(() => setPasswordReset(null), 3000)
      } else {
        setError('Failed to reset password')
      }
    } catch {
      setError('Error resetting password')
    }
  }

  const handleAddCredit = async (id: string) => {
    setCreditError(null)
    const amount = Number.parseFloat(creditAmount)

    if (!creditAmount || Number.isNaN(amount) || amount <= 0) {
      setCreditError('Please enter a valid amount greater than 0')
      return
    }

    setCreditLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      if (res.ok) {
        setCreditSuccess(true)
        setShowCreditModal(null)
        setCreditAmount('')
        await fetchClients()
        window.setTimeout(() => setCreditSuccess(false), 3000)
      } else {
        const data = await res.json().catch(() => null)
        setCreditError(data?.error || 'Failed to add credit')
      }
    } catch (err) {
      setCreditError((err as Error).message || 'Error adding credit')
    } finally {
      setCreditLoading(false)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchClients()
      } else {
        setError('Failed to delete client')
      }
    } catch {
      setError('Error deleting client')
    }
  }

  const totalAccounts = clients.length
  const vendorAccounts = clients.filter((client) => client.role === 'vendor').length
  const clientAccounts = clients.filter((client) => client.role === 'user').length
  const activeAccounts = clients.filter((client) => client.isActive !== false).length
  const blockedAccounts = clients.filter((client) => client.isActive === false).length
  const totalBalance = clients.reduce((sum, client) => sum + client.accountBalance, 0)

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return clients.filter((client) => {
      if (accountFilter === 'clients' && client.role !== 'user') return false
      if (accountFilter === 'vendors' && client.role !== 'vendor') return false
      if (accountFilter === 'active' && client.isActive === false) return false
      if (accountFilter === 'blocked' && client.isActive !== false) return false

      if (!normalizedSearch) {
        return true
      }

      const haystack = `${client.name || ''} ${client.vendorName || ''} ${client.email}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [accountFilter, clients, search])

  const reviewQueue = filteredClients.slice(0, 5)
  const topBalances = [...clients].sort((left, right) => right.accountBalance - left.accountBalance).slice(0, 5)

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading clients...</div>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Client Management"
          description="Customer and vendor account oversight, balance visibility, and account access control."
          action={
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search accounts"
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none md:w-44"
                />
              </div>
              <select
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value as AccountFilter)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="all">All accounts</option>
                <option value="clients">Clients only</option>
                <option value="vendors">Vendors only</option>
                <option value="active">Active only</option>
                <option value="blocked">Blocked only</option>
              </select>
              <button
                onClick={() => {
                  window.location.href = '/admin/clients/export'
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Export Clients
              </button>
            </>
          }
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Total Accounts" value={totalAccounts} helper="Combined clients and vendors" icon={Users} />
            <AdminStatCard label="Clients" value={clientAccounts} helper="Customer accounts in the marketplace" icon={Users} />
            <AdminStatCard label="Vendors" value={vendorAccounts} helper="Vendor-linked accounts" icon={Users} />
            <AdminStatCard label="Active Access" value={activeAccounts} helper={`${blockedAccounts} accounts are currently blocked`} icon={Check} />
            <AdminStatCard label="Stored Balance" value={`$${totalBalance.toFixed(2)}`} helper="Combined wallet balances" icon={Wallet} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <AdminSectionCard title="Accounts" description={`${filteredClients.length} records in the current view`} contentClassName="p-0">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Name</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Email</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Balance</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <AdminEmptyState message="No accounts match the current filters." />
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2">
                            {editingId === client.id ? (
                              <input
                                type="text"
                                value={editForm.name || ''}
                                onChange={(event) => {
                                  setEditForm({ ...editForm, name: event.target.value })
                                }}
                                className="w-40 rounded-lg border border-slate-200 px-2 py-1"
                                title="Client name"
                                placeholder="Client name"
                              />
                            ) : (
                              <>
                                <div className="font-semibold text-slate-900">{client.name || client.vendorName || client.email}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {client.role === 'vendor' ? 'Vendor account' : 'Client account'} | Joined {formatJoinedDate(client.createdAt)}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">{client.email}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-blue-600">${client.accountBalance.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <AdminBadge
                              label={client.isActive !== false ? 'Active' : 'Blocked'}
                              tone={client.isActive !== false ? 'green' : 'red'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              {editingId === client.id ? (
                                <>
                                  <button
                                    onClick={() => void handleEditSave(client.id)}
                                    className="font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="text-slate-600 hover:text-slate-800"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditStart(client)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => void handleToggleStatus(client.id, client.isActive !== false)}
                                    className={
                                      client.isActive !== false
                                        ? 'text-red-600 hover:text-red-800'
                                        : 'text-green-600 hover:text-green-800'
                                    }
                                    title={client.isActive !== false ? 'Block' : 'Activate'}
                                  >
                                    {client.isActive !== false ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={() => void handleResetPassword(client.id)}
                                    className="text-orange-600 hover:text-orange-800"
                                    title="Reset Password"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setShowCreditModal(client.id)}
                                    className="text-green-600 hover:text-green-800"
                                    title="Add Credit"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteClient(client.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <div className="space-y-4">
              <AdminSectionCard title="Review Queue" description="Five compact account cards for quick follow-up.">
                <div className="grid gap-3">
                  {reviewQueue.length === 0 ? (
                    <AdminEmptyState message="No accounts are visible in the current review queue." />
                  ) : (
                    reviewQueue.map((client) => (
                      <div key={client.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{client.name || client.vendorName || client.email}</p>
                            <p className="mt-1 text-sm text-slate-500">{client.email}</p>
                          </div>
                          <AdminBadge label={client.role === 'vendor' ? 'Vendor' : 'Client'} tone={client.role === 'vendor' ? 'green' : 'blue'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{client.isActive !== false ? 'Access active' : 'Blocked'}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">${client.accountBalance.toFixed(2)} balance</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{formatJoinedDate(client.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Top Balances" description="Accounts currently holding the largest wallet values.">
                <div className="grid gap-3">
                  {topBalances.length === 0 ? (
                    <AdminEmptyState message="No balances are available yet." />
                  ) : (
                    topBalances.map((client) => (
                      <div key={client.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{client.name || client.vendorName || client.email}</p>
                          <p className="text-sm text-slate-500">{client.role === 'vendor' ? 'Vendor account' : 'Client account'}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">${client.accountBalance.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </AdminSectionCard>
            </div>
          </div>
        </div>
      </div>

      {showCreditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add Credit</h2>

            {creditError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {creditError}
              </div>
            ) : null}

            <input
              type="number"
              placeholder="Amount"
              value={creditAmount}
              onChange={(event) => setCreditAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !creditLoading) {
                  void handleAddCredit(showCreditModal)
                }
              }}
              disabled={creditLoading}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
              min="0.01"
              step="0.01"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void handleAddCredit(showCreditModal)}
                disabled={creditLoading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creditLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowCreditModal(null)
                  setCreditAmount('')
                  setCreditError(null)
                }}
                disabled={creditLoading}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {creditSuccess ? (
        <div className="fixed right-4 top-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
          Credit added successfully!
        </div>
      ) : null}

      {passwordReset ? (
        <div className="fixed right-4 top-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
          Password reset email sent!
        </div>
      ) : null}
    </div>
  )
}
