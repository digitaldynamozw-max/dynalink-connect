'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react'

export default function AdminVendorsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all')

  useEffect(() => {
    if (session?.user && (session.user as any).role !== 'admin') {
      router.push('/')
      return
    }

    fetchVendors()
  }, [session])

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors')
      if (res.ok) {
        setVendors(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (vendorId: string, verified: boolean) => {
    setProcessing(vendorId)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          verified,
          reason: verified ? 'Approved by admin' : 'Rejected by admin'
        })
      })

      if (res.ok) {
        const response = await res.json()
        setVendors(vendors.map(v => v.id === vendorId ? { ...v, vendorVerified: verified } : v))
        alert(response.message)
      } else {
        alert('Failed to update vendor')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating vendor')
    } finally {
      setProcessing(null)
    }
  }

  const handleImpersonate = async (vendorId: string) => {
    setProcessing(vendorId)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      })

      if (res.ok) {
        // Redirect to vendor dashboard
        router.push('/vendor/dashboard')
      } else {
        alert('Failed to impersonate vendor')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error impersonating vendor')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = vendors.filter(v => {
    if (filter === 'pending') return !v.vendorVerified
    if (filter === 'verified') return v.vendorVerified
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Vendor Management</h1>
          <p className="text-gray-600">Review and approve vendor registrations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900">{vendors.length}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Verified</p>
                <p className="text-3xl font-bold text-green-600">
                  {vendors.filter(v => v.vendorVerified).length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {vendors.filter(v => !v.vendorVerified).length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Vendors
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'verified'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Verified
            </button>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Vendor Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Products</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Orders</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((vendor: any) => (
                    <tr key={vendor.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {vendor.vendorName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {vendor.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {vendor.storeCity}, {vendor.storeState}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        {vendor._count.products}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        {vendor._count.orders}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(vendor.vendorJoinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {vendor.vendorVerified ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                            <Clock className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex flex-wrap gap-2">
                        {!vendor.vendorVerified && (
                          <>
                            <button
                              onClick={() => handleVerify(vendor.id, true)}
                              disabled={processing === vendor.id}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              {processing === vendor.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleVerify(vendor.id, false)}
                              disabled={processing === vendor.id}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {vendor.vendorVerified && (
                          <button
                            onClick={() => handleVerify(vendor.id, false)}
                            disabled={processing === vendor.id}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleImpersonate(vendor.id)}
                          disabled={processing === vendor.id}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                          title="View as vendor to help them with their dashboard"
                        >
                          <Eye className="h-3 w-3" />
                          View As
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No vendors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
