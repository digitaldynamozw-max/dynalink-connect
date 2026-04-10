'use client'

import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BadgeDollarSign,
  BellRing,
  CheckCircle2,
  Gift,
  ImagePlus,
  Loader2,
  Megaphone,
  Search,
  ShieldBan,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import { AdminBadge, AdminPageHeader, AdminQuickLinkCard, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'
import { uploadAdminVendorAsset } from '@/lib/admin/vendor-assets'

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string
  joinedAt: string
  lastSeen: string
  lastOrderAt: string
  orders: number
  totalSpend: number
  averageOrder: number
  reviews: number
  referrals: number
  status: 'Active' | 'Blacklisted'
}

type VendorRow = {
  id: string
  vendorName: string
  category: string
  priority: number
  status: string
  products: number
  orders: number
  averageRating: number
  bannersReady: boolean
}

type PromoRow = {
  id: string
  code: string
  discount: number
  uses: number
  maxUses: number
  expiresAt: string
  owner: string
  ownerId: string
  status: 'Active' | 'Inactive'
  description: string
  minPurchase: number
  createdAt: string
}

type ReferralRow = {
  id: string
  referrer: string
  referred: string
  rewardAmount: number
  status: string
  createdAt: string
}

type MarketingSettings = {
  companyName: string
  heroBadge: string
  heroTitle: string
  heroSubtitle: string
  heroBackgroundImage: string
  heroForegroundImage: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
  whatsappNumber: string
  referralEnabled: boolean
  referralRewardAmount: number
  referralHeadline: string
}

type MarketingStats = {
  activeCustomers: number
  blacklistedCustomers: number
  totalVendors: number
  verifiedVendors: number
  activePromoCodes: number
  inactivePromoCodes: number
  totalReferrals: number
  completedReferrals: number
  revenueWindow: number
  ordersWindow: number
  averageRating: number
  ratingsWindow: number
  activeCustomersThisWeek: number
}

type DailyOrderPoint = {
  date: string
  label: string
  orders: number
  revenue: number
}

type DailyRatingPoint = {
  date: string
  label: string
  ratings: number
  average: number
}

type ActivityRow = {
  id: string
  label: string
  meta: string
  at: string
}

type CustomerOption = {
  id: string
  label: string
  secondary: string
}

type TabId = 'overview' | 'customers' | 'statistics' | 'banners' | 'vendors' | 'promo' | 'referrals'

const tabs: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'customers', label: 'Clients', icon: Users },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'banners', label: 'Hero Banners', icon: Megaphone },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'promo', label: 'Promo Codes', icon: BadgeDollarSign },
  { id: 'referrals', label: 'Referrals', icon: Gift },
]

