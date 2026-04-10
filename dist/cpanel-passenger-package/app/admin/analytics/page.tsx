import { BarChart3, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

export default async function AdminAnalyticsPage() {
  await requireAdmin()

  const [orders, products] = await Promise.all([
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
  ])

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = orders.length
  const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
  const recentOrders = orders.slice(0, 7)
  const maxRecentTotal = recentOrders.reduce((max, order) => Math.max(max, order.total), 1)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Analytics"
          description="Reports, graphs, charts, and marketplace performance visibility."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Total Sales" value={`$${totalSales.toFixed(2)}`} helper="All recorded revenue" icon={TrendingUp} />
            <AdminStatCard label="Orders" value={totalOrders} helper="Orders placed across the marketplace" icon={ShoppingCart} />
            <AdminStatCard label="Items Sold" value={totalItems} helper="Total quantity sold" icon={Package} />
            <AdminStatCard label="Avg Order Value" value={`$${averageOrderValue.toFixed(2)}`} helper="Average basket size" icon={BarChart3} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title="Revenue Chart" description="Simple order-value graph across the latest orders.">
              <div className="space-y-4">
                {recentOrders.map((order) => (
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
                ))}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Top Products Report" description="Best performing products by sales count.">
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
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{product.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{product.category || 'Uncategorized'}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.salesCount}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">${product.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.averageRating.toFixed(1)}</td>
                      </tr>
                    ))}
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
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-xs font-medium text-slate-900">#{order.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{order.items.length}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">${order.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{order.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableWrap>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
