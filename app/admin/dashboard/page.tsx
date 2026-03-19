'use client'

import { useEffect, useState } from 'react'
import { Users, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  activeUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ icon: Icon, label, value }: any) => (
    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {loading ? '—' : value}
          </p>
        </div>
        <Icon className="h-12 w-12 text-blue-600 opacity-20" />
      </div>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Total Clients" value={stats.totalUsers} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} />
        <StatCard icon={TrendingUp} label="Active Clients" value={stats.activeUsers} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/clients"
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
          >
            <span className="font-medium text-blue-900">Manage Clients</span>
            <Users className="h-5 w-5 text-blue-600" />
          </a>
          <a
            href="/admin/sales"
            className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
          >
            <span className="font-medium text-green-900">View Sales</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </a>
          <a
            href="/admin/products"
            className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition"
          >
            <span className="font-medium text-purple-900">Manage Products</span>
            <ShoppingCart className="h-5 w-5 text-purple-600" />
          </a>
        </div>
      </div>
    </div>
  )
}