export function AdminMarketingDashboard({
  customers: initialCustomers,
  vendors: initialVendors,
  promoCodes: initialPromoCodes,
  referrals: initialReferrals,
  settings: initialSettings,
  customerOptions,
  stats,
  ordersPerDay,
  ratingsPerDay,
  activityFeed,
  latestUpdate,
}: {
  customers: CustomerRow[]
  vendors: VendorRow[]
  promoCodes: PromoRow[]
  referrals: ReferralRow[]
  settings: MarketingSettings
  customerOptions: CustomerOption[]
  stats: MarketingStats
  ordersPerDay: DailyOrderPoint[]
  ratingsPerDay: DailyRatingPoint[]
  activityFeed: ActivityRow[]
  latestUpdate: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [customers, setCustomers] = useState(initialCustomers)
  const [vendors, setVendors] = useState(initialVendors)
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes)
  const [referrals, setReferrals] = useState(initialReferrals)
  const [settings, setSettings] = useState(initialSettings)
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState<'all' | 'Active' | 'Blacklisted'>('all')
  const [promoFilter, setPromoFilter] = useState<'all' | 'Active' | 'Inactive'>('all')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialVendors.map((vendor) => [vendor.id, String(vendor.priority)]))
  )
  const [promoForm, setPromoForm] = useState({
    code: '',
    userId: customerOptions[0]?.id || '',
    discount: '10',
    maxUses: '100',
    minPurchase: '0',
    expiryDate: '',
    description: '',
  })

  const deferredSearch = useDeferredValue(search)

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesFilter = customerFilter === 'all' || customer.status === customerFilter
      const haystack = `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase()
      return matchesFilter && haystack.includes(deferredSearch.toLowerCase())
    })
  }, [customerFilter, customers, deferredSearch])

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) =>
      `${vendor.vendorName} ${vendor.category}`.toLowerCase().includes(deferredSearch.toLowerCase())
    )
  }, [deferredSearch, vendors])

  const filteredPromoCodes = useMemo(() => {
    return promoCodes.filter((promo) => {
      const matchesFilter = promoFilter === 'all' || promo.status === promoFilter
      const haystack = `${promo.code} ${promo.owner} ${promo.description}`.toLowerCase()
      return matchesFilter && haystack.includes(deferredSearch.toLowerCase())
    })
  }, [deferredSearch, promoCodes, promoFilter])

  const filteredReferrals = useMemo(() => {
    return referrals.filter((referral) =>
      `${referral.referrer} ${referral.referred} ${referral.status}`.toLowerCase().includes(deferredSearch.toLowerCase())
    )
  }, [deferredSearch, referrals])

  const localStats = useMemo(() => {
    return {
      activeCustomers: customers.filter((customer) => customer.status === 'Active').length,
      blacklistedCustomers: customers.filter((customer) => customer.status === 'Blacklisted').length,
      activePromoCodes: promoCodes.filter((promo) => promo.status === 'Active').length,
      inactivePromoCodes: promoCodes.filter((promo) => promo.status === 'Inactive').length,
      completedReferrals: referrals.filter((referral) => referral.status === 'completed').length,
    }
  }, [customers, promoCodes, referrals])

  const topOrderValue = Math.max(...ordersPerDay.map((item) => item.orders), 1)
  const topRatingCount = Math.max(...ratingsPerDay.map((item) => item.ratings), 1)

  const setFlash = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(null), 3000)
  }

  const updateCustomerStatus = async (customerId: string, nextActive: boolean) => {
    setBusyKey(`customer-${customerId}`)

    try {
      const response = await fetch(`/api/admin/clients/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update customer')
      }

      startTransition(() => {
        setCustomers((current) =>
          current.map((customer) =>
            customer.id === customerId
              ? { ...customer, status: nextActive ? 'Active' : 'Blacklisted' }
              : customer
          )
        )
      })
      setFlash(nextActive ? 'Customer activated' : 'Customer blacklisted')
    } catch (error) {
      console.error(error)
      setFlash('Customer update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const saveVendorPriority = async (vendorId: string) => {
    setBusyKey(`vendor-${vendorId}`)

    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorPriority: Number(priorityDrafts[vendorId] || '0'),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update vendor priority')
      }

      startTransition(() => {
        setVendors((current) =>
          [...current]
            .map((vendor) =>
              vendor.id === vendorId
                ? { ...vendor, priority: Number(priorityDrafts[vendorId] || '0') }
                : vendor
            )
            .sort((left, right) => right.priority - left.priority)
        )
      })
      setFlash('Vendor priority saved')
    } catch (error) {
      console.error(error)
      setFlash('Vendor priority update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const saveSettings = async () => {
    setBusyKey('settings')

    try {
      const response = await fetch('/api/admin/marketing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setFlash('Company hero settings saved')
    } catch (error) {
      console.error(error)
      setFlash('Hero settings update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const uploadBannerAsset = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'heroBackgroundImage' | 'heroForegroundImage'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusyKey(field)
    try {
      const image = await uploadAdminVendorAsset(file)
      setSettings((current) => ({ ...current, [field]: image }))
      setFlash(field === 'heroBackgroundImage' ? 'Hero background uploaded' : 'Hero panel image uploaded')
    } catch (error) {
      console.error(error)
      setFlash('Image upload failed')
    } finally {
      setBusyKey(null)
      event.target.value = ''
    }
  }

  const createPromoCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusyKey('promo-create')

    try {
      const response = await fetch('/api/admin/marketing/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create promo code')
      }

      const promo = payload.promoCode as {
        id: string
        code: string
        discount: number
        currentUses: number
        maxUses: number
        expiryDate: string
        description: string | null
        minPurchase: number
        createdAt: string
        user: { id: string; email: string; name: string | null; vendorName: string | null }
      }
      const expiresAtDate = new Date(promo.expiryDate)
      const isActive = expiresAtDate > new Date() && promo.currentUses < promo.maxUses

      startTransition(() => {
        setPromoCodes((current) => [
          {
            id: promo.id,
            code: promo.code,
            discount: promo.discount,
            uses: promo.currentUses,
            maxUses: promo.maxUses,
            expiresAt: expiresAtDate.toLocaleString('en-GB'),
            owner: promo.user.vendorName || promo.user.name || promo.user.email,
            ownerId: promo.user.id,
            status: isActive ? 'Active' : 'Inactive',
            description: promo.description || 'Discount code',
            minPurchase: promo.minPurchase,
            createdAt: new Date(promo.createdAt).toLocaleString('en-GB'),
          },
          ...current,
        ])
      })

      setPromoForm({
        code: '',
        userId: promoForm.userId,
        discount: '10',
        maxUses: '100',
        minPurchase: '0',
        expiryDate: '',
        description: '',
      })
      setFlash('Promo code created')
    } catch (error) {
      console.error(error)
      setFlash(error instanceof Error ? error.message : 'Promo code creation failed')
    } finally {
      setBusyKey(null)
    }
  }

  const updateReferral = async (referralId: string, status: string) => {
    setBusyKey(`referral-${referralId}`)

    try {
      const response = await fetch(`/api/admin/marketing/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rewardAmount: settings.referralRewardAmount,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update referral')
      }

      startTransition(() => {
        setReferrals((current) =>
          current.map((referral) =>
            referral.id === referralId
              ? { ...referral, status, rewardAmount: settings.referralRewardAmount }
              : referral
          )
        )
      })
      setFlash('Referral updated')
    } catch (error) {
      console.error(error)
      setFlash('Referral update failed')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Company Marketing Operations"
          description={`Switch between customer operations, analytics, homepage control, vendor priority, and campaign tools. Latest update ${latestUpdate}.`}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients, vendors, promo codes..."
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-400 md:w-72"
              />
            </div>
          }
        />

        <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 pt-3 sm:p-5 sm:pt-4">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard label="Active Clients" value={localStats.activeCustomers} helper="Reachable customer accounts" icon={Users} />
                <AdminStatCard label="Vendor Priority Queue" value={vendors.length} helper="Stores currently ranked for visibility" icon={Store} />
                <AdminStatCard label="Campaign Codes" value={localStats.activePromoCodes} helper={`${localStats.inactivePromoCodes} inactive or expired`} icon={BadgeDollarSign} />
                <AdminStatCard label="Ratings Window" value={stats.averageRating.toFixed(2)} helper={`${stats.ratingsWindow} reviews in 30 days`} icon={Star} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <AdminSectionCard
                  title="Recent Activity"
                  description="Orders, promo activity, and referral movement across the marketplace."
                >
                  <div className="space-y-3">
                    {activityFeed.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                        </div>
                        <span className="text-xs text-slate-400">{item.at}</span>
                      </div>
                    ))}
                  </div>
                </AdminSectionCard>

                <AdminSectionCard
                  title="Operational Focus"
                  description="What needs attention from the company team right now."
                >
                  <div className="space-y-3">
                    <FocusRow icon={ShieldBan} label={`${localStats.blacklistedCustomers} blacklisted clients need review cadence`} />
                    <FocusRow icon={Megaphone} label={`${vendors.filter((vendor) => !vendor.bannersReady).length} vendors still need banner-ready assets`} />
                    <FocusRow icon={Gift} label={`${referrals.filter((referral) => referral.status === 'pending').length} referrals are still pending action`} />
                    <FocusRow icon={TrendingUp} label={`${vendors.filter((vendor) => vendor.priority >= 8).length} vendors have high homepage priority`} />
                  </div>
                </AdminSectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'customers' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['all', 'Active', 'Blacklisted'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setCustomerFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      customerFilter === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {status === 'all' ? 'All clients' : status}
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <AdminTableWrap>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Client</th>
                        <th className="px-4 py-3 text-left font-semibold">Last seen</th>
                        <th className="px-4 py-3 text-left font-semibold">Orders</th>
                        <th className="px-4 py-3 text-left font-semibold">Value</th>
                        <th className="px-4 py-3 text-left font-semibold">Ratings</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{customer.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{customer.email} - {customer.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{customer.lastSeen}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div>{customer.orders} orders</div>
                            <div className="text-xs text-slate-500">Last order {customer.lastOrderAt}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div>US${customer.totalSpend.toFixed(2)}</div>
                            <div className="text-xs text-slate-500">Avg US${customer.averageOrder.toFixed(2)}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div>{customer.reviews} ratings</div>
                            <div className="text-xs text-slate-500">{customer.referrals} referrals received</div>
                          </td>
                          <td className="px-4 py-3">
                            <AdminBadge
                              label={customer.status}
                              tone={customer.status === 'Active' ? 'green' : 'red'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => void updateCustomerStatus(customer.id, customer.status !== 'Active')}
                              disabled={busyKey === `customer-${customer.id}`}
                              className={`rounded-xl px-4 py-2 text-xs font-semibold text-white ${
                                customer.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              } disabled:opacity-60`}
                            >
                              {busyKey === `customer-${customer.id}`
                                ? 'Saving...'
                                : customer.status === 'Active'
                                  ? 'Blacklist'
                                  : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AdminTableWrap>
              </div>
            </div>
          ) : null}

          {activeTab === 'statistics' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard label="Orders In 14 Days" value={ordersPerDay.reduce((sum, item) => sum + item.orders, 0)} helper="Daily company demand" icon={BarChart3} />
                <AdminStatCard label="Revenue In 14 Days" value={`US$${ordersPerDay.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}`} helper="Revenue tracked per day" icon={TrendingUp} />
                <AdminStatCard label="Ratings Logged" value={ratingsPerDay.reduce((sum, item) => sum + item.ratings, 0)} helper="New reviews captured" icon={Star} />
                <AdminStatCard label="Weekly Active Clients" value={stats.activeCustomersThisWeek} helper="Customers with recent activity" icon={Activity} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <AdminSectionCard title="Orders Per Day" description="Daily marketplace order flow for the last 14 days.">
                  <div className="space-y-3">
                    {ordersPerDay.map((point) => (
                      <ChartRow
                        key={point.date}
                        label={point.label}
                        value={`${point.orders} orders`}
                        helper={`US$${point.revenue.toFixed(2)}`}
                        width={`${Math.max((point.orders / topOrderValue) * 100, 4)}%`}
                        colorClass="bg-[linear-gradient(90deg,_#0f766e,_#22c55e)]"
                      />
                    ))}
                  </div>
                </AdminSectionCard>

                <AdminSectionCard title="Ratings Per Day" description="Review volume and score trend for the last 14 days.">
                  <div className="space-y-3">
                    {ratingsPerDay.map((point) => (
                      <ChartRow
                        key={point.date}
                        label={point.label}
                        value={`${point.ratings} ratings`}
                        helper={point.ratings > 0 ? `${point.average.toFixed(2)} avg score` : 'No ratings'}
                        width={`${Math.max((point.ratings / topRatingCount) * 100, 4)}%`}
                        colorClass="bg-[linear-gradient(90deg,_#1d4ed8,_#60a5fa)]"
                      />
                    ))}
                  </div>
                </AdminSectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'banners' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <AdminSectionCard
                  title="Homepage Hero Preview"
                  description="This controls the main company hero that customers see first."
                >
                  <div
                    className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white"
                    style={{
                      backgroundImage: settings.heroBackgroundImage
                        ? `linear-gradient(135deg, rgba(2,6,23,0.78), rgba(15,23,42,0.62)), url(${settings.heroBackgroundImage})`
                        : 'linear-gradient(135deg, #0f172a, #164e63)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-100">
                          {settings.heroBadge}
                        </p>
                        <h3 className="mt-4 text-3xl font-semibold">{settings.heroTitle}</h3>
                        <p className="mt-3 max-w-xl text-sm text-slate-200">{settings.heroSubtitle}</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                            {settings.primaryCtaLabel}
                          </span>
                          <span className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white">
                            {settings.secondaryCtaLabel}
                          </span>
                        </div>
                      </div>
                      <div className="hidden lg:block">
                        {settings.heroForegroundImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={settings.heroForegroundImage}
                            alt="Hero preview"
                            className="h-72 w-full rounded-[1.5rem] object-cover shadow-2xl"
                          />
                        ) : (
                          <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-white/20 bg-white/5 text-sm text-slate-300">
                            Foreground image preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AdminSectionCard>

                <AdminSectionCard
                  title="Hero Settings"
                  description="Update banner content, CTAs, and referral messaging."
                >
                  <div className="grid gap-3">
                    <input value={settings.companyName} onChange={(event) => setSettings((current) => ({ ...current, companyName: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Company name" />
                    <input value={settings.heroBadge} onChange={(event) => setSettings((current) => ({ ...current, heroBadge: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero badge" />
                    <input value={settings.heroTitle} onChange={(event) => setSettings((current) => ({ ...current, heroTitle: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero title" />
                    <textarea value={settings.heroSubtitle} onChange={(event) => setSettings((current) => ({ ...current, heroSubtitle: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero subtitle" rows={3} />
                    <div className="grid grid-cols-1 gap-3">
                      <input value={settings.primaryCtaLabel} onChange={(event) => setSettings((current) => ({ ...current, primaryCtaLabel: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Primary CTA label" />
                      <input value={settings.primaryCtaHref} onChange={(event) => setSettings((current) => ({ ...current, primaryCtaHref: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Primary CTA href" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <input value={settings.secondaryCtaLabel} onChange={(event) => setSettings((current) => ({ ...current, secondaryCtaLabel: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Secondary CTA label" />
                      <input value={settings.secondaryCtaHref} onChange={(event) => setSettings((current) => ({ ...current, secondaryCtaHref: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Secondary CTA href" />
                    </div>
                    <input value={settings.whatsappNumber} onChange={(event) => setSettings((current) => ({ ...current, whatsappNumber: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="WhatsApp number" />
                    <input value={settings.referralHeadline} onChange={(event) => setSettings((current) => ({ ...current, referralHeadline: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Referral headline" />
                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                        <span>Referral system enabled</span>
                        <input type="checkbox" checked={settings.referralEnabled} onChange={(event) => setSettings((current) => ({ ...current, referralEnabled: event.target.checked }))} />
                      </label>
                      <input type="number" min="0" step="0.01" value={settings.referralRewardAmount} onChange={(event) => setSettings((current) => ({ ...current, referralRewardAmount: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Referral reward" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <UploadCard
                        label="Hero background"
                        busy={busyKey === 'heroBackgroundImage'}
                        onChange={(event) => void uploadBannerAsset(event, 'heroBackgroundImage')}
                      />
                      <UploadCard
                        label="Hero panel image"
                        busy={busyKey === 'heroForegroundImage'}
                        onChange={(event) => void uploadBannerAsset(event, 'heroForegroundImage')}
                      />
                    </div>
                    <button
                      onClick={() => void saveSettings()}
                      disabled={busyKey === 'settings'}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {busyKey === 'settings' ? 'Saving...' : 'Save company hero settings'}
                    </button>
                  </div>
                </AdminSectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'vendors' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard label="Verified Vendors" value={stats.verifiedVendors} helper="Ready for customer-facing promotion" icon={CheckCircle2} />
                <AdminStatCard label="Banner Ready" value={vendors.filter((vendor) => vendor.bannersReady).length} helper="Stores with usable visuals" icon={ImagePlus} />
                <AdminStatCard label="Priority Leaders" value={vendors.filter((vendor) => vendor.priority >= 8).length} helper="Stores in the top priority band" icon={TrendingUp} />
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <AdminTableWrap>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Vendor</th>
                        <th className="px-4 py-3 text-left font-semibold">Performance</th>
                        <th className="px-4 py-3 text-left font-semibold">Priority</th>
                        <th className="px-4 py-3 text-left font-semibold">Assets</th>
                        <th className="px-4 py-3 text-left font-semibold">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{vendor.vendorName}</p>
                            <p className="mt-1 text-xs text-slate-500">{vendor.category} - {vendor.status}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div>{vendor.orders} order items</div>
                            <div className="text-xs text-slate-500">{vendor.products} products - {vendor.averageRating.toFixed(2)} rating</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={priorityDrafts[vendor.id] || '0'}
                                onChange={(event) =>
                                  setPriorityDrafts((current) => ({ ...current, [vendor.id]: event.target.value }))
                                }
                                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => void saveVendorPriority(vendor.id)}
                                disabled={busyKey === `vendor-${vendor.id}`}
                                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AdminBadge label={vendor.bannersReady ? 'Banner Ready' : 'Needs Banner'} tone={vendor.bannersReady ? 'green' : 'amber'} />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-500">Managed in Vendors page</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AdminTableWrap>
              </div>
            </div>
          ) : null}

          {activeTab === 'promo' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <AdminSectionCard title="Create Promo Code" description="Launch new active or future campaign codes for selected clients.">
                  <form onSubmit={createPromoCode} className="grid gap-3">
                    <input value={promoForm.code} onChange={(event) => setPromoForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="WELCOME25" />
                    <select value={promoForm.userId} onChange={(event) => setPromoForm((current) => ({ ...current, userId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
                      {customerOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} ({option.secondary})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 gap-3">
                      <input type="number" min="1" value={promoForm.discount} onChange={(event) => setPromoForm((current) => ({ ...current, discount: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Discount %" />
                      <input type="number" min="1" value={promoForm.maxUses} onChange={(event) => setPromoForm((current) => ({ ...current, maxUses: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Max uses" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <input type="number" min="0" step="0.01" value={promoForm.minPurchase} onChange={(event) => setPromoForm((current) => ({ ...current, minPurchase: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Minimum purchase" />
                      <input type="datetime-local" value={promoForm.expiryDate} onChange={(event) => setPromoForm((current) => ({ ...current, expiryDate: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                    </div>
                    <textarea value={promoForm.description} onChange={(event) => setPromoForm((current) => ({ ...current, description: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Campaign note or description" rows={3} />
                    <button type="submit" disabled={busyKey === 'promo-create'} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                      {busyKey === 'promo-create' ? 'Creating...' : 'Create promo code'}
                    </button>
                  </form>
                </AdminSectionCard>

                <AdminSectionCard title="Campaign Codes" description="View active and inactive promo codes across the company.">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(['all', 'Active', 'Inactive'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setPromoFilter(status)}
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                          promoFilter === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {status === 'all' ? 'All promo codes' : status}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <AdminTableWrap>
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Owner</th>
                            <th className="px-4 py-3 text-left font-semibold">Value</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPromoCodes.map((promo) => (
                            <tr key={promo.id} className="border-t border-slate-100">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">{promo.code}</p>
                                <p className="mt-1 text-xs text-slate-500">{promo.description}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <div>{promo.owner}</div>
                                <div className="text-xs text-slate-500">Created {promo.createdAt}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <div>{promo.discount}% off</div>
                                <div className="text-xs text-slate-500">Uses {promo.uses}/{promo.maxUses} - Min US${promo.minPurchase.toFixed(2)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <AdminBadge label={promo.status} tone={promo.status === 'Active' ? 'green' : 'amber'} />
                                <div className="mt-2 text-xs text-slate-500">{promo.expiresAt}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </AdminTableWrap>
                  </div>
                </AdminSectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'referrals' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
                <AdminStatCard label="Referral Program" value={settings.referralEnabled ? 'Enabled' : 'Paused'} helper={settings.referralHeadline} icon={Gift} />
                <AdminStatCard label="Reward Value" value={`US$${settings.referralRewardAmount.toFixed(2)}`} helper="Applied when referral records are updated here" icon={BellRing} />
                <AdminStatCard label="Completed Referrals" value={localStats.completedReferrals} helper={`${referrals.filter((referral) => referral.status === 'pending').length} pending`} icon={TrendingUp} />
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <AdminTableWrap>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Referrer</th>
                        <th className="px-4 py-3 text-left font-semibold">Referred</th>
                        <th className="px-4 py-3 text-left font-semibold">Reward</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.map((referral) => (
                        <tr key={referral.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{referral.referrer}</p>
                            <p className="mt-1 text-xs text-slate-500">{referral.createdAt}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{referral.referred}</td>
                          <td className="px-4 py-3 text-slate-700">US${referral.rewardAmount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <AdminBadge
                              label={referral.status}
                              tone={referral.status === 'completed' ? 'green' : referral.status === 'cancelled' ? 'red' : 'amber'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => void updateReferral(referral.id, 'completed')}
                                disabled={busyKey === `referral-${referral.id}`}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => void updateReferral(referral.id, 'pending')}
                                disabled={busyKey === `referral-${referral.id}`}
                                className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                              >
                                Pending
                              </button>
                              <button
                                onClick={() => void updateReferral(referral.id, 'cancelled')}
                                disabled={busyKey === `referral-${referral.id}`}
                                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                Cancel
                              </button>
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
      </section>

      <div className="grid grid-cols-1 gap-4">
        <AdminQuickLinkCard
          title="Client directory"
          description="Open the full account management area for balances, resets, and exports."
          icon={Users}
        />
        <AdminQuickLinkCard
          title="Vendor operations"
          description="Manage store assets, vendor quality, balances, and storefront readiness."
          icon={Store}
        />
        <AdminQuickLinkCard
          title="Order command"
          description="Review fulfillment and revenue operations beyond the marketing surface."
          icon={BarChart3}
        />
      </div>

      {statusMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg">
          {statusMessage}
        </div>
      ) : null}
    </div>
  )
}

function FocusRow({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <span>{label}</span>
    </div>
  )
}

function ChartRow({
  label,
  value,
  helper,
  width,
  colorClass,
}: {
  label: string
  value: string
  helper: string
  width: string
  colorClass: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width }} />
      </div>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function UploadCard({
  label,
  busy,
  onChange,
}: {
  label: string
  busy: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">
      <span>{label}</span>
      <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-semibold text-slate-900 shadow-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Upload
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  )
}
