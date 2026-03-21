'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { VendorSidebar } from '@/components/vendor-sidebar'
import { DollarSign, Percent, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface Payout {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  processedAt?: string
  bankDetails?: {
    accountName: string
    accountNumber: string
  }
}

interface PayoutStats {
  totalEarnings: number
  pendingPayout: number
  completedPayouts: number
  failedPayouts: number
  lastPayoutDate?: string
  payouts: Payout[]
}

export default function PayoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchPayoutStats = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor/payouts', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else if (response.status === 401) {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Failed to fetch payout stats:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (session) {
      fetchPayoutStats()
    }
  }, [session, fetchPayoutStats])

  async function requestPayout() {
    setRequesting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payout request submitted successfully!' })
        await fetchPayoutStats()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Failed to request payout' })
      }
    } catch (error) {
      console.error('Failed to request payout:', error)
      setMessage({ type: 'error', text: 'An error occurred while requesting payout' })
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading payout information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Failed to load payout information</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <VendorSidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="text-gray-600 mt-1">Manage your earnings and payout requests</p>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Total Earnings</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">All-time earnings</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pending Payout</h3>
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${stats.pendingPayout.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">Available for withdrawal</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
                <ArrowDownLeft className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${stats.completedPayouts.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">Successfully paid out</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Commission Rate</h3>
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">10%</p>
              <p className="text-sm text-gray-600 mt-1">Platform fee per sale</p>
            </div>
          </div>

          {/* Request Payout */}
          {stats.pendingPayout >= 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Ready for Payout?</h3>
                  <p className="text-sm text-blue-800">
                    You have ${stats.pendingPayout.toFixed(2)} available. Minimum withdrawal is $100.
                  </p>
                </div>
                <button
                  onClick={requestPayout}
                  disabled={requesting || stats.pendingPayout < 100}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {requesting ? 'Processing...' : 'Request Payout'}
                </button>
              </div>
            </div>
          )}

          {stats.pendingPayout < 100 && stats.pendingPayout > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-yellow-900 mb-1">Minimum Withdrawal</h3>
              <p className="text-sm text-yellow-800">
                You need at least $100 to request a payout. Current: ${stats.pendingPayout.toFixed(2)}
                (${(100 - stats.pendingPayout).toFixed(2)} more needed)
              </p>
            </div>
          )}

          {/* Payout History */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Payout History</h2>
            </div>

            {stats.payouts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600">No payouts yet. Make your first payout request above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Requested Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Processed Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.payouts.map(payout => (
                      <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-gray-900">
                            ${payout.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              payout.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : payout.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : payout.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payout.processedAt
                            ? new Date(payout.processedAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
