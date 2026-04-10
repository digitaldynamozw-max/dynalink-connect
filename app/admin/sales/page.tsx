'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, ShoppingCart, TrendingUp, Trophy, Wallet } from 'lucide-react'
import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

interface SalesData {
  date: string
  orders: number
  revenue: number
  avgOrderValue: number
}

interface ReportStats {
  totalSales: SalesData[]
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  totalRevenue: number
  totalOrders: number
}

export default function SalesReportPage() {
  const [report, setReport] = useState<ReportStats>({
    totalSales: [],
    topProducts: [],
    totalRevenue: 0,
    totalOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')

  const fetchSalesReport = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/sales?days=${dateRange}`)
      if (res.ok) {
        const data = (await res.json()) as ReportStats
        setReport(data)
      }
    } catch (error) {
      console.error('Failed to fetch sales report:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    void fetchSalesReport()
  }, [fetchSalesReport])

  const exportReport = async () => {
    try {
      const res = await fetch(`/api/admin/sales/export?days=${dateRange}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const averageOrderValue = report.totalRevenue / (report.totalOrders || 1)
  const bestDay = useMemo(
    () => [...report.totalSales].sort((left, right) => right.revenue - left.revenue)[0],
    [report.totalSales]
  )
  const revenueTrend = report.totalSales.slice(-5)
  const maxRevenue = revenueTrend.reduce((max, day) => Math.max(max, day.revenue), 1)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Sales Report"
          description="Marketplace revenue, order flow, and product performance for the selected reporting window."
          action={
            <>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => void exportReport()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </>
          }
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading report...</div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard label="Total Revenue" value={`$${report.totalRevenue.toFixed(2)}`} helper="Revenue for the selected range" icon={TrendingUp} />
                <AdminStatCard label="Total Orders" value={report.totalOrders} helper="Orders recorded in the reporting window" icon={ShoppingCart} />
                <AdminStatCard label="Avg Order Value" value={`$${averageOrderValue.toFixed(2)}`} helper="Average basket value in range" icon={BarChart3} />
                <AdminStatCard label="Best Day" value={bestDay ? `$${bestDay.revenue.toFixed(2)}` : '$0.00'} helper={bestDay ? bestDay.date : 'No sales days yet'} icon={Trophy} />
                <AdminStatCard label="Top Product Revenue" value={report.topProducts[0] ? `$${report.topProducts[0].revenue.toFixed(2)}` : '$0.00'} helper={report.topProducts[0]?.name || 'No product sales yet'} icon={Wallet} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <AdminSectionCard title="Revenue Momentum" description="A compact visual read of the last five sales days in the selected period.">
                  <div className="space-y-4">
                    {revenueTrend.length === 0 ? (
                      <AdminEmptyState message="No sales days are available in this reporting window." />
                    ) : (
                      revenueTrend.map((sale) => (
                        <div key={sale.date} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{sale.date}</span>
                            <span className="text-slate-500">${sale.revenue.toFixed(2)} | {sale.orders} orders</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              style={{ width: `${Math.max(10, (sale.revenue / maxRevenue) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AdminSectionCard>

                <AdminSectionCard title="Sales Snapshot" description="The core signals leaders usually ask for first.">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reporting window</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{dateRange} days</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">Revenue concentration</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {report.topProducts[0]
                          ? `${report.topProducts[0].name} leads product revenue right now with $${report.topProducts[0].revenue.toFixed(2)}.`
                          : 'No product revenue is recorded in the current window yet.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">Operational signal</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {report.totalOrders > 0
                          ? `${report.totalOrders} orders generated an average basket of $${averageOrderValue.toFixed(2)} in the selected period.`
                          : 'No orders have been captured in this reporting window yet.'}
                      </p>
                    </div>
                  </div>
                </AdminSectionCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <AdminSectionCard title="Daily Sales" description="The full period view of orders, revenue, and basket size by day.">
                  <AdminTableWrap>
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700">Orders</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700">Revenue</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-700">Avg Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.totalSales.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8">
                              <AdminEmptyState message="No sales data found for this period yet." />
                            </td>
                          </tr>
                        ) : (
                          report.totalSales.map((sale) => (
                            <tr key={sale.date} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-700">{sale.date}</td>
                              <td className="px-4 py-2 text-slate-700">{sale.orders}</td>
                              <td className="px-4 py-2 font-semibold text-emerald-600">${sale.revenue.toFixed(2)}</td>
                              <td className="px-4 py-2 text-slate-700">${sale.avgOrderValue.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </AdminTableWrap>
                </AdminSectionCard>

                <AdminSectionCard title="Top Products" description="The products contributing the most revenue in the current range.">
                  <div className="grid gap-3">
                    {report.topProducts.length === 0 ? (
                      <AdminEmptyState message="No product sales yet for this period." />
                    ) : (
                      report.topProducts.slice(0, 5).map((product) => (
                        <div key={`${product.name}-${product.quantity}`} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{product.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{product.quantity} units sold</p>
                            </div>
                            <span className="text-sm font-semibold text-emerald-700">${product.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AdminSectionCard>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
