'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Store, MapPin, Star, Package, Filter, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerLocationStore } from '@/lib/customer-location'
import { getVendorAddressMatchScore, getVendorDistanceLabel } from '@/lib/location-match'
import { toVendorSlug } from '@/lib/vendor-slug'

interface Vendor {
  id: string
  vendorName?: string
  vendorDescription?: string
  vendorImage?: string
  storeBannerImage?: string
  vendorVerified?: boolean
  storeCity?: string
  storeState?: string
  rating?: number
  salesCount?: number
  category?: string
  vendorCategory?: string
  vendorPriority?: number
  totalProducts?: number
}

const VENDOR_CATEGORIES = ['Electronics', 'Fashion', 'Food & Beverage', 'Home & Garden', 'Beauty', 'Books', 'Sports']

function VendorsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (session?.user as { role?: string } | undefined)?.role
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const savedAddress = useCustomerLocationStore((state) => state.address)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'nearby' | 'priority' | 'name' | 'rating' | 'products'>('priority')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const initialCategory = searchParams.get('category')?.trim() || ''

  useEffect(() => {
    if (savedAddress) {
      setSortBy((current) => (current === 'priority' ? 'nearby' : current))
    }
  }, [savedAddress])

  useEffect(() => {
    if (!initialCategory) return
    setSelectedCategories((current) =>
      current.length === 1 && current[0] === initialCategory ? current : [initialCategory]
    )
  }, [initialCategory])

  useEffect(() => {
    if (status === 'authenticated' && role === 'vendor') {
      router.replace('/vendor/dashboard')
    }
  }, [role, router, status])

  useEffect(() => {
    if (status === 'authenticated' && role === 'vendor') return

    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/vendors')
        if (response.ok) {
          const data = await response.json()
          setVendors(data)
          setFilteredVendors(data)
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchVendors()
  }, [role, status])

  useEffect(() => {
    let filtered = vendors

    if (search.trim()) {
      filtered = filtered.filter(
        (vendor) =>
          vendor.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
          vendor.vendorDescription?.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(
        (vendor) =>
          (vendor.vendorCategory || vendor.category) &&
          selectedCategories.includes(vendor.vendorCategory || vendor.category || '')
      )
    }

    if (minRating > 0) {
      filtered = filtered.filter((vendor) => (vendor.rating || 0) >= minRating)
    }

    if (verifiedOnly) {
      filtered = filtered.filter((vendor) => vendor.vendorVerified)
    }

    if (selectedCities.length > 0) {
      filtered = filtered.filter((vendor) => vendor.storeCity && selectedCities.includes(vendor.storeCity))
    }

    const sorted = [...filtered]
    switch (sortBy) {
      case 'nearby':
        sorted.sort((a, b) => {
          const scoreDiff = getVendorAddressMatchScore(savedAddress, b) - getVendorAddressMatchScore(savedAddress, a)
          if (scoreDiff !== 0) return scoreDiff
          return (b.vendorPriority || 0) - (a.vendorPriority || 0)
        })
        break
      case 'priority':
        sorted.sort((a, b) => (b.vendorPriority || 0) - (a.vendorPriority || 0))
        break
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'products':
        sorted.sort((a, b) => (b.totalProducts || 0) - (a.totalProducts || 0))
        break
      case 'name':
      default:
        sorted.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''))
    }

    setFilteredVendors(sorted)
  }, [minRating, savedAddress, search, selectedCategories, selectedCities, sortBy, vendors, verifiedOnly])

  const citiesList = Array.from(new Set(vendors.map((v) => v.storeCity).filter(Boolean) as string[])).sort()

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))
  }

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => (prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]))
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedCategories([])
    setMinRating(0)
    setVerifiedOnly(false)
    setSelectedCities([])
    setSortBy(savedAddress ? 'nearby' : 'priority')
  }

  const hasActiveFilters =
    search ||
    selectedCategories.length > 0 ||
    minRating > 0 ||
    verifiedOnly ||
    selectedCities.length > 0 ||
    sortBy !== (savedAddress ? 'nearby' : 'priority')

  if (status === 'authenticated' && role === 'vendor') {
    return null
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#fef3c7)] p-4 shadow-sm">
          <h1 className="mb-1 text-2xl font-black text-slate-950">Marketplace</h1>
          <p className="text-sm text-slate-600">Discover exceptional vendors and quality products in a tighter browsing view.</p>
          {selectedCategories.length === 1 ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Filtered by category: {selectedCategories[0]}
            </p>
          ) : null}

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Search vendors by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-20 space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Clear all filters
                </button>
              ) : null}

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Package className="h-4 w-4" />
                  Sort by
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'nearby' | 'priority' | 'name' | 'rating' | 'products')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  title="Sort vendors by"
                >
                  <option value="priority">Admin Priority</option>
                  <option value="nearby" disabled={!savedAddress}>Closest To You</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="rating">Highest Rating</option>
                  <option value="products">Most Products</option>
                </select>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Categories</h3>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {VENDOR_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Star className="h-4 w-4 fill-current text-yellow-400" />
                  Minimum Rating
                </h3>
                <div className="space-y-1.5">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <label key={rating} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                      <input
                        type="radio"
                        name="rating"
                        value={rating}
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-slate-700">{rating === 0 ? 'All ratings' : `${rating}★ and up`}</span>
                    </label>
                  ))}
                </div>
              </div>

              {citiesList.length > 0 ? (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-red-500" />
                    Location
                  </h3>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {citiesList.map((city) => (
                      <label key={city} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selectedCities.includes(city)}
                          onChange={() => toggleCity(city)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Verified Vendors Only</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-4 lg:hidden">
              <button
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <Filter className="h-5 w-5" />
                Filters
                {hasActiveFilters ? (
                  <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                    {selectedCategories.length + (minRating > 0 ? 1 : 0) + (verifiedOnly ? 1 : 0) + selectedCities.length}
                  </span>
                ) : null}
              </button>

              {showMobileFilter ? (
                <>
                  <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileFilter(false)} />
                  <div className="fixed left-0 right-0 top-0 z-50 max-h-96 overflow-y-auto rounded-b-2xl bg-white shadow-lg">
                    <div className="space-y-4 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Filters</h3>
                        <button onClick={() => setShowMobileFilter(false)} className="text-slate-500 hover:text-slate-700" title="Close filters">
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">Sort</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'nearby' | 'priority' | 'name' | 'rating' | 'products')}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          title="Sort vendors by"
                        >
                          <option value="priority">Admin Priority</option>
                          <option value="nearby" disabled={!savedAddress}>Closest To You</option>
                          <option value="name">Name</option>
                          <option value="rating">Rating</option>
                          <option value="products">Products</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">Categories</label>
                        <div className="space-y-1.5">
                          {VENDOR_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat)}
                                onChange={() => toggleCategory(cat)}
                                className="h-4 w-4 rounded"
                              />
                              <span className="text-sm">{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filteredVendors.length}</span> vendor{filteredVendors.length !== 1 ? 's' : ''}
              </p>
              {savedAddress ? <p className="hidden text-xs font-medium text-emerald-600 lg:block">Ranking stores near: {savedAddress}</p> : null}
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
                  <p className="text-sm text-slate-600">Loading vendors...</p>
                </div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
                <Store className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                <p className="text-base text-slate-500">{search || hasActiveFilters ? 'No vendors match your filters' : 'No vendors available yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendors.map((vendor) => (
                  <Link
                    key={vendor.id}
                    href={vendor.vendorName ? `/vendor/${toVendorSlug(vendor.vendorName)}` : '#'}
                    className="group"
                  >
                    <div className="h-full overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600">
                        {vendor.storeBannerImage || vendor.vendorImage ? (
                          <Image
                            src={vendor.storeBannerImage || vendor.vendorImage || ''}
                            alt={vendor.vendorName || 'Vendor'}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Store className="h-14 w-14 text-white/50" />
                          </div>
                        )}
                        {vendor.vendorVerified ? (
                          <div className="absolute right-3 top-3 rounded-full bg-green-500 px-3 py-1 text-[11px] font-semibold text-white">
                            Verified
                          </div>
                        ) : (
                          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900">
                            <Package className="h-3 w-3" />
                            {vendor.totalProducts || 0}
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="mb-1 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-blue-600">{vendor.vendorName}</h3>
                        {vendor.vendorCategory ? (
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600">{vendor.vendorCategory}</p>
                        ) : null}
                        <p className="mb-2.5 line-clamp-2 text-sm text-slate-600">{vendor.vendorDescription || 'Quality products'}</p>

                        {vendor.storeCity || vendor.storeState ? (
                          <div className="mb-2.5 flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span>{vendor.storeCity || 'Unknown'}</span>
                          </div>
                        ) : null}

                        {savedAddress ? (
                          <div className="mb-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <MapPin className="h-3.5 w-3.5" />
                            {getVendorDistanceLabel(savedAddress, vendor)}
                          </div>
                        ) : null}

                        <div className="flex gap-4 border-t border-slate-200 py-2.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-400" />
                              <span className="text-sm font-semibold">{(vendor.rating || 4.5).toFixed(2)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Rating</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{vendor.totalProducts || 0}</p>
                            <p className="text-[11px] text-slate-500">Items</p>
                          </div>
                        </div>

                        <button className="mt-2.5 w-full rounded-xl bg-orange-500 py-2 text-sm font-medium text-white transition hover:bg-orange-600">
                          Visit Store
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-[1.25rem] bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center text-white">
          <h2 className="mb-2 text-2xl font-bold">Become a Vendor</h2>
          <p className="mb-5 text-sm text-blue-100">Join our marketplace and reach thousands of customers.</p>
          <Link
            href="/vendor/register"
            className="inline-block rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-gray-100"
          >
            Register Now
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="theme-app-shell flex min-h-screen items-center justify-center">
          <div className="text-sm text-slate-600">Loading vendors...</div>
        </div>
      }
    >
      <VendorsPageContent />
    </Suspense>
  )
}
