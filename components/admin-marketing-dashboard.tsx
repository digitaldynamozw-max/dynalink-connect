'use client'

import { startTransition, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Activity, BadgeDollarSign, Gift, ImagePlus, Loader2, Search, Star, Store, TrendingUp, Users } from 'lucide-react'
import { AdminBadge, AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'
import { uploadAdminVendorAsset } from '@/lib/admin/vendor-assets'

type CustomerRow = { id: string; name: string; email: string; phone: string; joinedAt: string; lastSeen: string; lastOrderAt: string; orders: number; totalSpend: number; averageOrder: number; reviews: number; referrals: number; status: 'Active' | 'Blacklisted' }
type VendorRow = { id: string; vendorName: string; category: string; priority: number; status: 'Verified' | 'Pending'; products: number; orders: number; averageRating: number; bannersReady: boolean }
type PromoRow = { id: string; code: string; discount: number; uses: number; maxUses: number; expiresAt: string; owner: string; ownerId: string; status: 'Active' | 'Inactive'; description: string; minPurchase: number; createdAt: string }
type ReferralRow = { id: string; referrer: string; referred: string; rewardAmount: number; status: string; createdAt: string }
type MarketingSettings = { companyName: string; heroBadge: string; heroTitle: string; heroSubtitle: string; heroBackgroundImage: string; heroForegroundImage: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; whatsappNumber: string; referralEnabled: boolean; referralRewardAmount: number; referralHeadline: string }
type MarketingOverview = { revenue30Days: number; orders30Days: number; averageOrderValue: number; averageRating30Days: number; reviews30Days: number; activePromoCodes: number; pendingReferrals: number }
type MarketingHealth = { totalCustomers: number; activeCustomers: number; blacklistedCustomers: number; newCustomers30Days: number; totalVendors: number; verifiedVendors: number; bannerReadyVendors: number; highPriorityVendors: number; totalPromoCodes: number; totalReferrals: number; completedReferrals: number }
type DailyOrderPoint = { date: string; label: string; orders: number; revenue: number }
type DailyRatingPoint = { date: string; label: string; ratings: number; average: number }
type ActivityRow = { id: string; label: string; meta: string; at: string }
type CustomerOption = { id: string; label: string; secondary: string }
type TabId = 'overview' | 'vendors' | 'promos' | 'referrals' | 'storefront'

const LIST_LIMIT = 5
const HIGH_PRIORITY_THRESHOLD = 8
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'promos', label: 'Promo Codes' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'storefront', label: 'Storefront' },
]

const money = (value: number) => `US$${value.toFixed(2)}`

