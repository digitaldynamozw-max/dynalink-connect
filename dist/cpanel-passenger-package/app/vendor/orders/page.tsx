'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { VendorSidebar } from '@/components/vendor-sidebar'
import { Package, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface VendorOrderApiItem {
  id: string
  orderId: string
  orderNumber?: string
  quantity: number
  price: number
  status: string
  selectedOptionsSummary?: string | null
  product: {
    id: string
    name: string
    image?: string
  }
  order: {
    id: string
    total: number
    status: string
    createdAt: string
    user: {
      name?: string | null
      email: string
    }
  }
  exceptions?: Array<{
    type: string
    note: string
    createdAt: string
    resolutionStatus: string
  }>
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  status: string
  selectedOptionsSummary?: string | null
  product: {
    id: string
    name: string
    image?: string
  }
  exceptions?: Array<{
    type: string
    note: string
    createdAt: string
    resolutionStatus: string
  }>
}

interface Order {
  id: string
  orderNumber?: string
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
  user: {
    name: string
    email: string
  }
}

type VendorOrderFilter = 'all' | 'pending' | 'accepted' | 'completed' | 'declined' | 'cancelled'

function deriveOrderStatus(items: OrderItem[]) {
  const statuses = items.map((item) => item.status)

  if (statuses.every((status) => status === 'completed')) return 'completed'
  if (statuses.every((status) => status === 'declined')) return 'declined'
  if (statuses.every((status) => status === 'cancelled')) return 'cancelled'
  if (statuses.some((status) => status === 'accepted')) return 'accepted'
  return 'pending'
}

function groupVendorOrders(items: VendorOrderApiItem[]): Order[] {
  const grouped = new Map<string, Order>()

  for (const item of items) {
    const existing = grouped.get(item.orderId)
    const nextItem: OrderItem = {
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      status: item.status,
      selectedOptionsSummary: item.selectedOptionsSummary,
      product: item.product,
      exceptions: item.exceptions || [],
    }

    if (existing) {
      existing.items.push(nextItem)
      existing.status = deriveOrderStatus(existing.items)
      continue
    }

    grouped.set(item.orderId, {
      id: item.order.id,
      orderNumber: item.orderNumber,
      total: item.order.total,
      status: deriveOrderStatus([nextItem]),
      createdAt: item.order.createdAt,
      items: [nextItem],
      user: {
        name: item.order.user.name || item.order.user.email,
        email: item.order.user.email,
      },
    })
  }

  return Array.from(grouped.values())
}

function formatStatus(status: string) {
  switch (status) {
    case 'declined':
      return 'Declined'
    case 'accepted':
      return 'Accepted'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

export default function VendorOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<VendorOrderFilter>('all')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor/orders', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as VendorOrderApiItem[]
        setOrders(Array.isArray(data) ? groupVendorOrders(data) : [])
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
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    void fetchOrders()
  }, [fetchOrders, router, session, status])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const intervalId = window.setInterval(fetchOrders, 30000)
    return () => window.clearInterval(intervalId)
  }, [fetchOrders, status])

  async function updateOrderStatus(orderId: string, itemId: string, newStatus: string) {
    setUpdatingItemId(itemId)
    try {
      const response = await fetch(`/api/vendor/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId], status: newStatus }),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to update order status')
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) => {
          if (order.id !== orderId) {
            return order
          }

          const nextItems = order.items.map((item) =>
            item.id === itemId ? { ...item, status: newStatus } : item
          )

          return {
            ...order,
            status: deriveOrderStatus(nextItems),
            items: nextItems,
          }
        })
      )
    } catch (error) {
      console.error('Failed to update order status:', error)
      alert(error instanceof Error ? error.message : 'Failed to update order status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const filteredOrders = orders.filter((order) => (filter === 'all' ? true : order.status === filter))

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'accepted':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'declined':
        return <AlertCircle className="h-5 w-5 text-red-700" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Package className="h-5 w-5 text-gray-400" />
    }
  }

  if (status === 'loading' || loading) {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">
              Manage order acceptance and fulfillment. Delivery updates are handled by admin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {orders.filter((order) => order.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Accepted</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {orders.filter((order) => order.status === 'accepted').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {orders.filter((order) => order.status === 'completed').length}
              </p>
            </div>
          </div>

          <div className="mb-6 flex gap-2 flex-wrap">
            {(['all', 'pending', 'accepted', 'completed', 'declined', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? 'All' : formatStatus(status)}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No orders</h2>
              <p className="text-gray-600">
                You don&apos;t have any orders with status &quot;{filter}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber || order.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Customer: {order.user.name} ({order.user.email})
                        </p>
                        <p className="text-sm text-gray-600">
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2 justify-end">
                          {getStatusIcon(order.status)}
                          <span
                            className={`font-semibold ${
                              order.status === 'completed'
                                ? 'text-green-600'
                                : order.status === 'accepted'
                                  ? 'text-yellow-600'
                                  : order.status === 'declined'
                                    ? 'text-red-700'
                                    : order.status === 'pending'
                                      ? 'text-orange-600'
                                      : 'text-red-600'
                            }`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 items-start border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            {item.selectedOptionsSummary ? (
                              <p className="text-xs text-slate-500">{item.selectedOptionsSummary}</p>
                            ) : null}
                            <p className="text-sm text-gray-900 font-semibold mt-1">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            {item.exceptions?.length ? (
                              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                Latest exception: {item.exceptions[0]?.type.replaceAll('_', ' ')} · {item.exceptions[0]?.note}
                              </div>
                            ) : null}
                          </div>

                          <div className="w-full max-w-xs">
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                              Fulfillment status
                            </label>
                            <select
                              value={item.status}
                              disabled={updatingItemId === item.id}
                              onChange={(event) =>
                                updateOrderStatus(order.id, item.id, event.target.value)
                              }
                              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              title="Update item status"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="completed">Completed</option>
                              <option value="declined">Declined</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500">
                              Delivery dispatch and courier progress are managed by admin.
                            </p>
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
