'use client'

import { useEffect, useState } from 'react'
import { Bell, DollarSign, ShoppingCart, TrendingUp, Truck, Users } from 'lucide-react'
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

interface Stats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  activeUsers: number
}

interface AdminNotification {
  id: string
  title: string
  message: string
  createdAt: string
}

interface AdminOrderItem {
  id: string
  quantity: number
  price: number
  status: string
  assignedCourierId?: string | null
  assignedCourierName?: string | null
  assignedCourierTracking?: {
    availability: string
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    lastSeenAt: string
    activeOrderItemId: string | null
  } | null
  estimatedDeliveryMinutes?: number | null
  deliveryFee: number
  proof?: {
    recipientName: string
    note: string
    photoUrl: string | null
    submittedAt: string
    latitude: number | null
    longitude: number | null
  } | null
  lateDelivery?: {
    isLate: boolean
    expectedBy: string | null
    minutesLate: number
  }
  product: {
    id: string
    name: string
  }
  vendor?: {
    id: string
    vendorName?: string | null
    storeAddress?: string | null
    storeCity?: string | null
    storeState?: string | null
  } | null
}

interface AdminOrder {
  id: string
  orderNumber?: string
  total: number
  status: string
  deliveryFee: number
  deliveryAddress?: string | null
  createdAt: string
  user: {
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    email: string
    mobileNumber?: string | null
  }
  items: AdminOrderItem[]
}

const STATUS_OPTIONS = [
  'pending',
  'accepted',
  'courier_on_the_way',
  'completed',
  'declined',
  'cancelled',
] as const

