'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCartStore } from '@/lib/store'
import { ShoppingCart, Star, Filter, Store, X } from 'lucide-react'
import Link from 'next/link'
import { getProductAttributeSummary, isFoodProduct } from '@/lib/product-attributes'
import { toVendorSlug } from '@/lib/vendor-slug'
import { getResolvedProductOptionGroups } from '@/lib/product-options'
import type { ProductOptionGroup } from '@/lib/product-options'

interface Product {
  id: string
  name: string
  description: string
  price: number
  salePrice?: number
  onSale?: boolean
  image?: string
  category?: string
  stock: number
  salesCount: number
  rating: number
  vendorId?: string | null
  vendorName?: string | null
  vendorCategory?: string | null
  optionGroupsJson?: string | null
  resolvedOptionGroups?: ProductOptionGroup[]
  hasConfigurableOptions?: boolean
}

interface ProductsListProps {
  category?: string
}

const CATEGORIES = [
  'Electronics',
  'Books',
  'Home',
  'Sports',
  'Clothing',
  'Beauty',
  'Food & Beverage',
  'Toys & Games',
  'Health',
  'Office',
  'Automotive',
  'Pet Supplies',
]
const PRICE_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $250', min: 100, max: 250 },
  { label: '$250+', min: 250, max: Infinity },
]

