'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { MapPin, Check, ChevronDown } from 'lucide-react'
import { normalizeAddressLabel, useCustomerLocationStore } from '@/lib/customer-location'

interface AddressEntryProps {
  compact?: boolean
  className?: string
}

export function AddressEntry({ compact = false, className = '' }: AddressEntryProps) {
  const { status } = useSession()
  const address = useCustomerLocationStore((state) => state.address)
  const setAddress = useCustomerLocationStore((state) => state.setAddress)
  const hydrated = useCustomerLocationStore((state) => state.hydrated)
  const [draftAddress, setDraftAddress] = useState(address)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated' || !hydrated || address) return

    const loadProfileAddress = async () => {
      try {
        const response = await fetch('/api/profile')
        if (!response.ok) return
        const data = await response.json()
        if (typeof data.deliveryAddress === 'string' && data.deliveryAddress.trim()) {
          const normalized = normalizeAddressLabel(data.deliveryAddress)
          setAddress(normalized)
          setDraftAddress(normalized)
        }
      } catch {
        // Ignore background sync failures.
      }
    }

    void loadProfileAddress()
  }, [address, hydrated, setAddress, status])

  const addressLabel = useMemo(() => {
    if (!hydrated) return 'Loading address...'
    return address ? normalizeAddressLabel(address) : 'Enter address'
  }, [address, hydrated])

  const saveAddress = async () => {
    const normalized = normalizeAddressLabel(draftAddress)
    setSaving(true)
    setAddress(normalized)

    if (status === 'authenticated') {
      try {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryAddress: normalized }),
        })
      } catch {
        // Local save still succeeds even if profile sync fails.
      }
    }

    setSaving(false)
    setSaved(true)
    setOpen(false)
    window.setTimeout(() => setSaved(false), 1800)
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            setDraftAddress(address)
            setOpen((current) => !current)
          }}
          className="flex min-w-[170px] items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-300"
        >
          <MapPin className="h-4 w-4 shrink-0 text-slate-700" />
          <span className="truncate">{saved ? 'Address saved' : addressLabel}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-[min(92vw,24rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Delivery address</p>
            <p className="mt-1 text-xs text-slate-500">We’ll highlight stores closest to this address.</p>
            <textarea
              value={draftAddress}
              onChange={(event) => setDraftAddress(event.target.value)}
              placeholder="Enter your address, suburb, city, or area"
              className="mt-3 h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveAddress}
                disabled={saving}
                className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save address'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`rounded-[2rem] border border-white/20 bg-white/95 p-4 text-slate-900 shadow-2xl ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Where should we deliver?</p>
            <p className="text-xs text-slate-500">Save your address to see stores closest to you first.</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <input
            value={draftAddress}
            onChange={(event) => setDraftAddress(event.target.value)}
            placeholder="Enter your address, suburb, city, or area"
            className="min-w-0 flex-1 rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400"
          />
          <button
            type="button"
            onClick={saveAddress}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Use this address'}
          </button>
        </div>
      </div>
    </div>
  )
}
