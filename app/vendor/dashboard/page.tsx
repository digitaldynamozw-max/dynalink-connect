'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Bell, DollarSign, MapPin, Package, Settings, ShoppingCart } from 'lucide-react'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import {
  DAY_KEYS,
  formatHoursLabel,
  getStoreAvailability,
  parseWeeklyHours,
} from '@/lib/store-hours'

interface VendorData {
  id: string
  vendorName: string
  vendorImage?: string
  storeBannerImage?: string
  vendorDescription?: string
  vendorJoinedAt?: Date
  storeCity?: string
  storeState?: string
  storeAddress?: string
  storeZipCode?: string
  vendorPhoneNumber?: string
  vendorVerified?: boolean
  commissionRate?: number
  isVendor?: boolean
  weeklyOpeningHours?: string | null
  temporarilyClosed?: boolean
}

interface ProductData {
  id: string
  name: string
  price: number
  stock: number
  rating?: number
  averageRating?: number
  reviewCount?: number
  reviews?: Array<{
    id: string
    rating: number
    title: string
    comment: string
    verified: boolean
    createdAt: string
    user?: {
      name?: string | null
      email?: string | null
    } | null
  }>
}

interface OrderData {
  id: string
  orderId: string
  orderNumber?: string
  quantity: number
  price: number
  status: string
  order?: { total?: number; createdAt?: string }
  product: ProductData
}

interface VendorNotification {
  id: string
  title: string
  message: string
  createdAt: string
}

