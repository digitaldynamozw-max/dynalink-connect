'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

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
    totalOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days

  useEffect(() => {
    fetchSalesReport()
  }, [dateRange])

  const fetchSalesReport = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/sales?days=${dateRange}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch (error) {
      console.error('Failed to fetch sales report:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sales Report</h1>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Period
        </label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading report...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
              <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                ${report.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
              <p className="text-gray-500 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {report.totalOrders}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-600">
              <p className="text-gray-500 text-sm font-medium">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                ${(report.totalRevenue / (report.totalOrders || 1)).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Daily Sales Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Daily Sales</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Orders</th>
                    <th className="px-4 py-2 text-left font-semibold">Revenue</th>
                    <th className="px-4 py-2 text-left font-semibold">Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.totalSales.map((sale) => (
                    <tr key={sale.date} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{sale.date}</td>
                      <td className="px-4 py-2">{sale.orders}</td>
                      <td className="px-4 py-2 font-semibold text-green-600">
                        ${sale.revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        ${sale.avgOrderValue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Top Products</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-left font-semibold">Quantity</th>
                    <th className="px-4 py-2 text-left font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((product, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{product.name}</td>
                      <td className="px-4 py-2">{product.quantity}</td>
                      <td className="px-4 py-2 font-semibold text-green-600">
                        ${product.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
