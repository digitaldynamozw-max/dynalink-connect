'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart3, ShoppingCart, TrendingUp, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  salesCount: number
  price: number
  rating: number
}

interface Analytics {
  totalSales: number
  totalOrders: number
  totalItems: number
  averageOrderValue: number
  topProducts: Product[]
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics', {
        credentials: 'include',
      })

      if (response.status === 403) {
        router.push('/auth/signin')
        return
      }

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (session?.user?.email) {
      fetchAnalytics()
    }
  }, [session?.user?.email, fetchAnalytics])

  if (loading) {
    return <div className="p-4">Loading analytics...</div>
  }

  if (!analytics) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Sales and performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Sales</h3>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${analytics.totalSales.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-2">All-time revenue</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
          <p className="text-sm text-gray-600 mt-2">Orders placed</p>
        </div>

        {/* Total Items Sold */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Items Sold</h3>
            <Package className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalItems}</p>
          <p className="text-sm text-gray-600 mt-2">Products sold</p>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Avg Order Value</h3>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${analytics.averageOrderValue.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-2">Average per order</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Top Performing Products</h2>
          <p className="text-gray-600 text-sm mt-1">Products with highest sales count</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Units Sold</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rating</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts.map((product, index) => (
                <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.salesCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-900">{product.rating.toFixed(1)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
