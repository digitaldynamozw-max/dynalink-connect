import { BarChart3, Flame, Map, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getHeatmapTone(value: number, max: number) {
  if (!value || !max) return 'bg-slate-100 text-slate-400'

  const ratio = value / max
  if (ratio > 0.8) return 'bg-blue-600 text-white'
  if (ratio > 0.55) return 'bg-blue-500 text-white'
  if (ratio > 0.3) return 'bg-blue-200 text-blue-900'
  return 'bg-blue-100 text-blue-800'
}

export default async function AdminAnalyticsPage() {
  await requireAdmin()

  const [orders, products, vendorCount, customerCount] = await Promise.all([
    prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      orderBy: [{ salesCount: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    }),
    prisma.user.count({ where: { isVendor: true } }),
    prisma.user.count({ where: { role: 'user' } }),
  ])

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = orders.length
  const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
  const recentOrders = orders.slice(0, 7)
  const maxRecentTotal = recentOrders.reduce((max, order) => Math.max(max, order.total), 1)
  const completedOrders = orders.filter((order) => order.status === 'completed').length
  const pendingOrders = orders.filter((order) => order.status === 'pending').length
  const platformFees = orders.reduce((sum, order) => sum + (order.platformFee || 0), 0)
  const bestProduct = products[0]

  const heatmapBase = DAY_LABELS.map((label) => ({
    label,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 })),
  }))

  for (const order of orders) {
    const createdAt = new Date(order.createdAt)
    const dayIndex = createdAt.getDay() === 0 ? 6 : createdAt.getDay() - 1
    const hour = createdAt.getHours()
    heatmapBase[dayIndex].hours[hour].value += 1
  }

  const maxHeat = Math.max(...heatmapBase.flatMap((day) => day.hours.map((hour) => hour.value)), 0)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Analytics"
          description="Marketplace performance, demand timing, revenue flow, and product momentum."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Total Sales" value={`$${totalSales.toFixed(2)}`} helper="All recorded revenue" icon={TrendingUp} />
            <AdminStatCard label="Orders" value={totalOrders} helper="Orders placed across the marketplace" icon={ShoppingCart} />
            <AdminStatCard label="Items Sold" value={totalItems} helper="Total quantity sold" icon={Package} />
            <AdminStatCard label="Avg Order Value" value={`$${averageOrderValue.toFixed(2)}`} helper="Average basket size" icon={BarChart3} />
            <AdminStatCard label="Platform Fees" value={`$${platformFees.toFixed(2)}`} helper="Fixed fees plus markup revenue" icon={Flame} />
            <AdminStatCard label="Customers" value={customerCount} helper="Customer accounts" icon={Users} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <AdminSectionCard title="Order Activity Heatmap" description="Hourly order volume across the week.">
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="mb-2 grid grid-cols-[70px_repeat(24,minmax(20px,1fr))] gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <span />
                    {Array.from({ length: 24 }, (_, hour) => (
                      <span key={`hour-${hour}`} className="text-center">
                        {hour}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {heatmapBase.map((day) => (
                      <div key={day.label} className="grid grid-cols-[70px_repeat(24,minmax(20px,1fr))] gap-1">
                        <span className="flex items-center text-xs font-semibold text-slate-700">{day.label}</span>
                        {day.hours.map((hour) => (
                          <div
                            key={`${day.label}-${hour.hour}`}
                            className={`flex h-8 items-center justify-center rounded-md text-[10px] font-semibold ${getHeatmapTone(hour.value, maxHeat)}`}
                            title={`${day.label} ${hour.hour}:00 - ${hour.value} order${hour.value === 1 ? '' : 's'}`}
                          >
                            {hour.value || ''}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Operations Snapshot" description="High-level marketplace balance in one quick scan.">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current mix</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-sm text-slate-500">Completed</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">{completedOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-sm text-slate-500">Pending</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">{pendingOrders}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Marketplace scale</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {vendorCount} vendor accounts and {customerCount} customer accounts are contributing to the demand pattern shown in the heatmap.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Top product momentum</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {bestProduct
                      ? `${bestProduct.name} currently leads by units sold with ${bestProduct.salesCount} total units.`
                      : 'No product momentum is visible yet because the catalog has no sales data.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Map className="h-4 w-4" />
                    <p className="text-sm font-semibold">Demand mapping</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    The weekly heatmap is your fastest route to spotting when delivery, support, and marketing pressure are likely to spike.
                  </p>
                </div>
              </div>
            </AdminSectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard title="Revenue Pulse" description="Simple order-value bars across the latest tracked orders.">
              <div className="space-y-4">
                {recentOrders.length === 0 ? (
                  <AdminEmptyState message="No recent orders are available for revenue pulse tracking yet." />
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">#{order.id.slice(0, 8)}</span>
                        <span className="text-slate-500">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${Math.max(12, (order.total / maxRecentTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Top Products Report" description="Best performing products by sales count and storefront strength.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Category</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Units Sold</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Price</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <AdminEmptyState message="No products are available for analytics yet." />
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs font-medium text-slate-900">{product.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">{product.category || 'Uncategorized'}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{product.salesCount}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">${product.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{product.averageRating.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>
          </div>

          <AdminSectionCard title="Report Snapshot" description="Latest order records used in the analytics view.">
            <AdminTableWrap>
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Created</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Items</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Total</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8">
                        <AdminEmptyState message="No recent order snapshot is available yet." />
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">#{order.id.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{order.items.length}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">${order.total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{order.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableWrap>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
