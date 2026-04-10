'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Download, ShoppingCart, TrendingUp } from 'lucide-react'
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

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

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Sales Report"
          description="Track marketplace revenue trends and export period reports."
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

        <div className="p-3.5 sm:p-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading report...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard
                  label="Total Revenue"
                  value={`$${report.totalRevenue.toFixed(2)}`}
                  helper="Revenue for the selected range"
                  icon={TrendingUp}
                />
                <AdminStatCard
                  label="Total Orders"
                  value={report.totalOrders}
                  helper="Completed and in-progress orders"
                  icon={ShoppingCart}
                />
                <AdminStatCard
                  label="Avg Order Value"
                  value={`$${(report.totalRevenue / (report.totalOrders || 1)).toFixed(2)}`}
                  helper="Average basket value in range"
                  icon={BarChart3}
                />
              </div>

              <AdminSectionCard title="Daily Sales">
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
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            No sales data found for this period yet.
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

              <AdminSectionCard title="Top Products">
                <AdminTableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Product</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Quantity</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                            No product sales yet for this period.
                          </td>
                        </tr>
                      ) : (
                        report.topProducts.map((product) => (
                          <tr key={`${product.name}-${product.quantity}`} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-700">{product.name}</td>
                            <td className="px-4 py-2 text-slate-700">{product.quantity}</td>
                            <td className="px-4 py-2 font-semibold text-emerald-600">${product.revenue.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </AdminTableWrap>
              </AdminSectionCard>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
