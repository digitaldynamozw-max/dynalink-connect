'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  FileCog,
  Loader,
  Plus,
  Receipt,
  Search,
  Star,
  Store,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react'
import { AdminInsightCard, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'
import { uploadAdminVendorAsset } from '@/lib/admin/vendor-assets'

interface VendorRow {
  id: string
  email: string
  isActive: boolean
  accountBalance: number
  vendorName?: string | null
  vendorDescription?: string | null
  vendorImage?: string | null
  storeBannerImage?: string | null
  vendorCategory?: string | null
  vendorPriority: number
  temporarilyClosed: boolean
  storeCity?: string | null
  storeState?: string | null
  vendorVerified: boolean
  vendorJoinedAt?: string | Date | null
  averageRating: number
  activeProductCount: number
  _count: {
    products: number
    orderItems: number
  }
}

interface SessionUserWithRole {
  role?: string
}

interface VendorCreateForm {
  email: string
  vendorName: string
  vendorDescription: string
  vendorImage: string
  storeBannerImage: string
  vendorCategory: string
  vendorPhoneNumber: string
  storeAddress: string
  storeCity: string
  storeState: string
  storeZipCode: string
  vendorPriority: string
}

type VendorSection = 'all' | 'created' | 'active' | 'catalog-inactive' | 'blocked'
type VendorSort = 'priority' | 'name' | 'rating' | 'orders' | 'latest'
type VendorTopTab = 'vendors' | 'orders' | 'balances' | 'statistics' | 'settings'
type VendorOrderRange = 'all' | '7' | '30' | '90'
type VendorOrderStatusFilter = 'all' | 'pending' | 'accepted' | 'courier_on_the_way' | 'completed' | 'declined' | 'cancelled' | 'paid'

interface VendorAdminOrderItem {
  id: string
  quantity: number
  price: number
  status: string
  deliveryFee: number
  vendorEarnings?: number
  product: {
    id: string
    name: string
  }
  vendor?: {
    id: string
    vendorName?: string | null
    storeAddress?: string | null
    storeCity?: string | null
    storeState?: string | null
  } | null
}

interface VendorAdminOrder {
  id: string
  orderNumber?: string
  total: number
  status: string
  createdAt: string
  user: {
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    email: string
  }
  items: VendorAdminOrderItem[]
}

const emptyCreateForm: VendorCreateForm = {
  email: '',
  vendorName: '',
  vendorDescription: '',
  vendorImage: '',
  storeBannerImage: '',
  vendorCategory: '',
  vendorPhoneNumber: '',
  storeAddress: '',
  storeCity: '',
  storeState: '',
  storeZipCode: '',
  vendorPriority: '0',
}

const topTabs = [
  { id: 'vendors', label: 'Vendors' },
  { id: 'orders', label: 'Orders' },
  { id: 'balances', label: 'Balances' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'settings', label: 'Settings' },
] as const

function formatJoinedAt(joinedAt?: string | Date | null) {
  if (!joinedAt) return 'Unknown'
  const date = new Date(joinedAt)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

function getVendorSection(vendor: VendorRow): VendorSection {
  if (!vendor.isActive) return 'blocked'
  if (!vendor.vendorVerified) return 'created'
  if (vendor.activeProductCount === 0) return 'catalog-inactive'
  return 'active'
}

function getStateBadge(vendor: VendorRow) {
  if (!vendor.isActive) {
    return { label: 'blocked', classes: 'bg-red-50 text-red-700' }
  }

  if (vendor.temporarilyClosed) {
    return { label: 'closed', classes: 'bg-slate-100 text-slate-700' }
  }

  if (!vendor.vendorVerified) {
    return { label: 'pending', classes: 'bg-amber-50 text-amber-700' }
  }

  return { label: 'open', classes: 'bg-emerald-50 text-emerald-700' }
}

function getModeBadge(vendor: VendorRow) {
  if (!vendor.isActive) {
    return { label: 'blocked', classes: 'bg-red-50 text-red-700' }
  }

  if (!vendor.vendorVerified) {
    return { label: 'review', classes: 'bg-amber-50 text-amber-700' }
  }

  return { label: 'live', classes: 'bg-emerald-50 text-emerald-700' }
}

export default function AdminVendorsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [activeSection, setActiveSection] = useState<VendorSection>('all')
  const [activeTopTab, setActiveTopTab] = useState<VendorTopTab>('vendors')
  const [sortBy, setSortBy] = useState<VendorSort>('latest')
  const [search, setSearch] = useState('')
  const [createForm, setCreateForm] = useState<VendorCreateForm>(emptyCreateForm)
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'banner' | null>(null)
  const [vendorOrders, setVendorOrders] = useState<VendorAdminOrder[]>([])
  const [vendorOrderRange, setVendorOrderRange] = useState<VendorOrderRange>('30')
  const [vendorOrderStatus, setVendorOrderStatus] = useState<VendorOrderStatusFilter>('all')

  useEffect(() => {
    const urlTab = searchParams.get('tab')
    const urlSection = searchParams.get('section')
    const urlSort = searchParams.get('sort')
    const urlSearch = searchParams.get('search')
    const urlCreate = searchParams.get('create')

    if (urlTab && isVendorTopTab(urlTab)) {
      setActiveTopTab(urlTab)
    }
    if (urlSection && isVendorSection(urlSection)) {
      setActiveSection(urlSection)
    }
    if (urlSort && isVendorSort(urlSort)) {
      setSortBy(urlSort)
    }
    setSearch(urlSearch || '')
    setShowCreatePanel(urlCreate === '1')
  }, [searchParams])

  useEffect(() => {
    if (session?.user && (session.user as SessionUserWithRole).role !== 'admin') {
      router.push('/')
      return
    }

    void fetchVendors()
  }, [session, router])

  useEffect(() => {
    if (activeTopTab !== 'orders') {
      return
    }

    void fetchVendorOrders()
  }, [activeTopTab])

  useEffect(() => {
    if (activeTopTab === 'vendors' && activeSection === 'all' && sortBy === 'priority') {
      setSortBy('latest')
    }
  }, [activeSection, activeTopTab, sortBy])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', activeTopTab)
    params.set('section', activeSection)
    params.set('sort', sortBy)

    if (search.trim()) {
      params.set('search', search)
    } else {
      params.delete('search')
    }

    if (showCreatePanel) {
      params.set('create', '1')
    } else {
      params.delete('create')
    }

    const nextUrl = `${pathname}?${params.toString()}`
    const currentUrl = `${pathname}?${searchParams.toString()}`

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [activeSection, activeTopTab, pathname, router, search, searchParams, showCreatePanel, sortBy])

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors')
      if (res.ok) {
        const data = (await res.json()) as VendorRow[]
        setVendors(data)
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendorOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders')
      if (res.ok) {
        const data = (await res.json()) as VendorAdminOrder[]
        setVendorOrders(data)
      }
    } catch (error) {
      console.error('Failed to fetch vendor orders:', error)
    }
  }

  const sectionCounts = useMemo(
    () => ({
      all: vendors.length,
      created: vendors.filter((vendor) => getVendorSection(vendor) === 'created').length,
      active: vendors.filter((vendor) => getVendorSection(vendor) === 'active').length,
      'catalog-inactive': vendors.filter((vendor) => getVendorSection(vendor) === 'catalog-inactive').length,
      blocked: vendors.filter((vendor) => getVendorSection(vendor) === 'blocked').length,
    }),
    [vendors]
  )

  const balanceSummary = useMemo(() => {
    const totalBalance = vendors.reduce((sum, vendor) => sum + vendor.accountBalance, 0)
    const positiveBalanceCount = vendors.filter((vendor) => vendor.accountBalance > 0).length
    const topBalance = [...vendors].sort((a, b) => b.accountBalance - a.accountBalance)[0]

    return {
      totalBalance,
      positiveBalanceCount,
      topBalance,
    }
  }, [vendors])

  const statisticsSummary = useMemo(() => {
    const totalOrders = vendors.reduce((sum, vendor) => sum + vendor._count.orderItems, 0)
    const totalProducts = vendors.reduce((sum, vendor) => sum + vendor._count.products, 0)
    const activeCatalogVendors = vendors.filter((vendor) => vendor.activeProductCount > 0).length
    const averageRating =
      vendors.length > 0
        ? vendors.reduce((sum, vendor) => sum + vendor.averageRating, 0) / vendors.length
        : 0

    return {
      totalOrders,
      totalProducts,
      activeCatalogVendors,
      averageRating,
    }
  }, [vendors])

  const filteredVendors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    let next = vendors.filter((vendor) => {
      if (activeSection !== 'all' && getVendorSection(vendor) !== activeSection) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const haystack = [
        vendor.vendorName,
        vendor.email,
        vendor.vendorCategory,
        vendor.storeCity,
        vendor.storeState,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })

    next = [...next].sort((left, right) => {
      if (sortBy === 'name') {
        return (left.vendorName || left.email).localeCompare(right.vendorName || right.email)
      }

      if (sortBy === 'rating') {
        return right.averageRating - left.averageRating
      }

      if (sortBy === 'orders') {
        return right._count.orderItems - left._count.orderItems
      }

      if (sortBy === 'latest') {
        return new Date(right.vendorJoinedAt || 0).getTime() - new Date(left.vendorJoinedAt || 0).getTime()
      }

      return right.vendorPriority - left.vendorPriority
    })

    return next
  }, [activeSection, search, sortBy, vendors])

  const vendorOrderRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const now = Date.now()

    return vendorOrders
      .flatMap((order) =>
        order.items
          .filter((item) => item.vendor)
          .map((item) => ({
            id: item.id,
            orderId: order.id,
            orderNumber: order.orderNumber || order.id.slice(0, 8),
            createdAt: order.createdAt,
            orderStatus: order.status,
            itemStatus: item.status,
            customerName:
              [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
              order.user.name ||
              order.user.email,
            customerEmail: order.user.email,
            vendorName: item.vendor?.vendorName || 'Unknown vendor',
            productName: item.product.name,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
            vendorEarnings: item.vendorEarnings ?? 0,
          }))
      )
      .filter((row) => {
        if (vendorOrderStatus !== 'all' && row.itemStatus !== vendorOrderStatus && row.orderStatus !== vendorOrderStatus) {
          return false
        }

        if (vendorOrderRange !== 'all') {
          const days = Number(vendorOrderRange)
          const diff = now - new Date(row.createdAt).getTime()
          if (diff > days * 24 * 60 * 60 * 1000) {
            return false
          }
        }

        if (!normalizedSearch) {
          return true
        }

        const haystack = `${row.orderNumber} ${row.customerName} ${row.customerEmail} ${row.vendorName} ${row.productName}`.toLowerCase()
        return haystack.includes(normalizedSearch)
      })
  }, [search, vendorOrderRange, vendorOrderStatus, vendorOrders])

  const vendorOrderSummary = useMemo(() => {
    return {
      rows: vendorOrderRows.length,
      revenue: vendorOrderRows.reduce((sum, row) => sum + row.lineTotal, 0),
      vendorEarnings: vendorOrderRows.reduce((sum, row) => sum + row.vendorEarnings, 0),
      completed: vendorOrderRows.filter((row) => row.itemStatus === 'completed').length,
    }
  }, [vendorOrderRows])

  function exportVendorOrders() {
    const header = [
      'Order Number',
      'Created At',
      'Vendor',
      'Product',
      'Customer',
      'Customer Email',
      'Order Status',
      'Item Status',
      'Quantity',
      'Line Total',
      'Vendor Settlement',
    ]

    const rows = vendorOrderRows.map((row) => [
      row.orderNumber,
      new Date(row.createdAt).toISOString(),
      row.vendorName,
      row.productName,
      row.customerName,
      row.customerEmail,
      row.orderStatus,
      row.itemStatus,
      String(row.quantity),
      row.lineTotal.toFixed(2),
      row.vendorEarnings.toFixed(2),
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vendor-order-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleCreateAssetChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'vendorImage' | 'storeBannerImage'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAsset(field === 'vendorImage' ? 'logo' : 'banner')
    try {
      const image = await uploadAdminVendorAsset(file)
      setCreateForm((current) => ({
        ...current,
        [field]: image,
      }))
    } catch (error) {
      console.error('Failed to upload asset:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload asset')
    } finally {
      setUploadingAsset(null)
      event.target.value = ''
    }
  }

  const handleCreateVendor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          vendorPriority: Number.parseInt(createForm.vendorPriority || '0', 10),
          vendorVerified: true,
        }),
      })

      const response = await res.json()
      if (!res.ok) {
        throw new Error(response.error || 'Failed to create vendor')
      }

      setCreateForm({ ...emptyCreateForm })
      setShowCreatePanel(false)
      await fetchVendors()
      alert(`Vendor created. Temporary password for ${response.vendor.vendorName}: ${response.temporaryPassword}`)
    } catch (error) {
      console.error('Failed to create vendor:', error)
      alert(error instanceof Error ? error.message : 'Failed to create vendor')
    } finally {
      setCreating(false)
    }
  }

  const handleImpersonate = async (vendorId: string) => {
    setProcessing(vendorId)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId }),
      })

      if (res.ok) {
        router.push('/vendor/dashboard')
      } else {
        alert('Failed to impersonate vendor')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error impersonating vendor')
    } finally {
      setProcessing(null)
    }
  }

  const handleSetVendorVerified = async (
    vendorId: string,
    verified: boolean
  ) => {
    setProcessing(vendorId)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          verified,
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to update vendor')
      }

      await fetchVendors()
    } catch (error) {
      console.error('Failed to update vendor verification:', error)
      alert(error instanceof Error ? error.message : 'Failed to update vendor')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">Loading vendors...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <div className="mr-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800">
            <Store className="h-4 w-4" />
            Vendors
          </div>
          {topTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTopTab(tab.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                tab.id === activeTopTab
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AdminPageHeader
          title={getTabTitle(activeTopTab)}
          description={`Latest update ${new Date().toLocaleString()}`}
          action={
            <>
              <button
                onClick={() => void fetchVendors()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                title="Refresh vendors"
              >
                <Loader className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as VendorSort)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400"
                title="Sort vendors"
              >
                <option value="name">Sort by name</option>
                <option value="rating">Sort by rating</option>
                <option value="orders">Sort by orders</option>
                <option value="latest">Sort by latest</option>
                {activeTopTab === 'settings' ? <option value="priority">Sort by priority</option> : null}
              </select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 outline-none focus:border-blue-400"
                />
              </div>
            </>
          }
        />

        <div className="min-w-0 p-3.5 md:p-4">
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard
              icon={Store}
              label="Vendor Accounts"
              value={vendors.length}
              helper="All vendor records in the marketplace"
            />
            <AdminStatCard
              icon={CheckCircle2}
              label="Live Vendors"
              value={sectionCounts.active}
              helper="Verified vendors with active catalog presence"
            />
            <AdminStatCard
              icon={Clock3}
              label="Review Queue"
              value={sectionCounts.created}
              helper="Vendors still waiting for approval"
            />
            <AdminStatCard
              icon={BarChart3}
              label="Catalog Active"
              value={statisticsSummary.activeCatalogVendors}
              helper="Vendors with products currently live"
            />
            <AdminStatCard
              icon={Wallet}
              label="Vendor Balance"
              value={`US$${balanceSummary.totalBalance.toFixed(2)}`}
              helper="Combined vendor wallet balance"
            />
          </div>

          <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">Vendor Filters</div>
              <button
                onClick={() => setShowCreatePanel((current) => !current)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                title="Add vendor"
              >
                <Plus className="h-4 w-4" />
                Add Vendor
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All vendors' },
                { id: 'created', label: 'Created' },
                { id: 'active', label: 'Active' },
                { id: 'catalog-inactive', label: 'Catalog inactive' },
                { id: 'blocked', label: 'Blocked' },
              ].map((section) => {
                const sectionId = section.id as VendorSection
                const active = activeSection === sectionId

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(sectionId)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                        : 'bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>{section.label}</span>
                    <span className={`${active ? 'text-blue-700' : 'text-slate-400'}`}>
                      {sectionCounts[sectionId]}
                    </span>
                    {active ? <ChevronRight className="h-3.5 w-3.5 text-blue-700" /> : null}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{sectionCounts.active} live vendors</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                <Clock3 className="h-4 w-4 text-amber-600" />
                <span>{sectionCounts.created} awaiting review</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>{sectionCounts.blocked} blocked vendors</span>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {showCreatePanel ? (
              <form onSubmit={handleCreateVendor} className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Create Vendor</h2>
                    <p className="mt-1 text-xs text-slate-500">Add a new vendor from admin and share the temporary password after creation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreatePanel(false)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <input value={createForm.vendorName} onChange={(e) => setCreateForm((c) => ({ ...c, vendorName: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Vendor name" />
                  <input type="email" value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Vendor email" />
                  <input value={createForm.vendorCategory} onChange={(e) => setCreateForm((c) => ({ ...c, vendorCategory: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Category" />
                  <input type="number" min="0" value={createForm.vendorPriority} onChange={(e) => setCreateForm((c) => ({ ...c, vendorPriority: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Priority" />
                  <input value={createForm.vendorPhoneNumber} onChange={(e) => setCreateForm((c) => ({ ...c, vendorPhoneNumber: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Phone number" />
                  <input value={createForm.storeCity} onChange={(e) => setCreateForm((c) => ({ ...c, storeCity: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="City" />
                  <input value={createForm.storeState} onChange={(e) => setCreateForm((c) => ({ ...c, storeState: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="State" />
                  <input value={createForm.storeZipCode} onChange={(e) => setCreateForm((c) => ({ ...c, storeZipCode: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Zip code" />
                  <input value={createForm.storeAddress} onChange={(e) => setCreateForm((c) => ({ ...c, storeAddress: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Store address" />
                  <textarea value={createForm.vendorDescription} onChange={(e) => setCreateForm((c) => ({ ...c, vendorDescription: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Store description" rows={3} />

                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Store Logo</p>
                        <p className="text-xs text-slate-500">Upload a brand image.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200">
                        {uploadingAsset === 'logo' ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleCreateAssetChange(event, 'vendorImage')} />
                      </label>
                    </div>
                    {createForm.vendorImage ? (
                      <div className="relative mt-3 h-16 w-16 overflow-hidden rounded-full border border-slate-200">
                        <Image src={createForm.vendorImage} alt="Vendor logo preview" fill className="object-cover" />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Store Banner</p>
                        <p className="text-xs text-slate-500">Used on the storefront and vendor listings.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200">
                        {uploadingAsset === 'banner' ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleCreateAssetChange(event, 'storeBannerImage')} />
                      </label>
                    </div>
                    {createForm.storeBannerImage ? (
                      <div className="relative mt-3 h-20 w-full overflow-hidden rounded-lg border border-slate-200">
                        <Image src={createForm.storeBannerImage} alt="Vendor banner preview" fill className="object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {creating ? 'Creating...' : 'Create Vendor'}
                  </button>
                </div>
              </form>
            ) : null}

            {activeTopTab === 'vendors' ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <AdminTableWrap>
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Name</th>
                          <th className="px-3 py-2 text-left font-semibold">State</th>
                          <th className="px-3 py-2 text-left font-semibold">Mode</th>
                          <th className="px-3 py-2 text-left font-semibold">Legal entity</th>
                          <th className="px-3 py-2 text-left font-semibold">Activated</th>
                          <th className="px-3 py-2 text-left font-semibold">Rating</th>
                          <th className="px-3 py-2 text-left font-semibold">Balance</th>
                          <th className="px-3 py-2 text-left font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVendors.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                              No vendors match the current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredVendors.map((vendor) => {
                            const stateBadge = getStateBadge(vendor)
                            const modeBadge = getModeBadge(vendor)

                            return (
                              <tr key={vendor.id} className="border-t border-slate-100">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                                      {vendor.vendorImage ? (
                                        <Image src={vendor.vendorImage} alt={vendor.vendorName || vendor.email} fill className="object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-700">
                                          {(vendor.vendorName || vendor.email).slice(0, 1).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-medium text-slate-900">
                                        {vendor.vendorName || vendor.email}
                                      </span>
                                      <p className="text-xs text-slate-500">{vendor.vendorCategory || 'Vendor'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${stateBadge.classes}`}>
                                    {stateBadge.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${modeBadge.classes}`}>
                                    {modeBadge.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {vendor.vendorName || vendor.email}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {formatJoinedAt(vendor.vendorJoinedAt)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="inline-flex items-center gap-1 font-medium text-slate-900">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    {vendor.averageRating > 0 ? vendor.averageRating.toFixed(2) : '0.00'}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="inline-flex items-center gap-1.5 text-slate-700">
                                    <Wallet className="h-4 w-4 text-slate-400" />
                                    US${vendor.accountBalance.toFixed(2)}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {!vendor.vendorVerified ? (
                                      <button
                                        onClick={() => void handleSetVendorVerified(vendor.id, true)}
                                        disabled={processing === vendor.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Approve
                                      </button>
                                    ) : null}
                                    <Link
                                      href={`/admin/vendors/${vendor.id}/edit`}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                                    >
                                      <FileCog className="h-3.5 w-3.5" />
                                      Edit vendor
                                    </Link>
                                    <button
                                      onClick={() => handleImpersonate(vendor.id)}
                                      disabled={processing === vendor.id}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Login as vendor
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </AdminTableWrap>
                </div>
              </div>
            ) : null}

            {activeTopTab === 'orders' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <AdminStatCard
                    icon={Receipt}
                    label="Vendor Order Rows"
                    value={vendorOrderSummary.rows}
                    helper="Vendor-linked order lines across all stores"
                  />
                  <AdminStatCard
                    icon={Wallet}
                    label="Gross Sales"
                    value={`US$${vendorOrderSummary.revenue.toFixed(2)}`}
                    helper="Combined vendor line totals"
                  />
                  <AdminStatCard
                    icon={CreditCard}
                    label="Vendor Settlement"
                    value={`US$${vendorOrderSummary.vendorEarnings.toFixed(2)}`}
                    helper="Tracked vendor earnings on order lines"
                  />
                  <AdminStatCard
                    icon={CheckCircle2}
                    label="Completed Lines"
                    value={vendorOrderSummary.completed}
                    helper="Vendor order lines marked completed"
                  />
                </div>

                <AdminSectionCard
                  title="All Vendor Order History"
                  description="Sales and order lines across every vendor in the marketplace."
                  action={
                    <>
                      <select
                        value={vendorOrderRange}
                        onChange={(event) => setVendorOrderRange(event.target.value as VendorOrderRange)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                        title="Filter vendor orders by date range"
                      >
                        <option value="all">All dates</option>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                      </select>
                      <select
                        value={vendorOrderStatus}
                        onChange={(event) => setVendorOrderStatus(event.target.value as VendorOrderStatusFilter)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                        title="Filter vendor orders by status"
                      >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="courier_on_the_way">Courier on the way</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="paid">Paid</option>
                      </select>
                      <button
                        onClick={exportVendorOrders}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Export CSV
                      </button>
                    </>
                  }
                  contentClassName="p-0"
                >
                  <AdminTableWrap>
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Order</th>
                          <th className="px-3 py-2 text-left font-semibold">Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold">Product</th>
                          <th className="px-3 py-2 text-left font-semibold">Customer</th>
                          <th className="px-3 py-2 text-left font-semibold">Qty</th>
                          <th className="px-3 py-2 text-left font-semibold">Line Total</th>
                          <th className="px-3 py-2 text-left font-semibold">Settlement</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorOrderRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                              No vendor order history matches the current search.
                            </td>
                          </tr>
                        ) : (
                          vendorOrderRows.map((row) => (
                            <tr key={row.id} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">
                                <p className="font-medium text-slate-900">#{row.orderNumber}</p>
                                <p className="text-[11px] text-slate-400">{new Date(row.createdAt).toLocaleString()}</p>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{row.vendorName}</td>
                              <td className="px-3 py-2 text-slate-700">{row.productName}</td>
                              <td className="px-3 py-2 text-slate-700">
                                <p>{row.customerName}</p>
                                <p className="text-[11px] text-slate-400">{row.customerEmail}</p>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{row.quantity}</td>
                              <td className="px-3 py-2 text-slate-700">US${row.lineTotal.toFixed(2)}</td>
                              <td className="px-3 py-2 text-slate-700">US${row.vendorEarnings.toFixed(2)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${row.itemStatus === 'completed' ? 'bg-emerald-50 text-emerald-700' : row.itemStatus === 'accepted' ? 'bg-amber-50 text-amber-700' : row.itemStatus === 'declined' || row.itemStatus === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {row.itemStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </AdminTableWrap>
                </AdminSectionCard>
              </div>
            ) : null}

            {activeTopTab === 'balances' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                  <AdminStatCard
                    icon={Wallet}
                    label="Total Vendor Balance"
                    value={`US$${balanceSummary.totalBalance.toFixed(2)}`}
                    helper="Combined balance across all vendor accounts"
                  />
                  <AdminStatCard
                    icon={CreditCard}
                    label="Vendors With Balance"
                    value={balanceSummary.positiveBalanceCount}
                    helper="Accounts with funds available"
                  />
                  <AdminStatCard
                    icon={Store}
                    label="Top Balance Holder"
                    value={balanceSummary.topBalance?.vendorName || 'None'}
                    helper={balanceSummary.topBalance ? `US$${balanceSummary.topBalance.accountBalance.toFixed(2)}` : 'No balances yet'}
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <AdminTableWrap>
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold">Balance</th>
                          <th className="px-3 py-2 text-left font-semibold">Orders</th>
                          <th className="px-3 py-2 text-left font-semibold">Products</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                          <th className="px-3 py-2 text-left font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredVendors]
                          .sort((a, b) => b.accountBalance - a.accountBalance)
                          .map((vendor) => (
                            <tr key={vendor.id} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-900">{vendor.vendorName || vendor.email}</td>
                              <td className="px-3 py-2 text-slate-700">US${vendor.accountBalance.toFixed(2)}</td>
                              <td className="px-3 py-2 text-slate-700">{vendor._count.orderItems}</td>
                              <td className="px-3 py-2 text-slate-700">{vendor._count.products}</td>
                              <td className="px-3 py-2 text-slate-700">{getModeBadge(vendor).label}</td>
                              <td className="px-3 py-2 text-[11px] font-semibold text-slate-500">Account listed</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </AdminTableWrap>
                </div>
              </div>
            ) : null}

            {activeTopTab === 'statistics' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                  <AdminStatCard
                    icon={Store}
                    label="Total Vendors"
                    value={vendors.length}
                    helper="All vendor accounts in the marketplace"
                  />
                  <AdminStatCard
                    icon={BarChart3}
                    label="Order Items"
                    value={statisticsSummary.totalOrders}
                    helper="Vendor order line items processed"
                  />
                  <AdminStatCard
                    icon={CheckCircle2}
                    label="Active Catalog Vendors"
                    value={statisticsSummary.activeCatalogVendors}
                    helper="Verified vendors with in-stock products"
                  />
                  <AdminStatCard
                    icon={Star}
                    label="Average Rating"
                    value={statisticsSummary.averageRating.toFixed(2)}
                    helper="Average vendor product rating"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <AdminInsightCard
                    title="Catalog Health"
                    items={[
                      `${statisticsSummary.totalProducts} total products across vendor catalogs`,
                      `${sectionCounts['catalog-inactive']} vendors need active catalog items`,
                      `${sectionCounts.created} vendors are still waiting for activation review`,
                    ]}
                  />
                  <AdminInsightCard
                    title="Performance Focus"
                    items={[
                      `${sectionCounts.active} vendors are currently live`,
                      `${filteredVendors.filter((vendor) => vendor.averageRating >= 4).length} filtered vendors have a 4.0+ rating`,
                      `${filteredVendors.filter((vendor) => vendor._count.orderItems > 0).length} filtered vendors have started receiving orders`,
                    ]}
                  />
                </div>
              </div>
            ) : null}

            {activeTopTab === 'settings' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                  <AdminStatCard
                    icon={FileCog}
                    label="Editable Vendors"
                    value={vendors.length}
                    helper="Every vendor can be updated from the edit screen"
                  />
                  <AdminStatCard
                    icon={Upload}
                    label="Banner Ready"
                    value={vendors.filter((vendor) => vendor.storeBannerImage).length}
                    helper="Vendors with uploaded storefront banners"
                  />
                  <AdminStatCard
                    icon={CheckCircle2}
                    label="Verified"
                    value={vendors.filter((vendor) => vendor.vendorVerified).length}
                    helper="Ready for customer-facing visibility"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <AdminTableWrap>
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold">Priority</th>
                          <th className="px-3 py-2 text-left font-semibold">Banner</th>
                          <th className="px-3 py-2 text-left font-semibold">Verification</th>
                          <th className="px-3 py-2 text-left font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVendors.map((vendor) => (
                          <tr key={vendor.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-900">{vendor.vendorName || vendor.email}</td>
                            <td className="px-3 py-2 text-slate-700">{vendor.vendorPriority}</td>
                            <td className="px-3 py-2 text-slate-700">{vendor.storeBannerImage ? 'Uploaded' : 'Missing'}</td>
                            <td className="px-3 py-2 text-slate-700">{vendor.vendorVerified ? 'Verified' : 'Pending'}</td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2">
                                {!vendor.vendorVerified ? (
                                  <button
                                    onClick={() => void handleSetVendorVerified(vendor.id, true)}
                                    disabled={processing === vendor.id}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    Approve
                                  </button>
                                ) : null}
                                <Link
                                  href={`/admin/vendors/${vendor.id}`}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                                >
                                  View details
                                </Link>
                                <Link
                                  href={`/admin/vendors/${vendor.id}/edit`}
                                  className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                                >
                                  Edit vendor
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </AdminTableWrap>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTabTitle(tab: VendorTopTab) {
  if (tab === 'orders') return 'Vendor Order History'
  if (tab === 'balances') return 'Vendor Balances'
  if (tab === 'statistics') return 'Vendor Statistics'
  if (tab === 'settings') return 'Vendor Settings'
  return 'Active Vendors'
}

function isVendorTopTab(value: string): value is VendorTopTab {
  return ['vendors', 'orders', 'balances', 'statistics', 'settings'].includes(value)
}

function isVendorSection(value: string): value is VendorSection {
  return ['all', 'created', 'active', 'catalog-inactive', 'blocked'].includes(value)
}

function isVendorSort(value: string): value is VendorSort {
  return ['priority', 'name', 'rating', 'orders', 'latest'].includes(value)
}
