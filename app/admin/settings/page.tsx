import { Gift, KeyRound, MapPinned, MessageSquareMore, Shield, Store, Tag } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminBadge, AdminPageHeader, AdminSectionCard, AdminStatCard } from '@/components/admin-ui'
import { AdminSettingsForm } from '@/components/admin-settings-form'
import { ensureSiteSettings } from '@/lib/admin/site-settings'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireAdmin()

  const [vendorCount, activeVendorCount, settings] = await Promise.all([
    prisma.user.count({ where: { isVendor: true } }),
    prisma.user.count({ where: { isVendor: true, vendorVerified: true, isActive: true } }),
    ensureSiteSettings(),
  ])

  const mapsConfigured = Boolean(process.env.GOOGLE_MAPS_API_KEY)
  const authConfigured = Boolean(process.env.NEXTAUTH_SECRET)
  const whatsappConfigured = Boolean(settings.whatsappNumber?.trim())
  const referralConfigured = settings.referralEnabled && settings.referralRewardAmount > 0

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Settings"
          description="Operational switches, brand controls, referral settings, and storefront defaults from one control center."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-2">
            <AdminStatCard label="All Vendors" value={vendorCount} helper="Total storefronts created" icon={Store} />
            <AdminStatCard label="Active Vendors" value={activeVendorCount} helper="Verified and active storefronts" icon={Shield} />
            <AdminStatCard label="Platform Fee" value={`$${settings.platformFeePerOrder.toFixed(2)}`} helper="Fixed amount charged per order" icon={KeyRound} />
            <AdminStatCard label="Delivery Default" value={`${settings.globalDeliveryEtaMinutes} min`} helper="Applied when no schedule is chosen" icon={MapPinned} />
            <AdminStatCard label="Referral Reward" value={`$${settings.referralRewardAmount.toFixed(2)}`} helper={settings.referralEnabled ? 'Program currently enabled' : 'Program currently disabled'} icon={Gift} />
            <AdminStatCard label="Primary CTA" value={settings.primaryCtaLabel} helper={settings.primaryCtaHref} icon={Tag} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <AdminSectionCard title="Platform Status" description="Quick read on the current platform-wide switches and customer-facing programs.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Orders</p>
                    <p className="text-sm text-slate-500">Platform checkout availability</p>
                  </div>
                  <AdminBadge label={settings.platformOrdersPaused ? 'Paused' : 'Accepting'} tone={settings.platformOrdersPaused ? 'red' : 'green'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Storefronts</p>
                    <p className="text-sm text-slate-500">Global store availability</p>
                  </div>
                  <AdminBadge label={settings.allStoresTemporarilyClosed ? 'Closed' : 'Open'} tone={settings.allStoresTemporarilyClosed ? 'amber' : 'green'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Pickup</p>
                    <p className="text-sm text-slate-500">Collection option at checkout</p>
                  </div>
                  <AdminBadge label={settings.pickupEnabled ? 'Enabled' : 'Disabled'} tone={settings.pickupEnabled ? 'blue' : 'neutral'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Referrals</p>
                    <p className="text-sm text-slate-500">Program reward and messaging state</p>
                  </div>
                  <AdminBadge label={settings.referralEnabled ? 'Live' : 'Off'} tone={settings.referralEnabled ? 'green' : 'neutral'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Support Chat</p>
                    <p className="text-sm text-slate-500">WhatsApp handoff visibility</p>
                  </div>
                  <AdminBadge label={whatsappConfigured ? 'Ready' : 'Missing'} tone={whatsappConfigured ? 'green' : 'amber'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Maps Frontend</p>
                    <p className="text-sm text-slate-500">API and embed readiness</p>
                  </div>
                  <AdminBadge label={mapsConfigured || settings.googleMapsEmbedUrl ? 'Ready' : 'Pending'} tone={mapsConfigured || settings.googleMapsEmbedUrl ? 'green' : 'amber'} />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Marketplace Profile" description="A simple preview of what your current public-facing setup says about the platform.">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,243,214,0.85),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{settings.heroBadge}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{settings.heroTitle}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{settings.heroSubtitle}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    {settings.primaryCtaLabel}
                  </span>
                  <span className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                    {settings.secondaryCtaLabel}
                  </span>
                </div>
                <div className="mt-5 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="font-medium text-slate-900">{settings.companyName}</p>
                    <p className="mt-1">{settings.platformStoreAddress || 'No fallback collection address saved yet'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="font-medium text-slate-900">Referral headline</p>
                    <p className="mt-1">{settings.referralHeadline}</p>
                  </div>
                </div>
              </div>
            </AdminSectionCard>
          </div>

          <AdminSettingsForm initialSettings={settings} />

          <AdminSectionCard title="Runtime Checks" description="Server-side dependencies and storefront essentials used by the live marketplace.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">Admin Auth</p>
                  <p className="text-sm text-slate-500">Credential sessions and role checks</p>
                </div>
                <AdminBadge label={authConfigured ? 'Ready' : 'Missing'} tone={authConfigured ? 'green' : 'red'} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">Google Maps</p>
                  <p className="text-sm text-slate-500">Frontend API plus optional embed URL</p>
                </div>
                <AdminBadge label={mapsConfigured || settings.googleMapsEmbedUrl ? 'Ready' : 'Pending'} tone={mapsConfigured || settings.googleMapsEmbedUrl ? 'green' : 'amber'} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">WhatsApp Contact</p>
                  <p className="text-sm text-slate-500">Customer support handoff number</p>
                </div>
                <AdminBadge label={whatsappConfigured ? 'Ready' : 'Missing'} tone={whatsappConfigured ? 'green' : 'amber'} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">Referral Program</p>
                  <p className="text-sm text-slate-500">Reward and headline configured</p>
                </div>
                <AdminBadge label={referralConfigured ? 'Ready' : 'Review'} tone={referralConfigured ? 'green' : 'amber'} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <MessageSquareMore className="h-4 w-4" />
                  <p className="font-medium">Support routing</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  The settings page now carries more of the real public marketplace configuration, so updates to brand copy, referral messaging, pickup address, and support contact live together instead of being scattered.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Gift className="h-4 w-4" />
                  <p className="font-medium">Customer-facing defaults</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  These settings now cover both hard operational switches and softer experience defaults, which makes the admin safer for day-to-day use and less dependent on ad-hoc code edits.
                </p>
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
