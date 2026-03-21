'use client'

import { useEffect, useState } from 'react'
import { Edit, Lock, Unlock, RotateCcw, DollarSign, Trash2, Check, X } from 'lucide-react'

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
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = await res.json()
        console.log('Loaded clients:', data.length)
        setClients(data)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('API error:', res.status, errorData)
        setError(`Failed to load clients: ${res.status}`)
      }
    } catch (err) {
      console.error('Fetch error:', err)
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
        body: JSON.stringify(editForm)
      })

      if (res.ok) {
        setEditingId(null)
        fetchClients()
      } else {
        setError('Failed to update client')
      }
    } catch (err) {
      setError('Error updating client')
    }
  }

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (res.ok) {
        fetchClients()
      } else {
        setError('Failed to update client status')
      }
    } catch (err) {
      setError('Error updating client')
    }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${id}/reset-password`, {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        setPasswordReset(id)
        setTimeout(() => setPasswordReset(null), 3000)
      } else {
        setError('Failed to reset password')
      }
    } catch (err) {
      setError('Error resetting password')
    }
  }

  const handleAddCredit = async (id: string) => {
    setCreditError(null)
    const amount = parseFloat(creditAmount)

    if (!creditAmount || isNaN(amount) || amount <= 0) {
      setCreditError('Please enter a valid amount greater than 0')
      return
    }

    setCreditLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })

      if (res.ok) {
        setCreditSuccess(true)
        setShowCreditModal(null)
        setCreditAmount('')
        fetchClients()
        setTimeout(() => setCreditSuccess(false), 3000)
      } else {
        const data = await res.json()
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
        method: 'DELETE'
      })

      if (res.ok) {
        fetchClients()
      } else {
        setError('Failed to delete client')
      }
    } catch (err) {
      setError('Error deleting client')
    }
  }

  if (loading) return <div className="text-center py-8">Loading clients...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Client Management</h1>
        <button
          onClick={() => window.location.href = '/admin/clients/export'}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export Clients
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Balance</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">No clients or vendors found</p>
                      <p className="text-sm">Clients and vendors will appear here once they register</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        {editingId === client.id ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="border rounded px-2 py-1 w-40"
                            title="Client name"
                            placeholder="Client name"
                          />
                        ) : (
                          <>
                            <div className="font-semibold">{client.name || client.vendorName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {client.role === 'vendor' ? '🏪 Vendor' : '👤 Client'}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  <td className="px-6 py-4">{client.email}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600">
                    ${client.accountBalance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
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
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {editingId === client.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(client.id)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-800"
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
                            onClick={() =>
                              handleToggleStatus(client.id, client.isActive !== false)
                            }
                            className={
                              client.isActive !== false
                                ? 'text-red-600 hover:text-red-800'
                                : 'text-green-600 hover:text-green-800'
                            }
                            title={
                              client.isActive !== false ? 'Block' : 'Activate'
                            }
                          >
                            {client.isActive !== false ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleResetPassword(client.id)}
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
                            onClick={() => handleDeleteClient(client.id)}
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
        </div>
      </div>

      {showCreditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Add Credit</h2>
            
            {creditError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                {creditError}
              </div>
            )}

            <input
              type="number"
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !creditLoading) {
                  handleAddCredit(showCreditModal)
                }
              }}
              disabled={creditLoading}
              className="w-full border rounded px-3 py-2 mb-4 disabled:bg-gray-100"
              min="0.01"
              step="0.01"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleAddCredit(showCreditModal)}
                disabled={creditLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {creditSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Credit added successfully!
        </div>
      )}

      {passwordReset && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Password reset email sent!
        </div>
      )}
    </div>
  )
}
