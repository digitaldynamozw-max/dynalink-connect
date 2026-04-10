'use client'

import { useState } from 'react'
import { Gift, LayoutTemplate, Loader2, MapPinned, MessageSquareMore, PackageOpen, Settings2, Store } from 'lucide-react'
import type { SiteSettingsShape } from '@/lib/admin/site-settings'
import { AdminSectionCard } from '@/components/admin-ui'

export function AdminSettingsForm({ initialSettings }: { initialSettings: SiteSettingsShape }) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof SiteSettingsShape>(field: K, value: SiteSettingsShape[K]) => {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: settings.companyName,
          heroBadge: settings.heroBadge,
          heroTitle: settings.heroTitle,
          heroSubtitle: settings.heroSubtitle,
          primaryCtaLabel: settings.primaryCtaLabel,
          primaryCtaHref: settings.primaryCtaHref,
          secondaryCtaLabel: settings.secondaryCtaLabel,
          secondaryCtaHref: settings.secondaryCtaHref,
          whatsappNumber: settings.whatsappNumber,
          referralEnabled: settings.referralEnabled,
          referralRewardAmount: settings.referralRewardAmount,
          referralHeadline: settings.referralHeadline,
          platformOrdersPaused: settings.platformOrdersPaused,
          allStoresTemporarilyClosed: settings.allStoresTemporarilyClosed,
          pickupEnabled: settings.pickupEnabled,
          platformFeePerOrder: settings.platformFeePerOrder,
          globalDeliveryEtaMinutes: settings.globalDeliveryEtaMinutes,
          platformStoreAddress: settings.platformStoreAddress,
          googleMapsEmbedUrl: settings.googleMapsEmbedUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSettings(data.settings)
      setMessage('Settings updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <AdminSectionCard
        title="Platform Operations"
        description="Control ordering, pickup, and default delivery behavior across every store from one place."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <PackageOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Ordering Controls</p>
                <p className="mt-1 text-sm text-slate-600">Pause all orders or temporarily close all stores for emergencies, maintenance, or holidays.</p>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pause all new orders</p>
                <p className="text-xs text-slate-500">Checkout and new order creation stop platform-wide.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.platformOrdersPaused}
                onChange={(event) => updateField('platformOrdersPaused', event.target.checked)}
                className="h-4 w-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Close all stores</p>
                <p className="text-xs text-slate-500">Shows stores as closed and blocks ordering from every vendor.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allStoresTemporarilyClosed}
                onChange={(event) => updateField('allStoresTemporarilyClosed', event.target.checked)}
                className="h-4 w-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable collection / pickup</p>
                <p className="text-xs text-slate-500">Lets customers choose pickup instead of delivery in checkout.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.pickupEnabled}
                onChange={(event) => updateField('pickupEnabled', event.target.checked)}
                className="h-4 w-4 rounded"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Charges And Defaults</p>
                <p className="mt-1 text-sm text-slate-600">Set the fixed platform fee charged on every order and the default delivery timing used across the storefront.</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform Fee Per Order
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.platformFeePerOrder}
                onChange={(event) => updateField('platformFeePerOrder', Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Fixed amount charged to the customer on every order. Marketplace markup percentages are managed on each vendor profile.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Default Delivery Time In Minutes
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={settings.globalDeliveryEtaMinutes}
                onChange={(event) => updateField('globalDeliveryEtaMinutes', Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Brand And Storefront Copy"
        description="These fields control the shared marketplace identity and hero copy visible across the platform."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Marketplace Identity</p>
                <p className="mt-1 text-sm text-slate-600">Core brand labels and headline text used in the main storefront shell.</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(event) => updateField('companyName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hero Badge
              </label>
              <input
                type="text"
                value={settings.heroBadge}
                onChange={(event) => updateField('heroBadge', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hero Title
              </label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(event) => updateField('heroTitle', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hero Subtitle
              </label>
              <textarea
                rows={4}
                value={settings.heroSubtitle}
                onChange={(event) => updateField('heroSubtitle', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Storefront Actions</p>
                <p className="mt-1 text-sm text-slate-600">Control the primary and secondary calls to action shown to customers.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Primary CTA Label
                </label>
                <input
                  type="text"
                  value={settings.primaryCtaLabel}
                  onChange={(event) => updateField('primaryCtaLabel', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Primary CTA Link
                </label>
                <input
                  type="text"
                  value={settings.primaryCtaHref}
                  onChange={(event) => updateField('primaryCtaHref', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Secondary CTA Label
                </label>
                <input
                  type="text"
                  value={settings.secondaryCtaLabel}
                  onChange={(event) => updateField('secondaryCtaLabel', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Secondary CTA Link
                </label>
                <input
                  type="text"
                  value={settings.secondaryCtaHref}
                  onChange={(event) => updateField('secondaryCtaHref', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Live preview</p>
              <p className="mt-2 uppercase tracking-[0.14em] text-slate-500">{settings.heroBadge}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{settings.heroTitle}</p>
              <p className="mt-2">{settings.heroSubtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">{settings.primaryCtaLabel}</span>
                <span className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">{settings.secondaryCtaLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Storefront Details"
        description="Fallback collection guidance and upcoming Google Maps frontend embed entry point."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Fallback Collection Address</p>
                <p className="mt-1 text-sm text-slate-600">Used only if a vendor has not added their own shop address for customer collection.</p>
              </div>
            </div>
            <textarea
              rows={4}
              value={settings.platformStoreAddress || ''}
              onChange={(event) => updateField('platformStoreAddress', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Enter the fallback collection address"
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Google Maps Embed URL</p>
                <p className="mt-1 text-sm text-slate-600">Frontend map view is still pending, but you can store the shared embed URL here now.</p>
              </div>
            </div>
            <textarea
              rows={4}
              value={settings.googleMapsEmbedUrl || ''}
              onChange={(event) => updateField('googleMapsEmbedUrl', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Support And Referral Controls"
        description="Customer support handoff and incentive settings used by the broader marketplace."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <MessageSquareMore className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Support Routing</p>
                <p className="mt-1 text-sm text-slate-600">Used when customers need a fast handoff into direct support.</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(event) => updateField('whatsappNumber', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="263..."
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="theme-icon-chip inline-flex h-10 w-10 items-center justify-center rounded-xl">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Referral Program</p>
                <p className="mt-1 text-sm text-slate-600">Turn referrals on or off and define the message and reward customers see.</p>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable referrals</p>
                <p className="text-xs text-slate-500">Lets the platform advertise and honor referral rewards.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.referralEnabled}
                onChange={(event) => updateField('referralEnabled', event.target.checked)}
                className="h-4 w-4 rounded"
              />
            </label>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Referral Reward Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.referralRewardAmount}
                onChange={(event) => updateField('referralRewardAmount', Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Referral Headline
              </label>
              <textarea
                rows={3}
                value={settings.referralHeadline}
                onChange={(event) => updateField('referralHeadline', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="theme-accent-btn inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save platform settings'}
        </button>
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      </div>
    </div>
  )
}