export default function ProductsList({ category }: ProductsListProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(category)
  const [searchTerm, setSearchTerm] = useState('')
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [selectedPriceRange, setSelectedPriceRange] = useState({ min: 0, max: Infinity })
  const [minRating, setMinRating] = useState(0)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'rating' | 'sales'>('name')
  const addItem = useCartStore(state => state.addItem)

  // Fetch products
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setAllProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setAllProducts([])
        setLoading(false)
      })
  }, [])

  const products = useMemo(() => {
    let filtered = allProducts

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Price filter
    filtered = filtered.filter(p => p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max)

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(p => p.rating >= minRating)
    }

    // Stock filter
    if (inStockOnly) {
      filtered = filtered.filter(p => p.stock > 0)
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating)
        break
      case 'sales':
        sorted.sort((a, b) => b.salesCount - a.salesCount)
        break
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [allProducts, inStockOnly, minRating, searchTerm, selectedCategory, selectedPriceRange, sortBy])

  const handleCategoryClick = (cat: string | undefined) => {
    setSelectedCategory(cat)
    setShowMobileFilter(false)
  }

  const clearFilters = () => {
    setSelectedCategory(undefined)
    setSearchTerm('')
    setSelectedPriceRange({ min: 0, max: Infinity })
    setMinRating(0)
    setInStockOnly(false)
    setSortBy('name')
  }

  const hasActiveFilters = selectedCategory || searchTerm || selectedPriceRange.max !== Infinity || minRating > 0 || inStockOnly || sortBy !== 'name'

  const getMarketplaceHref = (product: Product) => {
    if (!product.vendorName) {
      return `/products/${product.id}`
    }

    return `/vendor/${toVendorSlug(product.vendorName)}?product=${product.id}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marketplace</h1>
          <p className="text-gray-600 mb-6">Browse products across all stores, then jump into a vendor storefront to explore more.</p>

          {/* Search Bar */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                title="Clear search"
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20 space-y-6">
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
                <h3 className="font-semibold text-gray-900 mb-3">Sort by</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  title="Sort products by"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                  <option value="rating">Highest Rating</option>
                  <option value="sales">Best Sellers</option>
                </select>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryClick(undefined)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      !selectedCategory
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All Products
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition ${
                        selectedCategory === cat
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                <div className="space-y-2">
                  {PRICE_RANGES.map(range => (
                    <label key={range.label} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="price"
                        checked={selectedPriceRange.min === range.min && selectedPriceRange.max === range.max}
                        onChange={() => setSelectedPriceRange({ min: range.min, max: range.max })}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700 text-sm">{range.label}</span>
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

              {/* Stock Filter */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 text-sm font-medium">In Stock Only</span>
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
                          title="Close filters"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Mobile Sort */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Sort</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          title="Sort products by"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="name">Name</option>
                          <option value="price-asc">Price (Low to High)</option>
                          <option value="price-desc">Price (High to Low)</option>
                          <option value="rating">Rating</option>
                          <option value="sales">Best Sellers</option>
                        </select>
                      </div>

                      {/* Mobile Categories */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Category</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="cat"
                              checked={!selectedCategory}
                              onChange={() => handleCategoryClick(undefined)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">All Products</span>
                          </label>
                          {CATEGORIES.map(cat => (
                            <label key={cat} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="cat"
                                checked={selectedCategory === cat}
                                onChange={() => handleCategoryClick(cat)}
                                className="w-4 h-4"
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
                Showing <span className="font-semibold text-gray-900">{products.length}</span> product{products.length !== 1 ? 's' : ''}
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

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-16 text-center">
                <p className="text-gray-500 text-lg">
                  {searchTerm || hasActiveFilters ? 'No products match your criteria' : 'No products available'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-blue-600 hover:text-blue-700 mt-4 font-medium"
                  >
                    Clear filters and try again
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map(product => {
                  const productHasOptions =
                    product.hasConfigurableOptions ??
                    ((product.resolvedOptionGroups?.length ??
                      getResolvedProductOptionGroups({
                        optionGroupsJson: product.optionGroupsJson,
                        category: product.category,
                        vendorCategory: product.vendorCategory,
                        vendorName: product.vendorName,
                      }).length) > 0)
                  const attributeSummary = getProductAttributeSummary({
                    name: product.name,
                    category: product.category,
                    vendorName: product.vendorName,
                    stock: product.stock,
                  })
                  const foodProduct = isFoodProduct({
                    name: product.name,
                    category: product.category,
                    vendorName: product.vendorName,
                  })

                  return (
                  <Link key={product.id} href={getMarketplaceHref(product)} className="block h-full">
                    <div className="group flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-xl">
                      {/* Image */}
                      <div className="relative h-44 overflow-hidden bg-gray-100">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-400">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-xs font-semibold text-gray-900 shadow">
                          {product.category || 'Other'}
                        </div>
                        {product.onSale && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold shadow">
                            SALE
                          </div>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {foodProduct ? 'Unavailable' : 'Out of Stock'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-3">
                        <h3 className="mb-1 line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-600">
                          {product.name}
                        </h3>
                        <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          <Store className="h-3.5 w-3.5" />
                          {product.vendorName || 'Marketplace Store'}
                        </div>
                        <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                          {product.description}
                        </p>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {attributeSummary.badges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>

                        {/* Rating */}
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm font-medium text-gray-900">{product.rating.toFixed(2)}</span>
                          </div>
                          <span className="text-xs text-gray-500">({product.salesCount} sold)</span>
                        </div>

                        <div className="mb-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.stock > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {attributeSummary.availabilityLabel}
                          </span>
                        </div>

                        {/* Price and Button */}
                        <div className="mt-auto flex items-end justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {product.onSale && product.salePrice ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-2xl font-bold text-red-600">${product.salePrice.toFixed(2)}</span>
                                <span className="text-lg font-semibold text-gray-400 line-through">${product.price.toFixed(2)}</span>
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                                  {Math.round(((product.price - product.salePrice) / product.price) * 100)}% off
                                </span>
                              </div>
                            ) : (
                              <span className="text-xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              if (productHasOptions) {
                                window.location.href = `/products/${product.id}`
                                return
                              }
                              const result = addItem({
                                id: product.id,
                                productId: product.id,
                                name: product.name,
                                price: product.onSale && product.salePrice ? product.salePrice : product.price,
                                image: product.image,
                                vendorId: product.vendorId,
                                vendorName: product.vendorName,
                              })
                              if (!result.ok) {
                                alert(result.error)
                              }
                            }}
                            disabled={product.stock === 0}
                            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="hidden sm:inline">{productHasOptions ? 'Choose' : 'Add'}</span>
                          </button>
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-500">
                          Tap the card to visit this store and see more products from the same vendor.
                        </p>
                      </div>
                    </div>
                  </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
