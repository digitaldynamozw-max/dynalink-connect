'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import { Star, ShoppingCart, Truck, Shield, Store } from 'lucide-react'
import Link from 'next/link'
import { getProductAttributeSummary, isFoodProduct } from '@/lib/product-attributes'
import { toVendorSlug } from '@/lib/vendor-slug'
import { ProductOptionSelector } from '@/components/product-option-selector'
import {
  buildCartItemId,
  getResolvedProductOptionGroups,
  getResolvedProductSpecifications,
  type ProductOptionGroup,
  type ProductSpecification,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'

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
  vendorId?: string
  vendorName?: string | null
  vendorCategory?: string | null
  optionGroupsJson?: string | null
  specificationsJson?: string | null
  resolvedOptionGroups?: ProductOptionGroup[]
  resolvedSpecifications?: ProductSpecification[]
  hasConfigurableOptions?: boolean
  hasSpecifications?: boolean
}

export default function ProductDetailsPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<SelectedProductOption[]>([])
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string>>({})
  const [selectedOptionsSummary, setSelectedOptionsSummary] = useState('')
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const addItem = useCartStore(state => state.addItem)
  const optionGroups = useMemo(
    () =>
      product?.resolvedOptionGroups ||
      getResolvedProductOptionGroups({
        optionGroupsJson: product?.optionGroupsJson,
        category: product?.category,
        vendorCategory: product?.vendorCategory,
        vendorName: product?.vendorName,
      }),
    [product?.resolvedOptionGroups, product?.optionGroupsJson, product?.category, product?.vendorCategory, product?.vendorName]
  )
  const specifications = useMemo(
    () =>
      product?.resolvedSpecifications ||
      getResolvedProductSpecifications({
        specificationsJson: product?.specificationsJson,
        category: product?.category,
        vendorCategory: product?.vendorCategory,
        vendorName: product?.vendorName,
      }),
    [
      product?.resolvedSpecifications,
      product?.specificationsJson,
      product?.category,
      product?.vendorCategory,
      product?.vendorName,
    ]
  )
  const handleOptionsChange = useCallback((selection: {
    selectedOptions: SelectedProductOption[]
    totalPrice: number
    selectedSummary: string
    selectedMap: Record<string, string>
  }) => {
    setSelectedOptions(selection.selectedOptions)
    setSelectedOptionsMap(selection.selectedMap)
    setSelectedOptionsSummary(selection.selectedSummary)
    setSelectionError(null)
  }, [])

  useEffect(() => {
    if (!productId) return

    const fetchProduct = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) {
          throw new Error('Product not found')
        }
        const data = await res.json()
        setProduct(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  useEffect(() => {
    setSelectedOptions([])
    setSelectedOptionsMap({})
    setSelectedOptionsSummary('')
    setSelectionError(null)
    setQuantity(1)
  }, [product?.id])

  const handleAddToCart = () => {
    if (!product) return

    const resolved = validateAndResolveSelectedOptions(optionGroups, selectedOptionsMap)
    if (!resolved.ok) {
      setSelectionError(resolved.error)
      return
    }

    const unitPrice = (product.onSale && product.salePrice ? product.salePrice : product.price) + resolved.optionsTotal
    const cartItemId = buildCartItemId(product.id, resolved.selectedOptions)

    for (let i = 0; i < quantity; i++) {
      const result = addItem({
        id: cartItemId,
        productId: product.id,
        name: product.name,
        price: unitPrice,
        basePrice: product.onSale && product.salePrice ? product.salePrice : product.price,
        image: product.image,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        selectedOptions: resolved.selectedOptions,
        selectedOptionsSummary: resolved.selectedSummary,
      })

      if (!result.ok) {
        alert(result.error)
        return
      }
    }
    
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link href="/products" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            View All Products
          </Link>
        </div>
      </div>
    )
  }

  const displayPrice = product.onSale && product.salePrice ? product.salePrice : product.price
  const originalPrice = product.price
  const discountPercentage = product.onSale && product.salePrice 
    ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
    : 0
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
  const vendorHref = product.vendorName ? `/vendor/${toVendorSlug(product.vendorName)}?product=${product.id}` : null
  const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0)
  const finalDisplayPrice = displayPrice + optionsTotal

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
          <span className="text-gray-400">/</span>
          <Link href="/products" className="text-blue-600 hover:text-blue-700">Products</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Image Section */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg relative">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-96 max-w-96 object-contain"
                />
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">No Image Available</span>
                </div>
              )}
              
              {product.onSale && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold">
                  SALE -{discountPercentage}%
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="flex flex-col">
              {/* Category */}
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {product.category || 'Uncategorized'}
                </span>
              </div>

              {/* Name and Rating */}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {vendorHref && (
                <Link
                  href={vendorHref}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Store className="h-4 w-4" />
                  Sold by {product.vendorName}
                </Link>
              )}
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-lg font-semibold text-gray-900">{product.rating}</span>
                </div>
                <span className="text-gray-600">({product.salesCount} sold)</span>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {attributeSummary.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {optionGroups.length ? (
                <div className="mb-8">
                  <ProductOptionSelector
                    key={product.id}
                    groups={optionGroups}
                    basePrice={displayPrice}
                    onChange={handleOptionsChange}
                  />
                  {selectionError ? (
                    <p className="mt-3 text-sm font-medium text-red-600">{selectionError}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Price Section */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-gray-900">${finalDisplayPrice.toFixed(2)}</span>
                    {product.onSale && product.salePrice && (
                      <span className="text-2xl text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {product.onSale && (
                    <span className="text-lg font-bold text-red-600 bg-red-100 px-3 py-1 rounded">
                      Save ${(originalPrice - displayPrice).toFixed(2)}
                    </span>
                  )}
                </div>
                {selectedOptionsSummary ? (
                  <p className="text-sm text-slate-600">Selected: {selectedOptionsSummary}</p>
                ) : null}
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {specifications.length ? (
                <div className="mb-8">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Specifications</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {specifications.map((specification) => (
                      <div key={specification.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {specification.label}
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{specification.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Stock Status */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                {product.stock > 0 ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    {attributeSummary.availabilityLabel}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    {foodProduct ? 'Unavailable' : attributeSummary.availabilityLabel}
                  </div>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div className="mb-8 flex gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stock === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setQuantity(Math.max(1, Math.min(val, product.stock)))
                    }}
                    min="1"
                    max={product.stock}
                    title="Product quantity"
                    placeholder="1"
                    className="w-16 text-center border-0 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={product.stock === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                    addedToCart
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-gray-200 pt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Free shipping on orders over $100</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">30-day money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
