'use client'

import { useState, useEffect } from 'react'
import { Store, MapPin, Star, Package, Filter, X } from 'lucide-react'
import Link from 'next/link'

interface Vendor {
  id: string
  vendorName?: string
  vendorDescription?: string
  vendorImage?: string
  vendorVerified?: boolean
  storeCity?: string
  storeState?: string
  rating?: number
  salesCount?: number
  category?: string
  totalProducts?: number
}

const VENDOR_CATEGORIES = ['Electronics', 'Fashion', 'Food & Beverage', 'Home & Garden', 'Beauty', 'Books', 'Sports']

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'products'>('name')
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  // Fetch vendors
  useEffect(() => {
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

    fetchVendors()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = vendors

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(vendor =>
        vendor.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        vendor.vendorDescription?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(vendor =>
        vendor.category && selectedCategories.includes(vendor.category)
      )
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(vendor => (vendor.rating || 0) >= minRating)
    }

    // Verified only
    if (verifiedOnly) {
      filtered = filtered.filter(vendor => vendor.vendorVerified)
    }

    // City filter
    if (selectedCities.length > 0) {
      filtered = filtered.filter(vendor =>
        vendor.storeCity && selectedCities.includes(vendor.storeCity)
      )
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
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
  }, [search, selectedCategories, minRating, verifiedOnly, selectedCities, sortBy, vendors])

  // Get unique cities
  const citiesList = Array.from(new Set(vendors
    .map(v => v.storeCity)
    .filter(Boolean) as string[]
  )).sort()

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    )
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedCategories([])
    setMinRating(0)
    setVerifiedOnly(false)
    setSelectedCities([])
    setSortBy('name')
  }

  const hasActiveFilters = 
    search ||
    selectedCategories.length > 0 ||
    minRating > 0 ||
    verifiedOnly ||
    selectedCities.length > 0 ||
    sortBy !== 'name'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marketplace</h1>
          <p className="text-gray-600 text-lg">Discover exceptional vendors and quality products</p>

          {/* Search Bar */}
          <div className="relative mt-6">
            <input
              type="text"
              placeholder="Search vendors by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20 space-y-6">
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition"
                >
                  Clear all filters
                </button>
              )}

              {/* Sort */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sort by
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Sort vendors by"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="rating">Highest Rating</option>
                  <option value="products">Most Products</option>
                </select>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {VENDOR_CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  Minimum Rating
                </h3>
                <div className="space-y-2">
                  {[0, 3, 4, 4.5].map(rating => (
                    <label key={rating} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="rating"
                        value={rating}
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700 text-sm">
                        {rating === 0 ? 'All ratings' : `${rating}⭐ and up`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cities */}
              {citiesList.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    Location
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {citiesList.map(city => (
                      <label key={city} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCities.includes(city)}
                          onChange={() => toggleCity(city)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 text-sm">{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Badge */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 text-sm font-medium">Verified Vendors Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="inline-flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                <Filter className="h-5 w-5" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {selectedCategories.length + (minRating > 0 ? 1 : 0) + (verifiedOnly ? 1 : 0) + selectedCities.length}
                  </span>
                )}
              </button>

              {/* Mobile Filter Panel */}
              {showMobileFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/50" 
                    onClick={() => setShowMobileFilter(false)}
                  />
                  <div className="fixed left-0 right-0 top-0 z-50 bg-white rounded-b-lg shadow-lg max-h-96 overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold">Filters</h3>
                        <button
                          onClick={() => setShowMobileFilter(false)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Close filters"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Mobile Sort */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Sort</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          title="Sort vendors by"
                        >
                          <option value="name">Name</option>
                          <option value="rating">Rating</option>
                          <option value="products">Products</option>
                        </select>
                      </div>

                      {/* Mobile Categories */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Categories</label>
                        <div className="space-y-2">
                          {VENDOR_CATEGORIES.map(cat => (
                            <label key={cat} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat)}
                                onChange={() => toggleCategory(cat)}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm">{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Results Header */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredVendors.length}</span> vendor{filteredVendors.length !== 1 ? 's' : ''}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Vendors Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading vendors...</p>
                </div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-16 text-center">
                <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {search || hasActiveFilters
                    ? 'No vendors match your filters'
                    : 'No vendors available yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map(vendor => (
                  <Link key={vendor.id} href={`/vendor/${vendor.vendorName}`} className="group">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all h-full">
                      {/* Image */}
                      <div className="relative bg-gradient-to-br from-blue-400 to-purple-600 h-40 overflow-hidden">
                        {vendor.vendorImage ? (
                          <img
                            src={vendor.vendorImage}
                            alt={vendor.vendorName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="h-16 w-16 text-white opacity-50" />
                          </div>
                        )}
                        {vendor.vendorVerified && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            ✓ Verified
                          </div>
                        )}
                        {!vendor.vendorVerified && (
                          <div className="absolute top-3 right-3 bg-white text-gray-900 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {vendor.totalProducts || 0}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 line-clamp-2">
                          {vendor.vendorName}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {vendor.vendorDescription || 'Quality products'}
                        </p>

                        {/* Location */}
                        {(vendor.storeCity || vendor.storeState) && (
                          <div className="flex items-center gap-1 text-gray-600 text-sm mb-3">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span>{vendor.storeCity || 'Unknown'}</span>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex gap-4 py-3 border-t border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="font-semibold">{vendor.rating || 4.5}</span>
                            </div>
                            <p className="text-xs text-gray-500">Rating</p>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{vendor.totalProducts || 0}</p>
                            <p className="text-xs text-gray-500">Items</p>
                          </div>
                        </div>

                        <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition group-hover:shadow-lg">
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

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Become a Vendor</h2>
          <p className="text-blue-100 mb-6">Join our marketplace and reach thousands of customers</p>
          <Link
            href="/vendor/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Register Now
          </Link>
        </div>
      </div>
    </div>
  )
}
