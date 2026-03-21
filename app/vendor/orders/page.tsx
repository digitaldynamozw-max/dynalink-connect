'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { VendorSidebar } from '@/components/vendor-sidebar'
import { Package, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  status: string
  product: {
    id: string
    name: string
    image?: string
  }
}

interface Order {
  id: string
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
  user: {
    name: string
    email: string
  }
}

export default function VendorOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all')

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor/orders', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (session) {
      fetchOrders()
    }
  }, [session, fetchOrders])

  async function updateOrderStatus(orderId: string, itemId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/vendor/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: newStatus }),
        credentials: 'include',
      })

      if (response.ok) {
        // Update local state
        setOrders(orders.map(order =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map(item =>
                  item.id === itemId ? { ...item, status: newStatus } : item
                ),
              }
            : order
        ))
      }
    } catch (error) {
      console.error('Failed to update order status:', error)
      alert('Failed to update order status')
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.status === filter
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Package className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage and track your customer orders</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {orders.filter(o => o.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {orders.filter(o => o.status === 'completed').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                ${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2">
            {(['all', 'pending', 'completed', 'cancelled'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No orders</h2>
              <p className="text-gray-600">You don't have any orders with status "{filter}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Order Header */}
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Customer: {order.user.name} ({order.user.email})
                        </p>
                        <p className="text-sm text-gray-600">
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(order.status)}
                          <span className={`font-semibold capitalize ${
                            order.status === 'completed' ? 'text-green-600' :
                            order.status === 'pending' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
                    <div className="space-y-4">
                      {order.items.map(item => (
                        <div key={item.id} className="flex gap-4 items-start border border-gray-200 rounded-lg p-4">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            <p className="text-sm text-gray-900 font-semibold mt-1">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>

                          {/* Status Update */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.status}
                              onChange={e => updateOrderStatus(order.id, item.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              title="Update item status"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