function formatStatus(status: string) {
  return status === 'courier_on_the_way' ? 'Courier On The Way' : status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusClasses(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800'
  if (status === 'courier_on_the_way') return 'bg-blue-100 text-blue-800'
  if (status === 'accepted') return 'bg-yellow-100 text-yellow-800'
  if (status === 'declined') return 'bg-red-200 text-red-900'
  if (status === 'cancelled') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function getCustomerName(order: AdminOrder) {
  const fullName = [order.user.firstName, order.user.lastName].filter(Boolean).join(' ')
  return fullName || order.user.name || order.user.email
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
  })
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof STATUS_OPTIONS)[number]>('all')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchDashboardData = async (markRead = false) => {
      try {
        const [statsRes, ordersRes, notificationsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/orders'),
          fetch('/api/admin/notifications'),
        ])

        if (statsRes.ok) {
          const nextStats = (await statsRes.json()) as Stats
          if (!cancelled) {
            setStats(nextStats)
          }
        }

        if (ordersRes.ok) {
          const nextOrders = (await ordersRes.json()) as AdminOrder[]
          if (!cancelled) {
            setOrders(nextOrders)
          }
        }

        if (notificationsRes.ok) {
          const nextNotifications = (await notificationsRes.json()) as AdminNotification[]
          if (!cancelled) {
            setNotifications(nextNotifications)
          }

          if (markRead) {
            await fetch('/api/admin/notifications', { method: 'PATCH' })
          }
        }
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchDashboardData(true)
    const intervalId = window.setInterval(() => {
      void fetchDashboardData(false)
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  async function updateOrderItemStatus(orderId: string, itemId: string, status: string) {
    setUpdatingItemId(itemId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          status,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order item status')
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) => {
          if (order.id !== orderId) {
            return order
          }

          const updatedItems = order.items.map((item) =>
            item.id === itemId ? { ...item, status } : item
          )

          const nextOrderStatus =
            updatedItems.every((item) => item.status === 'completed')
              ? 'completed'
              : updatedItems.every((item) => item.status === 'declined')
                ? 'declined'
                : updatedItems.every((item) => item.status === 'cancelled')
                  ? 'cancelled'
                  : updatedItems.some((item) => item.status === 'courier_on_the_way')
                    ? 'courier_on_the_way'
                    : updatedItems.some((item) => item.status === 'accepted')
                      ? 'accepted'
                      : 'pending'

          return {
            ...order,
            status: nextOrderStatus,
            items: updatedItems,
          }
        })
      )

      const notificationsRes = await fetch('/api/admin/notifications')
      if (notificationsRes.ok) {
        setNotifications((await notificationsRes.json()) as AdminNotification[])
        await fetch('/api/admin/notifications', { method: 'PATCH' })
      }
    } catch (error) {
      console.error('Admin order status update failed:', error)
      alert('Failed to update order status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === statusFilter)

  const statusCounts = {
    pending: orders.filter((order) => order.status === 'pending').length,
    accepted: orders.filter((order) => order.status === 'accepted').length,
    courier_on_the_way: orders.filter((order) => order.status === 'courier_on_the_way').length,
    completed: orders.filter((order) => order.status === 'completed').length,
    declined: orders.filter((order) => order.status === 'declined').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  }

  async function exportOrders() {
    setExporting(true)
    try {
      const response = await fetch('/api/admin/orders/export')
      if (!response.ok) {
        throw new Error('Failed to export orders')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export orders:', error)
      alert('Failed to export orders')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="theme-panel overflow-hidden rounded-[1.35rem]">
        <AdminPageHeader
          title="Admin Dashboard"
          description="Monitor vendor orders, manage fulfillment progress, and review status updates."
          action={
            <button
              onClick={() => void exportOrders()}
              disabled={exporting}
              className="theme-accent-btn inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : 'Export Orders to Excel'}
            </button>
          }
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard icon={Users} label="Total Clients" value={loading ? '-' : stats.totalUsers} helper="Registered marketplace users" />
            <AdminStatCard icon={ShoppingCart} label="Total Orders" value={loading ? '-' : stats.totalOrders} helper="Orders tracked in admin" />
            <AdminStatCard icon={DollarSign} label="Total Revenue" value={loading ? '-' : `$${stats.totalRevenue.toFixed(2)}`} helper="Gross revenue to date" />
            <AdminStatCard icon={TrendingUp} label="Active Clients" value={loading ? '-' : stats.activeUsers} helper="Currently active accounts" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard
              title="All Vendor Orders"
              description="Track fulfillment and delivery progression across all stores."
              className=""
              action={
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusFilter === 'all' ? 'theme-accent-btn text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusFilter === status ? 'theme-accent-btn text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {formatStatus(status)} ({statusCounts[status]})
                    </button>
                  ))}
                </div>
              }
            >
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-[var(--brand-highlight)]" />
                <span className="text-sm font-medium text-slate-600">Filtered order stream</span>
              </div>

              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders yet.</p>
                ) : (
                  filteredOrders.map((order) => (
                      <div key={order.id} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-strong)]">
                      <div className="flex flex-col gap-2 bg-[var(--brand-accent-soft)]/40 px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">Order #{order.orderNumber || order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">
                            {getCustomerName(order)} | {order.user.email}
                          </p>
                          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <p className="mt-2 text-sm text-gray-700">Delivery Address: {order.deliveryAddress || 'N/A'}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">Total ${order.total.toFixed(2)}</p>
                        </div>
                      </div>

                      <AdminTableWrap>
                        <table className="min-w-full">
                          <thead className="border-b border-t border-[var(--border)] bg-white/75">
                            <tr>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Vendor</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Product</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Qty</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">ETA</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Courier</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Status</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500">Update</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id} className="border-b border-gray-100">
                                <td className="px-3 py-2 text-xs text-gray-700">{item.vendor?.vendorName || 'Admin Store'}</td>
                                <td className="px-3 py-2 text-xs text-gray-700">{item.product.name}</td>
                                <td className="px-3 py-2 text-xs text-gray-700">{item.quantity}</td>
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {typeof item.estimatedDeliveryMinutes === 'number'
                                    ? `${item.estimatedDeliveryMinutes} min`
                                    : 'N/A'}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  <p>{item.assignedCourierName || 'Unassigned'}</p>
                                  {item.assignedCourierTracking ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      {item.assignedCourierTracking.availability} · {new Date(item.assignedCourierTracking.lastSeenAt).toLocaleTimeString()}
                                    </p>
                                  ) : null}
                                  {item.proof ? (
                                    <p className="mt-1 text-[11px] text-emerald-600">
                                      Delivered to {item.proof.recipientName}
                                    </p>
                                  ) : null}
                                  {item.lateDelivery?.isLate ? (
                                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                                      Late by {item.lateDelivery.minutesLate} min
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(item.status)}`}>
                                    {formatStatus(item.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  <select
                                    value={item.status}
                                    disabled={updatingItemId === item.id}
                                    onChange={(event) =>
                                      updateOrderItemStatus(order.id, item.id, event.target.value)
                                    }
                                    className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                                    title="Update order item status"
                                  >
                                    {STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status}>
                                        {formatStatus(status)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </AdminTableWrap>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Status Notifications" description="Latest order status changes and admin alerts.">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-600">Notifications</span>
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">No order status changes yet.</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
