import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock3, Mail, MapPinOff, Phone, Receipt, Store, Wallet } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminVendorPayoutReview } from '@/components/admin-vendor-payout-review'

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function formatStatus(status: string) {
  return status === 'courier_on_the_way'
    ? 'Courier On The Way'
    : status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  const { id } = await params

  const vendor = await prisma.user.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 6,
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      orderItems: {
        include: {
          order: {
            select: {
              id: true,
              createdAt: true,
              status: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { order: { createdAt: 'desc' } },
        take: 10,
      },
      payouts: {
        orderBy: { createdAt: 'desc' },
        take: 8,
      },
    },
  })

  if (!vendor || !vendor.isVendor) {
    notFound()
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalProducts = vendor.products.length
  const activeProducts = vendor.products.filter((product) => product.stock > 0).length
  const totalOrderItems = vendor.orderItems.length
  const monthlyOrders = vendor.orderItems.filter((item) => item.order.createdAt >= monthStart).length
  const completedEarnings = vendor.orderItems
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + item.vendorEarnings, 0)
  const pendingEarnings = vendor.orderItems
    .filter((item) => ['pending', 'accepted', 'courier_on_the_way'].includes(item.status))
    .reduce((sum, item) => sum + item.vendorEarnings, 0)
  const paidOut = vendor.payouts
    .filter((payout) => payout.status === 'completed')
    .reduce((sum, payout) => sum + payout.amount, 0)
  const allReviews = vendor.products.flatMap((product) => product.reviews)
  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
      : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
          <Link
            href="/admin/vendors"
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
            title="Back to vendors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {vendor.vendorName || vendor.name || vendor.email}
                </h1>
                <p className="text-xs text-slate-500">
                  Vendor profile and operations overview
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                vendor.vendorVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {vendor.vendorVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                {vendor.vendorVerified ? 'Verified' : 'Pending review'}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Joined {vendor.vendorJoinedAt ? new Date(vendor.vendorJoinedAt).toLocaleDateString() : 'Recently'}
              </span>
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                Commission {vendor.commissionRate ?? 10}%
              </span>
            </div>
            <div>
              <Link
                href={`/admin/vendors/${vendor.id}/edit`}
                className="inline-flex rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Edit Vendor
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{formatMoney(vendor.accountBalance ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Orders This Month</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{monthlyOrders}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed Earnings</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{formatMoney(completedEarnings)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid Out</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{formatMoney(paidOut)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Statistics</h2>
            <div className="mt-4 grid grid-cols-1 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Products</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-700">{totalProducts}</p>
                <p className="mt-1 text-xs text-slate-500">{activeProducts} active listings</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Order Items</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-700">{totalOrderItems}</p>
                <p className="mt-1 text-xs text-slate-500">Recent vendor-side fulfillment records</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pending Earnings</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-700">{formatMoney(pendingEarnings)}</p>
                <p className="mt-1 text-xs text-slate-500">Pending, accepted, and on-the-way items</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Average Rating</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-700">{averageRating.toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">{allReviews.length} reviews captured</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Recent Order Activity</h2>
              <span className="text-xs text-slate-500">{vendor.orderItems.length} recent items</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Order</th>
                    <th className="px-3 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Amount</th>
                    <th className="px-3 py-2 text-left font-semibold">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-5 text-center text-slate-500">
                        No order activity yet.
                      </td>
                    </tr>
                  ) : (
                    vendor.orderItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">
                          #{item.order.id.slice(0, 8)}
                          <p className="text-xs text-slate-400">
                            {new Date(item.order.createdAt).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{item.product.name}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {formatStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {formatMoney(item.price * item.quantity)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {typeof item.estimatedDeliveryMinutes === 'number'
                            ? `${item.estimatedDeliveryMinutes} min`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Recent Reviews</h2>
              <span className="text-xs text-slate-500">{allReviews.length} total</span>
            </div>
            <div className="mt-4 space-y-3">
              {allReviews.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews captured yet.</p>
              ) : (
                allReviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{review.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{review.comment}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-amber-500">{review.rating}.0</p>
                        <p className="text-xs text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Business Information</h2>
            </div>
            <div className="space-y-3 px-4 py-4 text-xs">
              <div>
                <p className="text-slate-500">Vendor Name</p>
                <p className="font-semibold text-slate-900">{vendor.vendorName || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-slate-500">Description</p>
                <p className="font-semibold text-slate-900">{vendor.vendorDescription || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-slate-500">Store Location</p>
                <p className="font-semibold text-slate-900">
                  {[vendor.storeAddress, vendor.storeCity, vendor.storeState, vendor.storeZipCode].filter(Boolean).join(', ') || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Listing Priority</p>
                <p className="font-semibold text-slate-900">{vendor.vendorPriority ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500">Category</p>
                <p className="font-semibold text-slate-900">{vendor.vendorCategory || 'Not specified'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Listing Assets</h2>
            </div>
            <div className="space-y-3 px-4 py-4 text-xs">
              <div>
                <p className="text-slate-500">Logo</p>
                <p className="font-semibold text-slate-900">{vendor.vendorImage ? 'Uploaded' : 'Not uploaded'}</p>
              </div>
              <div>
                <p className="text-slate-500">Banner</p>
                <p className="font-semibold text-slate-900">{vendor.storeBannerImage ? 'Uploaded' : 'Not uploaded'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
            </div>
            <div className="space-y-3 px-4 py-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{vendor.vendorPhoneNumber || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-semibold text-slate-900">{vendor.email}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Marketplace Markup</h2>
            </div>
            <div className="px-4 py-5 text-center">
              <p className="text-4xl font-bold text-blue-700">{vendor.commissionRate ?? 10}%</p>
              <p className="mt-2 text-xs text-slate-500">Current platform commission rate</p>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Operational Notes</h2>
            </div>
            <div className="space-y-2.5 px-4 py-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Wallet className="mt-0.5 h-4 w-4 text-blue-600" />
                <p>Account balance is stored on the vendor profile for quick admin reconciliation.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Receipt className="mt-0.5 h-4 w-4 text-blue-600" />
                <p>Payout history below helps track what has already been settled.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPinOff className="mt-0.5 h-4 w-4 text-blue-600" />
                <p>Public storefront location details are hidden from customers now.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Payout History</h2>
            </div>
            <AdminVendorPayoutReview
              initialPayouts={vendor.payouts.map((payout) => ({
                id: payout.id,
                amount: payout.amount,
                status: payout.status,
                createdAt: payout.createdAt.toISOString(),
                ordersIncluded: payout.ordersIncluded,
                reviewNotes: payout.reviewNotes,
                reviewedAt: payout.reviewedAt?.toISOString() || null,
              }))}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
