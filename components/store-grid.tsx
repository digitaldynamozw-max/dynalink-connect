'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Package, Star, Store } from 'lucide-react'
import { useCustomerLocationStore } from '@/lib/customer-location'
import { getVendorAddressMatchScore, getVendorDistanceLabel } from '@/lib/location-match'
import { toVendorSlug } from '@/lib/vendor-slug'

interface Vendor {
  id: string
  vendorName?: string | null
  vendorDescription?: string | null
  vendorImage?: string | null
  storeBannerImage?: string | null
  vendorCategory?: string | null
  vendorPriority?: number | null
  storeCity?: string | null
  storeState?: string | null
  totalProducts?: number
  totalSales?: number
  totalReviews?: number
  rating?: number
}

interface StoreGridProps {
  title: string
  subtitle?: string
  filter?: 'featured' | 'top-rated' | 'most-active' | 'nearby'
  category?: string
  count?: number
}

function sortStores(vendors: Vendor[], filter: NonNullable<StoreGridProps['filter']>, address?: string) {
  const items = [...vendors]

  switch (filter) {
    case 'nearby':
      return items.sort((a, b) => {
        const scoreDiff =
          getVendorAddressMatchScore(address || '', b) - getVendorAddressMatchScore(address || '', a)
        if (scoreDiff !== 0) return scoreDiff
        return (b.vendorPriority || 0) - (a.vendorPriority || 0)
      })
    case 'top-rated':
      return items.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'most-active':
      return items.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    case 'featured':
    default:
      return items.sort((a, b) => (b.vendorPriority || 0) - (a.vendorPriority || 0))
  }
}

export function StoreGrid({
  title,
  subtitle,
  filter = 'featured',
  category,
  count = 4,
}: StoreGridProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const address = useCustomerLocationStore((state) => state.address)

  useEffect(() => {
    fetch('/api/vendors')
      .then((res) => res.json())
      .then((data) => {
        setVendors(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setVendors([])
        setLoading(false)
      })
  }, [])

  const filteredStores = useMemo(() => {
    const base = category
      ? vendors.filter((vendor) => (vendor.vendorCategory || '').toLowerCase() === category.toLowerCase())
      : vendors

    const ranked = sortStores(base, filter, address)
    if (filter === 'nearby' && address) {
      return ranked.filter((vendor) => getVendorAddressMatchScore(address, vendor) > 0).slice(0, count)
    }

    return ranked.slice(0, count)
  }, [address, category, count, filter, vendors])

  if (loading) {
    return <div className="mb-8 text-sm text-gray-500">Loading {title.toLowerCase()}...</div>
  }

  if (!filteredStores.length) {
    return null
  }

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
        </div>
        <Link href="/vendors" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          View all stores
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filteredStores.map((vendor) => (
          <Link
            key={vendor.id}
            href={vendor.vendorName ? `/vendor/${toVendorSlug(vendor.vendorName)}` : '/vendors'}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
              {vendor.storeBannerImage || vendor.vendorImage ? (
                <Image
                  src={vendor.storeBannerImage || vendor.vendorImage || ''}
                  alt={vendor.vendorName || 'Store'}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Store className="h-16 w-16 text-white/45" />
                </div>
              )}
              <div className="absolute inset-0 bg-slate-950/30" />
              {vendor.vendorCategory ? (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
                  {vendor.vendorCategory}
                </span>
              ) : null}
            </div>

            <div className="space-y-3 p-4">
              <div>
                <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-blue-700">
                  {vendor.vendorName || 'Marketplace Store'}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {vendor.vendorDescription || 'Browse this store’s latest products and best sellers.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                {(vendor.storeCity || vendor.storeState) ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {vendor.storeCity || vendor.storeState}
                  </span>
                ) : null}
                {address && filter === 'nearby' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <MapPin className="h-3.5 w-3.5" />
                    {getVendorDistanceLabel(address, vendor)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                  {vendor.totalProducts || 0} items
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Star className="h-4 w-4 fill-current text-amber-400" />
                  {(vendor.rating || 0).toFixed(2)}
                  <span className="text-xs font-medium text-slate-400">
                    ({vendor.totalReviews || 0})
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Visit store
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
