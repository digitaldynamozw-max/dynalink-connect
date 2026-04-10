'use client'

import { useEffect, useState } from 'react'
import { Check, DollarSign, Edit, Lock, RotateCcw, Trash2, Unlock, X } from 'lucide-react'
import { AdminPageHeader, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

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

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading clients...</div>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Client Management"
          description="Manage customers and vendor accounts, balances, and account access."
          action={
            <button
              onClick={() => {
                window.location.href = '/admin/clients/export'
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Export Clients
            </button>
          }
        />

        <div className="p-3.5 sm:p-4">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <AdminSectionCard title="Accounts" description={`${clients.length} total records`} contentClassName="p-0">
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
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <div className="space-y-1">
                          <p className="font-semibold">No clients or vendors found</p>
                          <p className="text-sm">Clients and vendors will appear here once they register.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
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
                              <div className="font-semibold text-slate-900">{client.name || client.vendorName}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {client.role === 'vendor' ? 'Vendor' : 'Client'}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">{client.email}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-blue-600">${client.accountBalance.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                              client.isActive !== false
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {client.isActive !== false ? (
                              <>
                                <Check className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" /> Blocked
                              </>
                            )}
                          </span>
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
                                  {client.isActive !== false ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <Unlock className="h-4 w-4" />
                                  )}
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
