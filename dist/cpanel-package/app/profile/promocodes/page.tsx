'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Copy } from 'lucide-react'
import { ProfileEmptyState, ProfilePageShell, ProfilePanel, ProfileStatCard } from '@/components/profile-ui'

interface PromoCode {
  id: string
  code: string
  discount: number
  description: string | null
  expiryDate: string
  maxUses: number
  currentUses: number
  minPurchase: number
}

interface PromoStats {
  promoCodes: PromoCode[]
  active: number
  expired: number
  totalSavings: number
}

export default function PromoCodes() {
  const [data, setData] = useState<PromoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchPromoCodes = async () => {
      try {
        const res = await fetch('/api/profile/promo-codes')
        if (!res.ok) throw new Error('Failed to fetch promo codes')
        const result = await res.json()
        setData(result)
      } catch {
        setError('Failed to load promo codes')
      } finally {
        setLoading(false)
      }
    }

    void fetchPromoCodes()
  }, [])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    window.setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading promo codes...</div>
  }

  if (!data) {
    return <ProfileEmptyState title="Promo codes unavailable" description={error || 'We could not load your promo code data.'} />
  }

  const activeCodes = data.promoCodes.filter(
    (code) => new Date(code.expiryDate) > new Date() && code.currentUses < code.maxUses
  )
  const expiredCodes = data.promoCodes.filter(
    (code) => new Date(code.expiryDate) <= new Date() || code.currentUses >= code.maxUses
  )

  return (
    <ProfilePageShell
      eyebrow="Offers"
      title="My Promo Codes"
      description="Keep your active discounts close, copy them fast, and monitor what has already expired."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProfileStatCard label="Active Codes" value={data.active} helper="Available to use at checkout." accent="emerald" />
        <ProfileStatCard label="Total Savings" value={`$${data.totalSavings.toFixed(2)}`} helper="Combined value of your offers." accent="blue" />
        <ProfileStatCard label="Expired Codes" value={data.expired} helper="Past or exhausted discounts." accent="violet" />
      </div>

      {activeCodes.length > 0 ? (
        <ProfilePanel title="Active Codes" description="Use these before they expire or run out of uses.">
          <div className="space-y-4">
            {activeCodes.map((promoCode) => (
              <div key={promoCode.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <code className="rounded-2xl bg-orange-50 px-4 py-2 font-mono text-2xl font-bold text-orange-600">
                        {promoCode.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(promoCode.code)}
                        className="rounded-2xl p-2 transition hover:bg-slate-100"
                        title="Copy code"
                      >
                        {copiedCode === promoCode.code ? (
                          <Check className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Copy className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-slate-700">{promoCode.description || 'Discount code'}</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-slate-500">Discount</p>
                        <p className="font-semibold text-slate-900">${promoCode.discount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Uses Left</p>
                        <p className="font-semibold text-slate-900">
                          {promoCode.maxUses === 0 ? 'Unlimited' : promoCode.maxUses - promoCode.currentUses}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Min. Purchase</p>
                        <p className="font-semibold text-slate-900">${promoCode.minPurchase}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Expires</p>
                        <p className="font-semibold text-slate-900">{new Date(promoCode.expiryDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ProfilePanel>
      ) : null}

      {expiredCodes.length > 0 ? (
        <ProfilePanel title="Expired Codes" description="A record of discounts that are no longer active.">
          <div className="space-y-4">
            {expiredCodes.map((promoCode) => (
              <div key={promoCode.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5 opacity-80">
                <div className="flex items-start gap-4">
                  <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                  <div className="flex-1">
                    <code className="rounded-xl bg-white px-3 py-1 font-mono text-lg font-bold text-slate-600">{promoCode.code}</code>
                    <p className="mt-2 text-slate-600">{promoCode.description || 'Discount code'}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(promoCode.expiryDate) <= new Date()
                        ? `Expired on ${new Date(promoCode.expiryDate).toLocaleDateString()}`
                        : 'All uses exhausted'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ProfilePanel>
      ) : null}

      {data.promoCodes.length === 0 ? (
        <ProfileEmptyState title="No promo codes yet" description="When your account receives discounts or campaign offers, they’ll appear here." />
      ) : null}
    </ProfilePageShell>
  )
}
