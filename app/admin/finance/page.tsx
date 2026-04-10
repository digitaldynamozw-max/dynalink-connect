import Link from 'next/link'
import { ArrowRight, Building2, CircleDollarSign, Clock3, Landmark, Layers3, PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminBadge, AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

export const dynamic = 'force-dynamic'

type FinanceTab = 'overview' | 'profitability' | 'payouts' | 'vendors' | 'reports'

type VendorFinanceRow = {
  id: string
  name: string
  city: string
  completedSales: number
  settlementDue: number
  paidOut: number
  outstanding: number
  estimatedMarkupProfit: number
}

const financeTabs: Array<{ id: FinanceTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profitability', label: 'Profitability' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'reports', label: 'Reports' },
]

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function percent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

function parsePage(value?: string) {
  const parsed = Number.parseInt(value || '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parseTab(value?: string): FinanceTab {
  return financeTabs.some((tab) => tab.id === value) ? (value as FinanceTab) : 'overview'
}

function titleForTab(tab: FinanceTab) {
  if (tab === 'profitability') return 'Finance Profitability'
  if (tab === 'payouts') return 'Finance Payouts'
  if (tab === 'vendors') return 'Finance Vendors'
  if (tab === 'reports') return 'Finance Reports'
  return 'Finance Overview'
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; page?: string }>
}) {
  await requireAdmin()
  const params = (await searchParams) ?? {}
  const activeTab = parseTab(params.tab)

  const [orders, payouts, vendors] = await Promise.all([
    prisma.order.findMany({
      include: {
        items: {
          include: {
            vendor: {
              select: {
                id: true,
                vendorName: true,
                email: true,
                storeCity: true,
                commissionRate: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vendorPayout.findMany({
      include: {
        vendor: {
          select: { id: true, vendorName: true, email: true, storeCity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { isVendor: true },
      select: { id: true, vendorName: true, email: true, storeCity: true },
      orderBy: [{ vendorPriority: 'desc' }, { createdAt: 'asc' }],
    }),
  ])

  const vendorRowsMap = new Map<string, VendorFinanceRow>()
  for (const vendor of vendors) {
    vendorRowsMap.set(vendor.id, {
      id: vendor.id,
      name: vendor.vendorName || vendor.email,
      city: vendor.storeCity || 'Unknown city',
      completedSales: 0,
      settlementDue: 0,
      paidOut: 0,
      outstanding: 0,
      estimatedMarkupProfit: 0,
    })
  }

  const grossRevenue = orders.reduce((sum, order) => sum + order.total, 0)
  const realizedOrders = orders.filter((order) => order.status === 'completed')
  const realizedCash = realizedOrders.reduce((sum, order) => sum + order.total, 0)
  const invoicedPlatformProfit = orders.reduce((sum, order) => sum + (order.platformFee || 0), 0)
  const realizedPlatformProfit = realizedOrders.reduce((sum, order) => sum + (order.platformFee || 0), 0)
  const deliveryRevenue = orders.reduce((sum, order) => sum + order.deliveryFee, 0)

  let completedSettlements = 0
  let totalEstimatedMarkupProfit = 0

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.vendorId) continue
      const existing = vendorRowsMap.get(item.vendorId)
      if (!existing) continue

      if (item.status === 'completed') {
        const lineRevenue = item.price * item.quantity
        const markup = lineRevenue * ((item.vendor?.commissionRate || 0) / 100)
        existing.completedSales += lineRevenue
        existing.settlementDue += item.vendorEarnings
        existing.estimatedMarkupProfit += markup
        completedSettlements += item.vendorEarnings
        totalEstimatedMarkupProfit += markup
      }
    }
  }

  let requestedPayouts = 0
  let scheduledPayouts = 0
  let completedPayouts = 0

  for (const payout of payouts) {
    const existing = vendorRowsMap.get(payout.vendorId)
    if (!existing) continue
    if (payout.status === 'completed') {
      existing.paidOut += payout.amount
      completedPayouts += payout.amount
    } else if (payout.status === 'requested') {
      requestedPayouts += payout.amount
    } else if (payout.status === 'approved' || payout.status === 'processing') {
      scheduledPayouts += payout.amount
    }
  }

  const vendorRows = Array.from(vendorRowsMap.values())
    .map((row) => ({ ...row, outstanding: Math.max(0, row.settlementDue - row.paidOut) }))
    .sort((a, b) => b.outstanding - a.outstanding)

  const activeVendorsWithSales = vendorRows.filter((row) => row.completedSales > 0).length
  const outstandingVendorLiability = Math.max(0, completedSettlements - completedPayouts)
  const unscheduledVendorExposure = Math.max(0, outstandingVendorLiability - requestedPayouts - scheduledPayouts)
  const realizedProfitMargin = realizedCash > 0 ? (realizedPlatformProfit / realizedCash) * 100 : 0
  const collectionRate = grossRevenue > 0 ? (realizedCash / grossRevenue) * 100 : 0
  const highestLiabilityVendor = vendorRows[0]
  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
  })
  const monthlyChart = monthBuckets.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    const monthOrders = orders.filter(
      (order) => order.createdAt >= monthStart && order.createdAt < monthEnd
    )
    const monthRealizedOrders = monthOrders.filter((order) => order.status === 'completed')

    return {
      label: formatMonthLabel(monthStart),
      gross: monthOrders.reduce((sum, order) => sum + order.total, 0),
      realized: monthRealizedOrders.reduce((sum, order) => sum + order.total, 0),
      profit: monthRealizedOrders.reduce((sum, order) => sum + (order.platformFee || 0), 0),
    }
  })
  const strongestMonth = [...monthlyChart].sort((left, right) => right.gross - left.gross)[0]

  const perPage = 5
  const totalPages = Math.max(1, Math.ceil(vendorRows.length / perPage))
  const currentPage = Math.min(parsePage(params.page), totalPages)
  const paginatedVendorRows = vendorRows.slice((currentPage - 1) * perPage, currentPage * perPage)

  return (
    <div className="space-y-4">
      <div className="theme-panel overflow-hidden rounded-[1.35rem]">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <div className="mr-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800">
            <Wallet className="h-4 w-4" />
            Finance
          </div>
          {financeTabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/finance?tab=${tab.id}${tab.id === 'vendors' ? `&page=${currentPage}` : ''}`}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                tab.id === activeTab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <AdminPageHeader
          title={titleForTab(activeTab)}
          description="Finance functions grouped into clear tabs, like the rest of the admin system."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Gross Sales" value={compactMoney(grossRevenue)} helper="All recorded orders" icon={CircleDollarSign} />
            <AdminStatCard label="Realized Cash" value={compactMoney(realizedCash)} helper={`${realizedOrders.length} completed orders`} icon={Wallet} />
            <AdminStatCard label="Platform Fees" value={compactMoney(realizedPlatformProfit)} helper={`${money(invoicedPlatformProfit)} invoiced`} icon={Landmark} />
            <AdminStatCard label="Vendor Liability" value={compactMoney(outstandingVendorLiability)} helper="Completed sales not yet fully paid out" icon={PiggyBank} />
            <AdminStatCard label="Collection Rate" value={percent(collectionRate)} helper="Completed cash vs invoiced sales" icon={Clock3} />
            <AdminStatCard label="Active Vendors" value={activeVendorsWithSales} helper="Vendors with completed sales" icon={Building2} />
          </div>

          {activeTab === 'overview' ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <AdminSectionCard title="Finance Snapshot" description="Top finance signals in one place.">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">Realized Margin</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{percent(realizedProfitMargin)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">Estimated Markup</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totalEstimatedMarkupProfit)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">Highest Outstanding Vendor</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{highestLiabilityVendor?.name || 'No vendor yet'}</p>
                      <p className="mt-1 text-sm text-slate-600">{money(highestLiabilityVendor?.outstanding || 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Unscheduled Exposure</p>
                        <AdminBadge label={unscheduledVendorExposure > 0 ? 'Review' : 'Healthy'} tone={unscheduledVendorExposure > 0 ? 'amber' : 'green'} />
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{money(unscheduledVendorExposure)}</p>
                    </div>
                  </div>
                </AdminSectionCard>

                <AdminSectionCard title="Finance Pages" description="What each finance tab is for.">
                  <div className="space-y-3">
                    {financeTabs.map((tab) => (
                      <div key={tab.id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-900">{tab.label}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {tab.id === 'overview'
                            ? 'Summary of finance health and exposure.'
                            : tab.id === 'profitability'
                              ? 'Revenue movement, platform fee performance, and markup profit.'
                              : tab.id === 'payouts'
                                ? 'Requested, scheduled, and settled vendor payouts.'
                                : tab.id === 'vendors'
                                  ? 'Vendor ledger and per-vendor settlement position.'
                                  : 'Definitions and finance reference notes for the team.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </AdminSectionCard>
              </div>
            </>
          ) : null}

          {activeTab === 'profitability' ? (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <AdminSectionCard title="Profitability Summary" description="Core platform revenue signals.">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Realized Margin</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{percent(realizedProfitMargin)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Estimated Markup Profit</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totalEstimatedMarkupProfit)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Delivery Revenue</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(deliveryRevenue)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Best Month</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{strongestMonth?.label || 'N/A'}</p>
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Revenue Trend" description="Recent month snapshots.">
                <div className="grid gap-3">
                  {monthlyChart.map((point) => (
                    <div key={point.label} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{point.label}</p>
                          <p className="mt-1 text-xs text-slate-500">Gross {money(point.gross)}</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Realized cash: {money(point.realized)}</p>
                        <p>Platform fees: {money(point.profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === 'payouts' ? (
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <AdminSectionCard title="Payout Queue" description="Current payout movement across the platform.">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Requested</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(requestedPayouts)}</p>
                    <p className="mt-1 text-sm text-slate-600">Awaiting finance review.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Scheduled</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(scheduledPayouts)}</p>
                    <p className="mt-1 text-sm text-slate-600">Approved or processing.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Completed</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(completedPayouts)}</p>
                    <p className="mt-1 text-sm text-slate-600">Already settled.</p>
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Payout Signals" description="Extra context so the page does not feel empty.">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Outstanding Liability</p>
                      <AdminBadge label={outstandingVendorLiability > 0 ? 'Open' : 'Clear'} tone={outstandingVendorLiability > 0 ? 'amber' : 'green'} />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(outstandingVendorLiability)}</p>
                    <p className="mt-1 text-sm text-slate-600">Completed vendor value still waiting for final payout closure.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Completed Settlements</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(completedSettlements)}</p>
                    <p className="mt-1 text-sm text-slate-600">Total vendor earnings generated from completed order items.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Unscheduled Exposure</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(unscheduledVendorExposure)}</p>
                    <p className="mt-1 text-sm text-slate-600">Not yet requested and not yet moved into the payout queue.</p>
                  </div>
                </div>
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === 'vendors' ? (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <AdminSectionCard
                title="Vendor Ledger"
                description={`Showing ${paginatedVendorRows.length} of ${vendorRows.length} vendors. Only 5 listings appear on each page.`}
                action={
                  totalPages > 1 ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={currentPage > 1 ? `/admin/finance?tab=vendors&page=${currentPage - 1}` : '#'}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${currentPage > 1 ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'cursor-not-allowed border border-slate-100 text-slate-300'}`}
                      >
                        Previous
                      </Link>
                      <span className="text-xs font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
                      <Link
                        href={currentPage < totalPages ? `/admin/finance?tab=vendors&page=${currentPage + 1}` : '#'}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${currentPage < totalPages ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'cursor-not-allowed border border-slate-100 text-slate-300'}`}
                      >
                        Next
                      </Link>
                    </div>
                  ) : null
                }
              >
                <AdminTableWrap>
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Vendor</th>
                        <th className="px-3 py-2 text-left font-semibold">Completed Sales</th>
                        <th className="px-3 py-2 text-left font-semibold">Settlement Due</th>
                        <th className="px-3 py-2 text-left font-semibold">Paid Out</th>
                        <th className="px-3 py-2 text-left font-semibold">Outstanding</th>
                        <th className="px-3 py-2 text-left font-semibold">Markup Profit</th>
                        <th className="px-3 py-2 text-left font-semibold">Statement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVendorRows.length ? (
                        paginatedVendorRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-3 py-3">
                              <p className="font-medium text-slate-900">{row.name}</p>
                              <p className="text-xs text-slate-500">{row.city}</p>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{money(row.completedSales)}</td>
                            <td className="px-3 py-3 text-slate-700">{money(row.settlementDue)}</td>
                            <td className="px-3 py-3 text-slate-700">{money(row.paidOut)}</td>
                            <td className="px-3 py-3 font-medium text-slate-900">{money(row.outstanding)}</td>
                            <td className="px-3 py-3 text-slate-700">{money(row.estimatedMarkupProfit)}</td>
                            <td className="px-3 py-3">
                              <Link
                                href={`/api/admin/vendors/${row.id}/statement`}
                                className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                              >
                                Download CSV
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7}>
                            <AdminEmptyState message="No vendor finance data yet." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </AdminTableWrap>
              </AdminSectionCard>

              <AdminSectionCard title="Vendor Notes" description="Reference notes for the finance vendor list.">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Settlement Due</p>
                    <p className="mt-1 text-sm text-slate-600">What vendors have earned from completed orders.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Outstanding</p>
                    <p className="mt-1 text-sm text-slate-600">Open amount after paid payouts are deducted.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Vendor Statement</p>
                    <p className="mt-1 text-sm text-slate-600">Download a CSV statement for any vendor directly from the finance ledger table.</p>
                  </div>
                </div>
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === 'reports' ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <AdminSectionCard title="Finance Definitions" description="Reference notes for your team.">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Platform Fee</p>
                    <p className="mt-1 text-sm text-slate-600">A fixed amount charged to the customer on every order placed on the app.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Marketplace Markup</p>
                    <p className="mt-1 text-sm text-slate-600">A percentage markup added to each product price for the customer based on the vendor markup rate.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Vendor Settlement</p>
                    <p className="mt-1 text-sm text-slate-600">The amount still owed to vendors after completed sales and before payout completion.</p>
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Reference Snapshot" description="Live finance context beside the written definitions.">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Platform Fees Invoiced</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(invoicedPlatformProfit)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Markup Profit Estimate</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totalEstimatedMarkupProfit)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Active Vendors With Sales</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{activeVendorsWithSales}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Outstanding Liability</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{money(outstandingVendorLiability)}</p>
                  </div>
                </div>
              </AdminSectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
