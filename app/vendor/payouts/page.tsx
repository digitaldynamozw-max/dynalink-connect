'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, DollarSign, Download, Percent } from 'lucide-react'
import { VendorSidebar } from '@/components/vendor-sidebar'

interface Payout {
  id: string
  amount: number
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected'
  createdAt: string
  processedAt?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
}

interface CompletedSale {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: string
  productName: string
  quantity: number
  vendorEarnings: number
  payoutStatus: string
  completedAt: string
}

interface PayoutStats {
  totalEarnings: number
  pendingPayout: number
  requestedPayouts: number
  completedPayouts: number
  failedPayouts: number
  completedSalesTotal: number
  lastPayoutDate?: string | null
  payouts: Payout[]
  recentCompletedSales: CompletedSale[]
  commissionRate?: number
}

function formatCurrency(value: number | null | undefined) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return normalized.toFixed(2)
}

export default function PayoutPage() {
  const minimumPayout = 5
  const { data: session, status } = useSession()
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
        setStats(await response.json())
      } else if (response.status === 401) {
        router.push('/auth/signin')
      } else {
        const payload = await response.json().catch(() => null)
        setMessage({ type: 'error', text: payload?.error || 'Failed to load payout information' })
      }
    } catch (error) {
      console.error('Failed to fetch payout stats:', error)
      setMessage({ type: 'error', text: 'Failed to load payout information' })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    void fetchPayoutStats()
  }, [fetchPayoutStats, router, session, status])

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
        setMessage({ type: 'success', text: 'Payout request submitted successfully.' })
        await fetchPayoutStats()
      } else {
        const error = await response.json().catch(() => null)
        setMessage({ type: 'error', text: error?.message || error?.error || 'Failed to request payout' })
      }
    } catch (error) {
      console.error('Failed to request payout:', error)
      setMessage({ type: 'error', text: 'An error occurred while requesting payout' })
    } finally {
      setRequesting(false)
    }
  }

  async function downloadStatement() {
    const response = await fetch('/api/vendor/statements', {
      credentials: 'include',
    })

    if (!response.ok) {
      setMessage({ type: 'error', text: 'Failed to download statement' })
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vendor-statement-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="ml-64 flex min-h-screen flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
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
        <div className="ml-64 flex min-h-screen flex-1 items-center justify-center bg-gray-50">
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
      <div className="ml-64 min-h-screen flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="mt-1 text-gray-600">Manage completed sales, your available ledger balance, and payout requests.</p>
            <button
              onClick={() => void downloadStatement()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Download Statement
            </button>
          </div>

          {message ? (
            <div
              className={`mb-6 rounded-lg border p-4 ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Total Earnings</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${formatCurrency(stats.totalEarnings)}</p>
              <p className="mt-1 text-sm text-gray-600">Sales credited to your ledger</p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Available</h3>
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${formatCurrency(stats.pendingPayout)}</p>
              <p className="mt-1 text-sm text-gray-600">Available to request right now</p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Awaiting Approval</h3>
                <ArrowDownLeft className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${formatCurrency(stats.requestedPayouts)}</p>
              <p className="mt-1 text-sm text-gray-600">Held while admin reviews</p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Commission Rate</h3>
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.commissionRate ?? 10}%</p>
              <p className="mt-1 text-sm text-gray-600">Added on top of the store price</p>
            </div>
          </div>

          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Completed Sales</h3>
                <p className="mt-3 text-3xl font-bold text-gray-900">${formatCurrency(stats.completedSalesTotal)}</p>
                <p className="mt-1 text-sm text-gray-600">Delivered sales now visible in your ledger</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Completed Payouts</h3>
                <p className="mt-3 text-3xl font-bold text-gray-900">${formatCurrency(stats.completedPayouts)}</p>
                <p className="mt-1 text-sm text-gray-600">Successfully paid out after approval</p>
              </div>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Completed Sales</h2>
              <p className="mt-1 text-sm text-gray-600">The latest completed order lines feeding your balance.</p>
            </div>

            {stats.recentCompletedSales.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600">No completed sales have been recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Vendor Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Ledger Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Completed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCompletedSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">#{sale.orderNumber}</div>
                          <div className="text-xs text-gray-500">{sale.orderStatus}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{sale.productName}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{sale.quantity}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                          ${formatCurrency(sale.vendorEarnings)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{sale.payoutStatus}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {new Date(sale.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {stats.pendingPayout >= minimumPayout ? (
            <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="mb-1 font-semibold text-blue-900">Ready for Payout?</h3>
                  <p className="text-sm text-blue-800">
                    You have ${formatCurrency(stats.pendingPayout)} available. Minimum withdrawal is $${formatCurrency(minimumPayout)}.
                  </p>
                </div>
                <button
                  onClick={() => void requestPayout()}
                  disabled={requesting || stats.pendingPayout < minimumPayout}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {requesting ? 'Processing...' : 'Request Payout'}
                </button>
              </div>
            </div>
          ) : null}

          {stats.pendingPayout < minimumPayout && stats.pendingPayout > 0 ? (
            <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h3 className="mb-1 font-semibold text-yellow-900">Minimum Withdrawal</h3>
              <p className="text-sm text-yellow-800">
                You need at least $${formatCurrency(minimumPayout)} to request a payout. Current: ${formatCurrency(stats.pendingPayout)}
                {' '}(${formatCurrency(minimumPayout - stats.pendingPayout)} more needed)
              </p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Payout History</h2>
            </div>

            {stats.payouts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600">No payouts yet. Make your first payout request above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Requested Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                        Processed Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-lg font-semibold text-gray-900">
                            ${formatCurrency(payout.amount)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              payout.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : payout.status === 'requested'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : payout.status === 'approved'
                                    ? 'bg-blue-100 text-blue-800'
                                    : payout.status === 'processing'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {payout.processedAt
                            ? new Date(payout.processedAt).toLocaleDateString()
                            : '-'}
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
