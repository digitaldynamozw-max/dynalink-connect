'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Download,
  Eye,
  MapPin,
  Package2,
  Star,
  Store,
  UserRound,
  X,
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  status: string
  selectedOptionsSummary?: string | null
  proof?: {
    recipientName: string
    note: string
    photoUrl: string | null
    submittedAt: string
  } | null
  timeline?: Array<{
    label: string
    note: string
    createdAt: string
    type?: string
  }>
  vendor?: {
    id: string
    vendorName?: string | null
    storeAddress?: string | null
    storeCity?: string | null
    storeState?: string | null
  } | null
  product: {
    id: string
    name: string
  }
}

interface Order {
  id: string
  orderNumber?: string
  receiptNumber: string
  status: string
  pendingManualPayment?: boolean
  total: number
  deliveryFee: number
  platformFee?: number
  promoCode?: string | null
  promoDiscount?: number
  fulfillmentMethod?: 'delivery' | 'pickup'
  deliveryAddress?: string | null
  requestedDeliveryAt?: string | null
  createdAt: string
  user: {
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    email: string
    mobileNumber?: string | null
  }
  items: OrderItem[]
}

interface ExistingReview {
  id: string
  rating: number
  title: string
  comment: string
  verified: boolean
  createdAt: string
  isMine?: boolean
}

interface ReviewDraft {
  rating: number
  title: string
  comment: string
}

interface SiteSettingsSummary {
  companyName?: string
  customerOrderCancellationWindowMinutes?: number
}

function defaultReviewDraft(): ReviewDraft {
  return { rating: 5, title: '', comment: '' }
}