export function AdminMarketingDashboard({ overview: initialOverview, health: initialHealth, customers, vendors: initialVendors, promoCodes: initialPromoCodes, referrals: initialReferrals, settings: initialSettings, customerOptions, ordersPerDay, ratingsPerDay, activityFeed, latestUpdate }: { overview: MarketingOverview; health: MarketingHealth; customers: CustomerRow[]; customerLimit: number; vendors: VendorRow[]; promoCodes: PromoRow[]; promoLimit: number; referrals: ReferralRow[]; referralLimit: number; settings: MarketingSettings; customerOptions: CustomerOption[]; ordersPerDay: DailyOrderPoint[]; ratingsPerDay: DailyRatingPoint[]; activityFeed: ActivityRow[]; latestUpdate: string }) {
  const [tab, setTab] = useState<TabId>('overview')
  const [overview, setOverview] = useState(initialOverview)
  const [health, setHealth] = useState(initialHealth)
  const [vendors, setVendors] = useState(initialVendors)
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes)
  const [referrals, setReferrals] = useState(initialReferrals)
  const [settings, setSettings] = useState(initialSettings)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, string>>(Object.fromEntries(initialVendors.map((vendor) => [vendor.id, String(vendor.priority)])))
  const [promoForm, setPromoForm] = useState({ code: '', userId: customerOptions[0]?.id || '', discount: '10', maxUses: '100', minPurchase: '0', expiryDate: '', description: '' })

  const term = search.trim().toLowerCase()
  const compactCustomers = useMemo(() => customers.filter((row) => `${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(term)).slice(0, LIST_LIMIT), [customers, term])
  const compactVendors = useMemo(() => vendors.filter((row) => `${row.vendorName} ${row.category} ${row.status}`.toLowerCase().includes(term)).slice(0, LIST_LIMIT), [term, vendors])
  const compactPromoCodes = useMemo(() => promoCodes.filter((row) => `${row.code} ${row.owner} ${row.description}`.toLowerCase().includes(term)).slice(0, LIST_LIMIT), [promoCodes, term])
  const compactReferrals = useMemo(() => referrals.filter((row) => `${row.referrer} ${row.referred} ${row.status}`.toLowerCase().includes(term)).slice(0, LIST_LIMIT), [referrals, term])
  const compactActivity = activityFeed.slice(0, LIST_LIMIT)
  const compactOrders = ordersPerDay.slice(-LIST_LIMIT)
  const compactRatings = ratingsPerDay.slice(-LIST_LIMIT)
  const orderMax = Math.max(...compactOrders.map((item) => item.orders), 1)
  const ratingMax = Math.max(...compactRatings.map((item) => item.ratings), 1)
  const heroReady = Boolean(settings.heroBackgroundImage || settings.heroForegroundImage)

  const flash = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(null), 3000)
  }

  const saveVendorPriority = async (id: string) => {
    const current = vendors.find((row) => row.id === id)
    if (!current) return
    const nextPriority = Number(priorityDrafts[id] || '0')
    setBusyKey(`vendor-${id}`)
    try {
      const response = await fetch('/api/admin/vendors', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorId: id, vendorPriority: nextPriority }) })
      if (!response.ok) throw new Error('Failed to update vendor priority')
      startTransition(() => {
        setVendors((rows) => [...rows].map((row) => row.id === id ? { ...row, priority: nextPriority } : row).sort((a, b) => b.priority - a.priority))
        if ((current.priority >= HIGH_PRIORITY_THRESHOLD) !== (nextPriority >= HIGH_PRIORITY_THRESHOLD)) {
          setHealth((value) => ({ ...value, highPriorityVendors: value.highPriorityVendors + (nextPriority >= HIGH_PRIORITY_THRESHOLD ? 1 : -1) }))
        }
      })
      flash('Vendor priority saved')
    } catch (error) {
      console.error(error)
      flash('Vendor update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const createPromoCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusyKey('promo-create')
    try {
      const response = await fetch('/api/admin/marketing/promo-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(promoForm) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Failed to create promo code')
      const promo = payload.promoCode as { id: string; code: string; discount: number; currentUses: number; maxUses: number; expiryDate: string; description: string | null; minPurchase: number; createdAt: string; user: { id: string; email: string; name: string | null; vendorName: string | null } }
      const nextPromo: PromoRow = { id: promo.id, code: promo.code, discount: promo.discount, uses: promo.currentUses, maxUses: promo.maxUses, expiresAt: new Date(promo.expiryDate).toLocaleString('en-GB'), owner: promo.user.vendorName || promo.user.name || promo.user.email, ownerId: promo.user.id, status: new Date(promo.expiryDate) > new Date() && promo.currentUses < promo.maxUses ? 'Active' : 'Inactive', description: promo.description || 'Discount code', minPurchase: promo.minPurchase, createdAt: new Date(promo.createdAt).toLocaleString('en-GB') }
      startTransition(() => {
        setPromoCodes((rows) => [nextPromo, ...rows])
        setHealth((value) => ({ ...value, totalPromoCodes: value.totalPromoCodes + 1 }))
        if (nextPromo.status === 'Active') setOverview((value) => ({ ...value, activePromoCodes: value.activePromoCodes + 1 }))
      })
      setPromoForm({ code: '', userId: promoForm.userId, discount: '10', maxUses: '100', minPurchase: '0', expiryDate: '', description: '' })
      flash('Promo code created')
    } catch (error) {
      console.error(error)
      flash(error instanceof Error ? error.message : 'Promo creation failed')
    } finally {
      setBusyKey(null)
    }
  }

  const updateReferral = async (id: string, status: string) => {
    const current = referrals.find((row) => row.id === id)
    if (!current || current.status === status) return
    setBusyKey(`referral-${id}`)
    try {
      const response = await fetch(`/api/admin/marketing/referrals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, rewardAmount: settings.referralRewardAmount }) })
      if (!response.ok) throw new Error('Failed to update referral')
      startTransition(() => {
        setReferrals((rows) => rows.map((row) => row.id === id ? { ...row, status, rewardAmount: settings.referralRewardAmount } : row))
        setOverview((value) => ({ ...value, pendingReferrals: value.pendingReferrals + (current.status === 'pending' ? -1 : 0) + (status === 'pending' ? 1 : 0) }))
        setHealth((value) => ({ ...value, completedReferrals: value.completedReferrals + (current.status === 'completed' ? -1 : 0) + (status === 'completed' ? 1 : 0) }))
      })
      flash('Referral updated')
    } catch (error) {
      console.error(error)
      flash('Referral update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const saveSettings = async () => {
    setBusyKey('settings')
    try {
      const response = await fetch('/api/admin/marketing/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      if (!response.ok) throw new Error('Failed to save settings')
      flash('Storefront settings saved')
    } catch (error) {
      console.error(error)
      flash('Storefront update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const uploadBannerAsset = async (event: ChangeEvent<HTMLInputElement>, field: 'heroBackgroundImage' | 'heroForegroundImage') => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusyKey(field)
    try {
      const image = await uploadAdminVendorAsset(file)
      setSettings((value) => ({ ...value, [field]: image }))
      flash('Storefront image uploaded')
    } catch (error) {
      console.error(error)
      flash('Image upload failed')
    } finally {
      setBusyKey(null)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader title="Marketing Operations" description={`Grouped workspace with 5-item compact listings. Last refreshed ${latestUpdate}.`} action={<div className="relative w-full md:w-auto"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current submenu..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-400 md:w-72" /></div>} />
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5"><div className="flex flex-wrap gap-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${tab === item.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item.label}</button>)}</div></div>
        <div className="space-y-4 p-4 sm:p-5">
          {tab === 'overview' ? <div className="space-y-4"><div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-2"><AdminStatCard label="Revenue 30D" value={money(overview.revenue30Days)} helper={`${overview.orders30Days} orders`} icon={BadgeDollarSign} /><AdminStatCard label="Average Order" value={money(overview.averageOrderValue)} helper="Real order totals" icon={TrendingUp} /><AdminStatCard label="Average Rating" value={overview.averageRating30Days.toFixed(2)} helper={`${overview.reviews30Days} reviews`} icon={Star} /><AdminStatCard label="Active Promo Codes" value={overview.activePromoCodes} helper={`${health.totalPromoCodes} total codes`} icon={Gift} /><AdminStatCard label="Pending Referrals" value={overview.pendingReferrals} helper={`${health.completedReferrals} completed`} icon={Activity} /><AdminStatCard label="Vendors" value={health.totalVendors} helper={`${health.bannerReadyVendors} banner ready`} icon={Store} /></div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><AdminSectionCard title="14-Day Orders" description="Latest 5 daily points for orders and revenue."><div className="space-y-3">{compactOrders.map((item) => <TrendRow key={item.date} label={item.label} value={`${item.orders} orders`} helper={money(item.revenue)} width={`${(item.orders / orderMax) * 100}%`} colorClass="bg-sky-500" />)}</div></AdminSectionCard><AdminSectionCard title="Latest Activity" description="Newest 5 events across the platform."><div className="space-y-3">{compactActivity.length ? compactActivity.map((item) => <CompactItem key={item.id} title={item.label} meta={`${item.meta} | ${item.at}`} />) : <AdminEmptyState message="No recent activity yet." />}</div></AdminSectionCard></div><div className="grid gap-4 xl:grid-cols-2"><AdminSectionCard title="Recent Customers" description="5 most recent customer records."><div className="space-y-3">{compactCustomers.length ? compactCustomers.map((item) => <CompactItem key={item.id} title={item.name} meta={`${item.email} | ${item.lastSeen}`} badge={<AdminBadge label={item.status} tone={item.status === 'Active' ? 'green' : 'red'} />} />) : <AdminEmptyState message="No customers match the current search." />}</div></AdminSectionCard><AdminSectionCard title="14-Day Ratings" description="Latest 5 daily rating points."><div className="space-y-3">{compactRatings.map((item) => <TrendRow key={item.date} label={item.label} value={`${item.ratings} ratings`} helper={item.ratings ? `${item.average.toFixed(2)} average` : 'No ratings'} width={`${(item.ratings / ratingMax) * 100}%`} colorClass="bg-amber-500" />)}</div></AdminSectionCard></div></div> : null}
          {tab === 'vendors' ? <AdminSectionCard title="Vendor Listings" description="Top 5 vendors for the current search.">{compactVendors.length ? <AdminTableWrap><table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 text-left font-semibold">Vendor</th><th className="px-4 py-3 text-left font-semibold">Performance</th><th className="px-4 py-3 text-left font-semibold">Priority</th><th className="px-4 py-3 text-left font-semibold">Assets</th></tr></thead><tbody>{compactVendors.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.vendorName}</p><p className="mt-1 text-xs text-slate-500">{row.category} - {row.status}</p></td><td className="px-4 py-3 text-slate-700"><div>{row.orders} order items</div><div className="mt-1 text-xs text-slate-500">{row.products} products - {row.averageRating.toFixed(2)} rating</div></td><td className="px-4 py-3"><div className="flex items-center gap-2"><input type="number" min="0" value={priorityDrafts[row.id] || '0'} onChange={(event) => setPriorityDrafts((value) => ({ ...value, [row.id]: event.target.value }))} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={() => void saveVendorPriority(row.id)} disabled={busyKey === `vendor-${row.id}`} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{busyKey === `vendor-${row.id}` ? 'Saving...' : 'Save'}</button></div></td><td className="px-4 py-3"><AdminBadge label={row.bannersReady ? 'Ready' : 'Missing'} tone={row.bannersReady ? 'green' : 'amber'} /></td></tr>)}</tbody></table></AdminTableWrap> : <AdminEmptyState message="No vendors match the current search." />}</AdminSectionCard> : null}
          {tab === 'promos' ? <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]"><AdminSectionCard title="Create Promo Code" description="Assign a discount to a selected customer account."><form onSubmit={createPromoCode} className="grid gap-3"><input value={promoForm.code} onChange={(event) => setPromoForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="WELCOME25" /><select value={promoForm.userId} onChange={(event) => setPromoForm((value) => ({ ...value, userId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">{customerOptions.map((option) => <option key={option.id} value={option.id}>{option.label} ({option.secondary})</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="1" value={promoForm.discount} onChange={(event) => setPromoForm((value) => ({ ...value, discount: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Discount %" /><input type="number" min="1" value={promoForm.maxUses} onChange={(event) => setPromoForm((value) => ({ ...value, maxUses: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Max uses" /></div><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="0" step="0.01" value={promoForm.minPurchase} onChange={(event) => setPromoForm((value) => ({ ...value, minPurchase: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Minimum purchase" /><input type="datetime-local" value={promoForm.expiryDate} onChange={(event) => setPromoForm((value) => ({ ...value, expiryDate: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" /></div><textarea value={promoForm.description} onChange={(event) => setPromoForm((value) => ({ ...value, description: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Campaign note" rows={3} /><button type="submit" disabled={busyKey === 'promo-create' || !promoForm.userId} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{busyKey === 'promo-create' ? 'Creating...' : 'Create promo code'}</button></form></AdminSectionCard><AdminSectionCard title="Promo Listings" description="Top 5 promo codes for the current search.">{compactPromoCodes.length ? <AdminTableWrap><table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 text-left font-semibold">Code</th><th className="px-4 py-3 text-left font-semibold">Owner</th><th className="px-4 py-3 text-left font-semibold">Value</th><th className="px-4 py-3 text-left font-semibold">Status</th></tr></thead><tbody>{compactPromoCodes.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.code}</p><p className="mt-1 text-xs text-slate-500">{row.description}</p></td><td className="px-4 py-3 text-slate-700"><div>{row.owner}</div><div className="mt-1 text-xs text-slate-500">{row.createdAt}</div></td><td className="px-4 py-3 text-slate-700"><div>{row.discount}% off</div><div className="mt-1 text-xs text-slate-500">Uses {row.uses}/{row.maxUses} - Min {money(row.minPurchase)}</div></td><td className="px-4 py-3"><AdminBadge label={row.status} tone={row.status === 'Active' ? 'green' : 'amber'} /></td></tr>)}</tbody></table></AdminTableWrap> : <AdminEmptyState message="No promo codes match the current search." />}</AdminSectionCard></div> : null}
          {tab === 'referrals' ? <AdminSectionCard title="Referral Listings" description="Top 5 referrals for the current search.">{compactReferrals.length ? <AdminTableWrap><table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 text-left font-semibold">Referrer</th><th className="px-4 py-3 text-left font-semibold">Referred</th><th className="px-4 py-3 text-left font-semibold">Reward</th><th className="px-4 py-3 text-left font-semibold">Status</th><th className="px-4 py-3 text-left font-semibold">Action</th></tr></thead><tbody>{compactReferrals.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3"><p className="font-medium text-slate-900">{row.referrer}</p><p className="mt-1 text-xs text-slate-500">{row.createdAt}</p></td><td className="px-4 py-3 text-slate-700">{row.referred}</td><td className="px-4 py-3 text-slate-700">{money(row.rewardAmount)}</td><td className="px-4 py-3"><AdminBadge label={row.status} tone={row.status === 'completed' ? 'green' : row.status === 'cancelled' ? 'red' : 'amber'} /></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => void updateReferral(row.id, 'completed')} disabled={busyKey === `referral-${row.id}`} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Complete</button><button onClick={() => void updateReferral(row.id, 'pending')} disabled={busyKey === `referral-${row.id}`} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">Pending</button><button onClick={() => void updateReferral(row.id, 'cancelled')} disabled={busyKey === `referral-${row.id}`} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">Cancel</button></div></td></tr>)}</tbody></table></AdminTableWrap> : <AdminEmptyState message="No referrals match the current search." />}</AdminSectionCard> : null}
          {tab === 'storefront' ? <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]"><AdminSectionCard title="Storefront Preview" description="Compact hero preview for the live marketplace."><div className="space-y-4"><div className="rounded-[1.6rem] border border-slate-200 bg-slate-950 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{settings.heroBadge || 'Hero badge'}</p><h3 className="mt-3 text-2xl font-semibold leading-tight">{settings.heroTitle || 'Hero title'}</h3><p className="mt-3 text-sm text-slate-300">{settings.heroSubtitle || 'Hero subtitle'}</p></div><div className="grid gap-3 sm:grid-cols-2"><SimpleTile label="Hero assets" value={heroReady ? 'Ready' : 'Missing'} helper="At least one image uploaded" /><SimpleTile label="Referral mode" value={settings.referralEnabled ? 'Enabled' : 'Paused'} helper={settings.referralHeadline} /></div></div></AdminSectionCard><AdminSectionCard title="Edit Storefront" description="Keep customer-facing copy short and specific."><div className="grid gap-3"><input value={settings.companyName} onChange={(event) => setSettings((value) => ({ ...value, companyName: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Company name" /><input value={settings.heroBadge} onChange={(event) => setSettings((value) => ({ ...value, heroBadge: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero badge" /><input value={settings.heroTitle} onChange={(event) => setSettings((value) => ({ ...value, heroTitle: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero title" /><textarea value={settings.heroSubtitle} onChange={(event) => setSettings((value) => ({ ...value, heroSubtitle: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Hero subtitle" rows={3} /><div className="grid gap-3 sm:grid-cols-2"><input value={settings.primaryCtaLabel} onChange={(event) => setSettings((value) => ({ ...value, primaryCtaLabel: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Primary CTA label" /><input value={settings.primaryCtaHref} onChange={(event) => setSettings((value) => ({ ...value, primaryCtaHref: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="/vendors" /></div><div className="grid gap-3 sm:grid-cols-2"><input value={settings.secondaryCtaLabel} onChange={(event) => setSettings((value) => ({ ...value, secondaryCtaLabel: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Secondary CTA label" /><input value={settings.secondaryCtaHref} onChange={(event) => setSettings((value) => ({ ...value, secondaryCtaHref: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="/vendor/register" /></div><input value={settings.whatsappNumber} onChange={(event) => setSettings((value) => ({ ...value, whatsappNumber: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="WhatsApp number" /><input value={settings.referralHeadline} onChange={(event) => setSettings((value) => ({ ...value, referralHeadline: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Referral headline" /><label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"><span>Referral program enabled</span><input type="checkbox" checked={settings.referralEnabled} onChange={(event) => setSettings((value) => ({ ...value, referralEnabled: event.target.checked }))} /></label><input type="number" min="0" step="0.01" value={settings.referralRewardAmount} onChange={(event) => setSettings((value) => ({ ...value, referralRewardAmount: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Referral reward" /><div className="grid gap-3 sm:grid-cols-2"><UploadCard label="Hero background" busy={busyKey === 'heroBackgroundImage'} onChange={(event) => void uploadBannerAsset(event, 'heroBackgroundImage')} /><UploadCard label="Hero foreground" busy={busyKey === 'heroForegroundImage'} onChange={(event) => void uploadBannerAsset(event, 'heroForegroundImage')} /></div><button onClick={() => void saveSettings()} disabled={busyKey === 'settings'} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{busyKey === 'settings' ? 'Saving...' : 'Save storefront settings'}</button></div></AdminSectionCard></div> : null}
        </div>
      </section>
      {statusMessage ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg">{statusMessage}</div> : null}
    </div>
  )
}

function CompactItem({ title, meta, badge }: { title: string; meta: string; badge?: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></div>{badge}</div></div>
}

function TrendRow({ label, value, helper, width, colorClass }: { label: string; value: string; helper: string; width: string; colorClass: string }) {
  return <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-900">{label}</span><span className="text-slate-500">{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colorClass}`} style={{ width }} /></div><p className="text-xs text-slate-500">{helper}</p></div>
}

function SimpleTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-600">{helper}</p></div>
}

function UploadCard({ label, busy, onChange }: { label: string; busy: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"><span>{label}</span><span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-semibold text-slate-900 shadow-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Upload</span><input type="file" accept="image/*" className="hidden" onChange={onChange} /></label>
}