export default function VendorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [products, setProducts] = useState<ProductData[]>([])
  const [orders, setOrders] = useState<OrderData[]>([])
  const [notifications, setNotifications] = useState<VendorNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session?.user?.email) {
      router.push('/auth/signin')
      return
    }

    void fetchVendorData()
  }, [router, session?.user?.email, status])

  async function fetchVendorData() {
    try {
      const [vendorRes, productsRes, ordersRes, notificationsRes] = await Promise.all([
        fetch('/api/vendor/register'),
        fetch('/api/vendor/products'),
        fetch('/api/vendor/orders'),
        fetch('/api/vendor/notifications'),
      ])

      if (vendorRes.ok) setVendor(await vendorRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (notificationsRes.ok) setNotifications(await notificationsRes.json())
    } catch (error) {
      console.error('Failed to fetch vendor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalSales = useMemo(
    () =>
      Array.from(new Map(orders.map((item) => [item.orderId, item.order?.total || 0])).values()).reduce(
        (sum, orderTotal) => sum + orderTotal,
        0
      ),
    [orders]
  )
  const totalOrders = useMemo(() => new Set(orders.map((item) => item.orderId)).size, [orders])
  const activeProducts = useMemo(() => products.filter((product) => product.stock > 0).length, [products])
  const totalReviews = useMemo(
    () => products.reduce((sum, product) => sum + (product.reviewCount || 0), 0),
    [products]
  )
  const averageRating = useMemo(() => {
    if (!totalReviews) {
      return 0
    }

    const weightedTotal = products.reduce(
      (sum, product) => sum + (product.averageRating || 0) * (product.reviewCount || 0),
      0
    )

    return weightedTotal / totalReviews
  }, [products, totalReviews])
  const recentReviews = useMemo(
    () =>
      products
        .flatMap((product) =>
          (product.reviews || []).map((review) => ({
            ...review,
            productName: product.name,
          }))
        )
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 4),
    [products]
  )

  if (status === 'loading' || loading) {
    return (
      <div className="theme-app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!vendor?.isVendor) {
    return (
      <div className="theme-app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Not a Vendor</h1>
          <p className="text-gray-600 mb-6">You need to register as a vendor first.</p>
          <button
            onClick={() => router.push('/vendor/register')}
            className="theme-accent-btn rounded-lg px-6 py-3 text-white"
          >
            Register as Vendor
          </button>
        </div>
      </div>
    )
  }

  const availability = getStoreAvailability(vendor.weeklyOpeningHours, vendor.temporarilyClosed)
  const weeklyHours = parseWeeklyHours(vendor.weeklyOpeningHours)
  const recentOrders = orders.slice(0, 6)

  return (
    <div className="theme-app-shell min-h-screen">
      <ImpersonationBanner />

      <div className="theme-hero relative overflow-hidden text-white">
        {vendor.storeBannerImage ? (
          <>
            <Image src={vendor.storeBannerImage} alt={`${vendor.vendorName} banner`} fill priority className="object-cover" />
            <div className="absolute inset-0 bg-slate-950/65" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#18222b,#2d7285_56%,#18222b)]" />
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {vendor.vendorImage && (
                <Image
                  src={vendor.vendorImage}
                  alt={vendor.vendorName}
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-xl border border-white/20 object-cover"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold">{vendor.vendorName}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">
                  {vendor.vendorDescription || 'Manage your storefront, catalog, and order fulfillment from one place.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {vendor.vendorVerified ? 'Verified vendor' : 'Pending verification'}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {availability.message}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/vendor/catalog" className="theme-secondary-btn rounded-lg px-4 py-2.5 text-sm font-semibold">
                Manage Catalog
              </Link>
              <Link href="/vendor/orders" className="theme-accent-btn rounded-lg px-4 py-2.5 text-sm font-semibold">
                Review Orders
              </Link>
              <Link href="/vendor/settings" className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                Store Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard icon={Package} label="Products" value={activeProducts} helper={`${products.length} total listed`} />
          <StatCard icon={ShoppingCart} label="Orders" value={totalOrders} helper={`${recentOrders.length} recent shown`} />
          <StatCard icon={DollarSign} label="Sales" value={`$${totalSales.toFixed(2)}`} helper="Gross order revenue" />
          <StatCard
            icon={Bell}
            label="Rating"
            value={totalReviews ? averageRating.toFixed(1) : '0.0'}
            helper={totalReviews ? `${totalReviews} reviews tracked` : 'No reviews yet'}
          />
          <StatCard icon={MapPin} label="Base" value={[vendor.storeCity, vendor.storeState].filter(Boolean).join(', ') || 'Not set'} helper="Primary store location" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="theme-panel rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Vendors manage acceptance and completion. Delivery dispatch is handled by admin.
                </p>
              </div>
              <Link href="/vendor/orders" className="text-sm font-semibold text-[var(--brand-highlight)] hover:text-[var(--brand-accent)]">
                View all
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No recent orders yet.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recentOrders.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.product.name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Order #{item.orderId.slice(0, 8)} • Qty {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section className="theme-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Ratings & Reviews</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Latest customer feedback across your listed products.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{totalReviews ? averageRating.toFixed(1) : '0.0'}</p>
                  <p className="text-xs text-slate-500">{totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
                </div>
              </div>

              {recentReviews.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No customer reviews yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {recentReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{review.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {review.productName} | {review.user?.name || review.user?.email || 'Customer'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-amber-600">{review.rating}/5</p>
                          <p className="mt-1 text-[11px] text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                      {review.verified ? (
                        <p className="mt-2 text-[11px] font-medium text-emerald-600">Verified purchase</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="theme-panel rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--brand-highlight)]" />
                <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
              </div>
              {notifications.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {notifications.slice(0, 4).map((notification) => (
                    <div key={notification.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{notification.message}</p>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="theme-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Store Schedule</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Keep your store hours current so admin can coordinate fulfillment.
                  </p>
                </div>
                <Link href="/vendor/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-highlight)] hover:text-[var(--brand-accent)]">
                  <Settings className="h-4 w-4" />
                  Edit
                </Link>
              </div>
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--brand-accent-soft)] px-3 py-2.5 text-sm text-slate-700">
                {availability.message}
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                {DAY_KEYS.map((day) => (
                  <div key={day} className="flex items-center justify-between gap-4">
                    <span className="font-medium capitalize">{day}</span>
                    <span>
                      {weeklyHours[day].isOpen
                        ? `${formatHoursLabel(weeklyHours[day].open)} - ${formatHoursLabel(weeklyHours[day].close)}`
                        : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Package
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="theme-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {helper ? <p className="mt-1 text-[11px] text-slate-500">{helper}</p> : null}
        </div>
        <Icon className="h-8 w-8 text-[var(--brand-highlight)] opacity-50" />
      </div>
    </div>
  )
}
