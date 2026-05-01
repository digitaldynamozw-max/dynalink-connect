'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Package } from 'lucide-react'
import { formatOrderReceiptNumber } from '@/lib/order-reference'
import { formatOrderItemStatus, getOrderStatusTone } from '@/lib/order-status'
import {
  VendorWorkspaceHeader,
  VendorWorkspaceShell,
  VendorWorkspaceStat,
} from '@/components/vendor-workspace'

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
  }
  customerName?: string
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
  }
}

type VendorOrderFilter = 'all' | 'pending' | 'accepted' | 'courier_on_the_way' | 'completed' | 'declined' | 'cancelled'

function deriveOrderStatus(items: OrderItem[]) {
  const statuses = items.map((item) => item.status)

  if (statuses.every((status) => status === 'completed')) return 'completed'
  if (statuses.every((status) => status === 'declined')) return 'declined'
  if (statuses.every((status) => status === 'cancelled')) return 'cancelled'
  if (statuses.some((status) => status === 'courier_on_the_way')) return 'courier_on_the_way'
  if (statuses.some((status) => status === 'arrived_at_vendor')) return 'accepted'
  if (statuses.some((status) => status === 'courier_assigned')) return 'accepted'
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
        name: item.customerName || 'Customer',
      },
    })
  }

  return Array.from(grouped.values())
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
  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return <Clock className="h-5 w-5 text-[#9a7423]" />
      case 'accepted':
        return <Clock className="h-5 w-5 text-[var(--brand-accent-strong)]" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-700" />
      case 'declined':
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-700" />
      default:
        return <Package className="h-5 w-5 text-[var(--muted)]" />
    }
  }

  if (status === 'loading' || loading) {
    return (
      <VendorWorkspaceShell contentClassName="flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]"></div>
            <p className="text-[var(--muted)]">Loading orders...</p>
          </div>
      </VendorWorkspaceShell>
    )
  }

  return (
    <VendorWorkspaceShell>
      <VendorWorkspaceHeader
        eyebrow="Order Queue"
        title="Review and hand orders into dispatch."
        description="Manage order acceptance here. After an item is accepted, courier assignment and trip completion move to the dispatch side."
        stats={
          <>
            <VendorWorkspaceStat label="Total Orders" value={orders.length} />
            <VendorWorkspaceStat label="Pending" value={orders.filter((order) => order.status === 'pending').length} helper="Needs vendor action" />
            <VendorWorkspaceStat label="Accepted" value={orders.filter((order) => order.status === 'accepted').length} helper="Waiting on dispatch" />
            <VendorWorkspaceStat label="Completed" value={orders.filter((order) => order.status === 'completed').length} helper="Delivered successfully" />
          </>
        }
      />

      <div className="mt-6">

          <div className="mb-6 flex flex-wrap gap-2">
            {(['all', 'pending', 'accepted', 'courier_on_the_way', 'completed', 'declined', 'cancelled'] as const).map((statusValue) => (
              <button
                key={statusValue}
                onClick={() => setFilter(statusValue)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === statusValue ? 'theme-accent-btn text-white' : 'theme-secondary-btn'
                }`}
              >
                {statusValue === 'all' ? 'All' : formatOrderItemStatus(statusValue)}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="theme-panel rounded-[1.6rem] p-12 text-center">
              <Package className="mx-auto mb-4 h-16 w-16 text-[var(--muted)]/45" />
              <h2 className="mb-2 text-2xl font-semibold text-[var(--brand-ink)]">No orders</h2>
              <p className="text-[var(--muted)]">
                You don&apos;t have any orders with status &quot;{filter}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="theme-panel overflow-hidden rounded-[1.6rem]">
                  <div className="border-b border-[var(--border)] bg-[var(--brand-accent-soft)]/35 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--brand-ink)]">
                          Order #{formatOrderReceiptNumber(order.orderNumber, order.id)}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">Marketplace customer</p>
                        <p className="text-sm text-[var(--muted)]">
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="mb-2 flex items-center gap-2 md:justify-end">
                          {getStatusIcon(order.status)}
                          <span className={`font-semibold ${getOrderStatusTone(order.status)}`}>
                            {formatOrderItemStatus(order.status)}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--brand-ink)]">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h4 className="mb-4 font-semibold text-[var(--brand-ink)]">Order Items</h4>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_18rem]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--brand-ink)]">{item.product.name}</p>
                            <p className="text-sm text-[var(--muted)]">Quantity: {item.quantity}</p>
                            {item.selectedOptionsSummary ? (
                              <p className="text-xs text-[var(--muted)]">{item.selectedOptionsSummary}</p>
                            ) : null}
                            <p className="mt-1 text-sm font-semibold text-[var(--brand-ink)]">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            {item.exceptions?.length ? (
                              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                Latest exception: {item.exceptions[0]?.type.replaceAll('_', ' ')} - {item.exceptions[0]?.note}
                              </div>
                            ) : null}
                          </div>

                          <div className="w-full max-w-full">
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                              Vendor action
                            </label>
                            {item.status === 'pending' ? (
                              <>
                                <select
                                  value={item.status}
                                  disabled={updatingItemId === item.id}
                                  onChange={(event) =>
                                    updateOrderStatus(order.id, item.id, event.target.value)
                                  }
                                  className="w-full rounded-xl border border-[var(--border-strong)] bg-white/80 px-3 py-2 text-sm text-[var(--brand-ink)] outline-none transition focus:border-[var(--brand-accent)]"
                                  title="Update item status"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="accepted">Accept order</option>
                                  <option value="declined">Decline order</option>
                                  <option value="cancelled">Cancel order</option>
                                </select>
                                <p className="mt-2 text-xs text-[var(--muted)]">
                                  Once accepted, dispatch takes over courier assignment and delivery flow.
                                </p>
                              </>
                            ) : (
                              <>
                                <div className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getOrderStatusTone(item.status)}`}>
                                  {formatOrderItemStatus(item.status)}
                                </div>
                                <p className="mt-2 text-xs text-[var(--muted)]">
                                  Vendors can no longer change this item after acceptance. Courier delivery is completed from the rider side.
                                </p>
                              </>
                            )}
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
    </VendorWorkspaceShell>
  )
}