function formatStatus(status: string) {
  if (status === 'courier_on_the_way') return 'Courier on the way'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getPaymentNote(order: Order) {
  if (order.pendingManualPayment) {
    return 'Awaiting manual USD payment confirmation'
  }

  return null
}

function badgeClass(status: string) {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'courier_on_the_way') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'courier_assigned' || status === 'arrived_at_vendor') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'accepted' || status === 'paid' || status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'declined' || status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function money(value: number) {
  return `US$${value.toFixed(2)}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

function getCustomerName(order: Order) {
  return [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.name || order.user.email
}

function getVendorSummary(order: Order) {
  return order.items.find((item) => item.vendor)?.vendor || null
}

function getOrderLocation(order: Order) {
  if (order.fulfillmentMethod === 'pickup') {
    const vendor = getVendorSummary(order)
    const vendorAddress = [vendor?.storeAddress, vendor?.storeCity, vendor?.storeState].filter(Boolean).join(', ')
    return vendorAddress || order.deliveryAddress || 'No collection location saved'
  }

  return order.deliveryAddress || 'No address saved'
}

function buildEventRows(order: Order) {
  const events = [
    {
      label: 'Created',
      createdAt: order.createdAt,
      note: 'Order received by the platform.',
    },
    ...order.items.flatMap((item) =>
      (item.timeline || []).map((event) => ({
        label: event.label,
        createdAt: event.createdAt,
        note: event.note || item.product.name,
      }))
    ),
  ]

  return events
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .filter((event, index, current) => {
      const key = `${event.label}-${event.createdAt}`
      return current.findIndex((candidate) => `${candidate.label}-${candidate.createdAt}` === key) === index
    })
}

function getCompletedAt(order: Order) {
  return buildEventRows(order).find((event) => event.label.toLowerCase().includes('completed'))?.createdAt || null
}

function getItemSummary(order: Order) {
  const names = order.items.map((item) => item.product.name)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
}

function getCancellationDeadline(order: Order, cancellationWindowMinutes: number) {
  return new Date(new Date(order.createdAt).getTime() + cancellationWindowMinutes * 60 * 1000)
}

function getCancellationTimeLeftMs(order: Order, cancellationWindowMinutes: number, now: number) {
  return getCancellationDeadline(order, cancellationWindowMinutes).getTime() - now
}

function canCustomerCancelOrder(order: Order, cancellationWindowMinutes: number, now: number) {
  if (cancellationWindowMinutes <= 0) return false
  if (!['pending', 'accepted', 'paid'].includes(order.status)) return false
  return getCancellationTimeLeftMs(order, cancellationWindowMinutes, now) > 0
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function buildOrderPrintMarkup(order: Order, companyName: string) {
  const vendor = getVendorSummary(order)
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isPickup = order.fulfillmentMethod === 'pickup'
  const customerName = getCustomerName(order)
  const location = getOrderLocation(order)

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>${item.quantity}x ${item.product.name}${item.selectedOptionsSummary ? `<div class="muted">${item.selectedOptionsSummary}</div>` : ''}</td>
          <td>${formatStatus(item.status)}</td>
          <td class="amount">${money(item.price * item.quantity)}</td>
        </tr>
      `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order ${order.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; background: #eef4ff; }
          .page { padding: 28px; }
          .shell { max-width: 820px; margin: 0 auto; position: relative; background: #ffffff; border: 1px solid #dbe5f4; border-radius: 28px; overflow: hidden; box-shadow: 0 28px 80px -42px rgba(15,23,42,0.35); }
          .watermark { position: absolute; right: -28px; top: 180px; width: 240px; opacity: 0.06; }
          .hero { background: linear-gradient(135deg, #0f172a, #1d4ed8 58%, #60a5fa); color: #ffffff; padding: 28px; }
          .top { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
          .brand { display: flex; gap: 14px; align-items: center; }
          .logo-box { border-radius: 18px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.12); padding: 10px; }
          .logo { width: 56px; height: 56px; object-fit: contain; display: block; }
          .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #bfdbfe; }
          .title { font-size: 30px; font-weight: 700; margin: 8px 0 0; }
          .muted { color: #64748b; font-size: 12px; }
          .hero-muted { color: #dbeafe; font-size: 12px; }
          .pill { display: inline-block; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.12); color: #ffffff; }
          .content { padding: 28px; position: relative; }
          .intro { border: 1px solid #e2e8f0; border-radius: 20px; background: linear-gradient(180deg,#ffffff,#f8fbff); padding: 18px 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 24px; }
          .card { border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; background: #f8fafc; }
          h2 { font-size: 12px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
          p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 22px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 0; text-align: left; vertical-align: top; }
          th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
          .amount { text-align: right; white-space: nowrap; }
          .summary-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 18px; margin-top: 22px; }
          .note-card { border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; padding: 18px; }
          .totals { border: 1px solid #dbe5f4; border-radius: 20px; padding: 18px; background: linear-gradient(180deg,#ffffff,#f8fbff); }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals-row.total { font-size: 18px; font-weight: 700; border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 12px; }
          .footer { margin-top: 18px; color: #64748b; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="page">
        <div class="shell">
          <img class="watermark" src="/logo.png" alt="${companyName} watermark" />
          <div class="hero">
          <div class="top">
            <div class="brand">
              <div class="logo-box">
                <img class="logo" src="/logo.png" alt="${companyName} logo" />
              </div>
              <div>
                <div class="eyebrow">${companyName}</div>
                <p class="title">Order Receipt</p>
                <p class="hero-muted">Receipt #${order.receiptNumber}</p>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="pill">${isPickup ? 'Pickup' : 'Delivery'}</span>
              <p class="hero-muted" style="margin-top:12px;">Placed ${formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          </div>

          <div class="content">
          <div class="intro">
            <p style="margin:0 0 8px;font-size:15px;">Receipt for <strong>${customerName}</strong></p>
            <p style="margin:0;color:#475569;line-height:1.6;">This receipt confirms your ${isPickup ? 'pickup' : 'delivery'} order with ${vendor?.vendorName || 'Marketplace Store'}.</p>
          </div>
          <div class="grid">
            <div class="card">
              <h2>Vendor</h2>
              <p><strong>${vendor?.vendorName || 'Marketplace Store'}</strong></p>
              <p>${[vendor?.storeAddress, vendor?.storeCity, vendor?.storeState].filter(Boolean).join(', ') || 'Store address not provided'}</p>
            </div>
            <div class="card">
              <h2>Customer</h2>
              <p><strong>${customerName}</strong></p>
              <p>${order.user.email}</p>
              <p>${order.user.mobileNumber || 'No phone saved'}</p>
            </div>
            <div class="card">
              <h2>${isPickup ? 'Collection' : 'Delivery'}</h2>
              <p>${location}</p>
              <p class="muted">${isPickup ? 'Pickup order' : 'Delivery order'}</p>
            </div>
            <div class="card">
              <h2>Summary</h2>
              <p>${order.items.length} item${order.items.length === 1 ? '' : 's'}</p>
              <p>${isPickup ? 'No delivery fee applied' : `Delivery fee: ${money(order.deliveryFee)}`}</p>
              <p>Completed: ${formatDateTime(getCompletedAt(order))}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="summary-grid">
            <div class="note-card">
              <h2>Receipt Note</h2>
              <p style="line-height:1.6;color:#475569;">Keep this receipt for support, proof of purchase, and order tracking. Order reference: ${order.id}</p>
            </div>
            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
              <div class="totals-row"><span>Service fee</span><span>${money(order.platformFee || 0)}</span></div>
              ${order.promoDiscount ? `<div class="totals-row"><span>Promo${order.promoCode ? ` (${order.promoCode})` : ''}</span><span>-${money(order.promoDiscount)}</span></div>` : ''}
              ${isPickup ? '' : `<div class="totals-row"><span>Delivery fee</span><span>${money(order.deliveryFee)}</span></div>`}
              <div class="totals-row total"><span>Total</span><span>${money(order.total)}</span></div>
            </div>
          </div>
          <div class="footer">
            ${companyName} | Receipt #${order.receiptNumber}
          </div>
          </div>
        </div>
        </div>
      </body>
    </html>
  `
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reviewFormsOpen, setReviewFormsOpen] = useState<Record<string, boolean>>({})
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({})
  const [existingReviews, setExistingReviews] = useState<Record<string, ExistingReview | null>>({})
  const [reviewBusyKey, setReviewBusyKey] = useState<string | null>(null)
  const [reviewMessage, setReviewMessage] = useState<Record<string, string>>({})
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [cancelBusyOrderId, setCancelBusyOrderId] = useState<string | null>(null)
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(1)
  const [companyName, setCompanyName] = useState('DynaLink Connect')
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    const fetchOrders = async () => {
      setLoading(true)
      try {
        const [ordersRes, settingsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/site-settings'),
        ])

        if (!ordersRes.ok) {
          const data = await ordersRes.json()
          throw new Error(data?.error || 'Failed to load orders')
        }

        if (settingsRes.ok) {
          const settingsData = (await settingsRes.json()) as { settings?: SiteSettingsSummary }
          setCancellationWindowMinutes(Math.max(0, Math.round(Number(settingsData.settings?.customerOrderCancellationWindowMinutes ?? 1))))
          setCompanyName(settingsData.settings?.companyName || 'DynaLink Connect')
        }

        setOrders(await ordersRes.json())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void fetchOrders()
  }, [router, session, status])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!orders.length) return

    const completedProductIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          order.items
            .filter((item) => item.status === 'completed')
            .map((item) => item.product.id)
        )
      )
    )

    if (!completedProductIds.length) return

    let cancelled = false

    const fetchReviews = async () => {
      const entries = await Promise.all(
        completedProductIds.map(async (productId) => {
          try {
            const response = await fetch(`/api/reviews/${productId}`, {
              credentials: 'include',
            })

            if (!response.ok) return [productId, null] as const

            const reviews = (await response.json()) as ExistingReview[]
            return [productId, reviews.find((review) => review.isMine) || null] as const
          } catch {
            return [productId, null] as const
          }
        })
      )

      if (cancelled) return

      setExistingReviews(Object.fromEntries(entries))
      setReviewDrafts((current) => {
        const next = { ...current }
        for (const [productId, review] of entries) {
          if (!review || next[productId]) continue
          next[productId] = {
            rating: review.rating,
            title: review.title,
            comment: review.comment,
          }
        }
        return next
      })
    }

    void fetchReviews()

    return () => {
      cancelled = true
    }
  }, [orders])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === activeOrderId) || null,
    [activeOrderId, orders]
  )

  const completedCount = useMemo(
    () => orders.filter((order) => order.status === 'completed').length,
    [orders]
  )

  function getReviewDraft(productId: string) {
    return reviewDrafts[productId] || defaultReviewDraft()
  }

  function updateReviewDraft(productId: string, patch: Partial<ReviewDraft>) {
    setReviewDrafts((current) => ({
      ...current,
      [productId]: {
        ...getReviewDraft(productId),
        ...patch,
      },
    }))
  }

  async function submitReview(productId: string) {
    const draft = getReviewDraft(productId)
    setReviewBusyKey(productId)
    setReviewMessage((current) => ({ ...current, [productId]: '' }))

    try {
      const response = await fetch(`/api/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(draft),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save review')
      }

      setExistingReviews((current) => ({ ...current, [productId]: payload }))
      setReviewDrafts((current) => ({
        ...current,
        [productId]: {
          rating: payload.rating,
          title: payload.title,
          comment: payload.comment,
        },
      }))
      setReviewFormsOpen((current) => ({ ...current, [productId]: false }))
      setReviewMessage((current) => ({
        ...current,
        [productId]: existingReviews[productId] ? 'Review updated.' : 'Review submitted.',
      }))
    } catch (err) {
      setReviewMessage((current) => ({
        ...current,
        [productId]: (err as Error).message,
      }))
    } finally {
      setReviewBusyKey(null)
    }
  }

  function exportOrderPdf(order: Order) {
    const printWindow = window.open('', '_blank', 'width=900,height=1000')
    if (!printWindow) return

    printWindow.document.write(buildOrderPrintMarkup(order, companyName))
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  async function cancelOrder(orderId: string) {
    setCancelBusyOrderId(orderId)
    setActionError(null)

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to cancel order')
      }

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, ...payload } : order))
      )
      if (activeOrderId === orderId) {
        setActiveOrderId(orderId)
      }
    } catch (cancelError) {
      setActionError(cancelError instanceof Error ? cancelError.message : 'Failed to cancel order')
    } finally {
      setCancelBusyOrderId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <p className="text-sm font-medium text-slate-600">Loading your orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="text-center">
          <h1 className="mb-3 text-xl font-bold text-red-600">Error</h1>
          <p className="text-sm text-slate-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900">No orders yet</h1>
          <p className="mb-5 text-sm text-slate-600">Browse products and place an order to see it here.</p>
          <button
            onClick={() => router.push('/products')}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Shop now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f6f8fc_48%,#eff3f8_100%)] py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {actionError ? (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {actionError}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Orders</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Previous orders</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {orders.length} total order{orders.length === 1 ? '' : 's'} with {completedCount} completed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Compact archive
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  View or export
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 sm:px-4">
            <div className="grid gap-2">
              {orders.map((order) => {
                const vendor = getVendorSummary(order)
                const completedAt = getCompletedAt(order)
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                const itemSummary = getItemSummary(order)
                const isPickup = order.fulfillmentMethod === 'pickup'
                const paymentNote = getPaymentNote(order)
                const canCancel = canCustomerCancelOrder(order, cancellationWindowMinutes, nowTick)
                const timeLeftMs = getCancellationTimeLeftMs(order, cancellationWindowMinutes, nowTick)

                return (
                  <article
                    key={order.id}
                    className="group rounded-[22px] border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:shadow-[0_14px_36px_-28px_rgba(15,23,42,0.55)] sm:px-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-slate-950 sm:text-[15px]">
                            #{order.receiptNumber}
                          </h2>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {isPickup ? 'Pickup' : 'Delivery'}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-[12px] text-slate-600 sm:grid-cols-2 xl:grid-cols-5">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{vendor?.vendorName || 'Marketplace Store'}</p>
                            <p className="truncate">{itemSummary}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatDateTime(order.createdAt)}</span>
                          </div>
                          <div className="truncate">
                            {completedAt ? `Done ${formatDateTime(completedAt)}` : 'In progress'}
                          </div>
                          <div className="font-semibold text-slate-950">{money(order.total)}</div>
                        </div>
                        {paymentNote ? <p className="mt-2 text-xs font-medium text-amber-700">{paymentNote}</p> : null}
                        {canCancel ? (
                          <p className="mt-2 text-xs font-medium text-rose-700">
                            You can cancel this order for {formatCountdown(timeLeftMs)} more.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 lg:justify-end">
                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() => void cancelOrder(order.id)}
                            disabled={cancelBusyOrderId === order.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {cancelBusyOrderId === order.id ? 'Cancelling...' : 'Cancel order'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setActiveOrderId(order.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => exportOrderPdf(order)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export PDF
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex h-full max-w-4xl items-center justify-center">
            <div className="max-h-[92vh] w-full overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_-42px_rgba(15,23,42,0.55)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
                <div>
                  {getPaymentNote(selectedOrder) ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      {getPaymentNote(selectedOrder)}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950">Order #{selectedOrder.receiptNumber}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(selectedOrder.status)}`}>
                      {formatStatus(selectedOrder.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Placed {formatDateTime(selectedOrder.createdAt)}</p>
                  {canCustomerCancelOrder(selectedOrder, cancellationWindowMinutes, nowTick) ? (
                    <p className="mt-2 text-xs font-medium text-rose-700">
                      You can still cancel this order for {formatCountdown(getCancellationTimeLeftMs(selectedOrder, cancellationWindowMinutes, nowTick))}.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {canCustomerCancelOrder(selectedOrder, cancellationWindowMinutes, nowTick) ? (
                    <button
                      type="button"
                      onClick={() => void cancelOrder(selectedOrder.id)}
                      disabled={cancelBusyOrderId === selectedOrder.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {cancelBusyOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel order'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => exportOrderPdf(selectedOrder)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOrderId(null)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    aria-label="Close order view"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(92vh-84px)] overflow-y-auto px-4 py-4 sm:px-6">
                <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
                  <section className="rounded-[22px] border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                    </div>
                    <div className="space-y-3 px-4 py-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.quantity}x {item.product.name}
                            </p>
                            {item.selectedOptionsSummary ? (
                              <p className="mt-1 text-xs text-slate-500">{item.selectedOptionsSummary}</p>
                            ) : null}
                            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                              {formatStatus(item.status)}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                            {money(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}

                      <div className="rounded-2xl border border-slate-200 px-3 py-3 text-sm">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-medium text-slate-900">
                            {money(selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                          </span>
                        </div>
                        {selectedOrder.fulfillmentMethod !== 'pickup' ? (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-600">Delivery fee</span>
                            <span className="font-medium text-slate-900">{money(selectedOrder.deliveryFee)}</span>
                          </div>
                        ) : null}
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-600">Service fee</span>
                            <span className="font-medium text-slate-900">{money(selectedOrder.platformFee || 0)}</span>
                          </div>
                          {selectedOrder.promoDiscount ? (
                            <div className="flex items-center justify-between py-1 text-emerald-700">
                              <span>Promo{selectedOrder.promoCode ? ` (${selectedOrder.promoCode})` : ''}</span>
                              <span className="font-medium">-{money(selectedOrder.promoDiscount)}</span>
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950">
                          <span>Total</span>
                          <span>{money(selectedOrder.total)}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="space-y-3">
                    <section className="rounded-[22px] border border-slate-200 px-4 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Details</h3>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <div className="flex items-start gap-3">
                          <Store className="mt-0.5 h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">{getVendorSummary(selectedOrder)?.vendorName || 'Marketplace Store'}</p>
                            <p>
                              {[getVendorSummary(selectedOrder)?.storeAddress, getVendorSummary(selectedOrder)?.storeCity, getVendorSummary(selectedOrder)?.storeState]
                                .filter(Boolean)
                                .join(', ') || 'Store address not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">{getCustomerName(selectedOrder)}</p>
                            <p>{selectedOrder.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">{getOrderLocation(selectedOrder)}</p>
                            <p>{selectedOrder.fulfillmentMethod === 'pickup' ? 'Collection point' : 'Delivery destination'}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200 px-4 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                      <div className="mt-3 space-y-2">
                        {buildEventRows(selectedOrder).length ? (
                          buildEventRows(selectedOrder).map((event) => (
                            <div key={`${event.label}-${event.createdAt}`} className="rounded-2xl bg-slate-50 px-3 py-2.5">
                              <p className="text-sm font-medium text-slate-900">{event.label}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No timeline updates yet.</p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <section className="mt-3 rounded-[22px] border border-slate-200 px-4 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Reviews</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedOrder.items.filter((item) => item.status === 'completed').length ? (
                      selectedOrder.items
                        .filter((item) => item.status === 'completed')
                        .map((item) => {
                          const existingReview = existingReviews[item.product.id]
                          const draft = getReviewDraft(item.product.id)

                          return (
                            <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-slate-900">{item.product.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {existingReview ? 'Review saved' : 'No rating yet'}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    setReviewFormsOpen((current) => ({
                                      ...current,
                                      [item.product.id]: !current[item.product.id],
                                    }))
                                  }
                                  className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                                >
                                  {existingReview ? 'Edit' : 'Rate'}
                                </button>
                              </div>

                              {existingReview && !reviewFormsOpen[item.product.id] ? (
                                <div className="mt-3">
                                  <div className="flex items-center gap-1 text-amber-500">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={`${item.product.id}-view-${star}`}
                                        className={`h-4 w-4 ${star <= existingReview.rating ? 'fill-current' : ''}`}
                                      />
                                    ))}
                                  </div>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">{existingReview.title}</p>
                                  <p className="mt-1 text-sm text-slate-600">{existingReview.comment}</p>
                                </div>
                              ) : null}

                              {reviewFormsOpen[item.product.id] ? (
                                <div className="mt-3 space-y-3">
                                  <div className="flex gap-2 text-amber-500">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={`${item.product.id}-${star}`}
                                        type="button"
                                        onClick={() => updateReviewDraft(item.product.id, { rating: star })}
                                      >
                                        <Star className={`h-5 w-5 ${star <= draft.rating ? 'fill-current' : ''}`} />
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    value={draft.title}
                                    onChange={(event) => updateReviewDraft(item.product.id, { title: event.target.value })}
                                    placeholder="Review title"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                  />
                                  <textarea
                                    value={draft.comment}
                                    onChange={(event) => updateReviewDraft(item.product.id, { comment: event.target.value })}
                                    rows={3}
                                    placeholder="Write your comment"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                  />
                                  {reviewMessage[item.product.id] ? (
                                    <p className={`text-xs ${reviewMessage[item.product.id].includes('Review') ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {reviewMessage[item.product.id]}
                                    </p>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={reviewBusyKey === item.product.id}
                                    onClick={() => void submitReview(item.product.id)}
                                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                  >
                                    {reviewBusyKey === item.product.id ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                    ) : (
                      <p className="text-sm text-slate-500">Reviews appear here once completed items are available.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
