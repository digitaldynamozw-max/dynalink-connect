'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Store } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { ProductOptionSelector } from '@/components/product-option-selector'
import { getProductAttributeSummary, isFoodProduct } from '@/lib/product-attributes'
import {
  buildCartItemId,
  getResolvedProductOptionGroups,
  getResolvedProductSpecifications,
  type ProductOptionGroup,
  type ProductSpecification,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'

interface VendorSelectedProductPanelProps {
  product: {
    id: string
    name: string
    description: string | null
    image: string | null
    category: string | null
    stock: number
    salesCount: number
    price: number
    salePrice: number | null
    onSale: boolean
    optionGroupsJson: string | null
    specificationsJson: string | null
    resolvedOptionGroups?: ProductOptionGroup[]
    resolvedSpecifications?: ProductSpecification[]
  }
  vendor: {
    id: string
    vendorName: string
    vendorCategory: string | null
    vendorAddress?: string | null
  }
}

export function VendorSelectedProductPanel({ product, vendor }: VendorSelectedProductPanelProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<SelectedProductOption[]>([])
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string>>({})
  const [selectedOptionsSummary, setSelectedOptionsSummary] = useState('')
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const optionGroups = useMemo(
    () =>
      product.resolvedOptionGroups ||
      getResolvedProductOptionGroups({
        optionGroupsJson: product.optionGroupsJson,
        category: product.category,
        vendorCategory: vendor.vendorCategory,
        vendorName: vendor.vendorName,
      }),
    [
      product.resolvedOptionGroups,
      product.optionGroupsJson,
      product.category,
      vendor.vendorCategory,
      vendor.vendorName,
    ]
  )
  const specifications = useMemo(
    () =>
      product.resolvedSpecifications ||
      getResolvedProductSpecifications({
        specificationsJson: product.specificationsJson,
        category: product.category,
        vendorCategory: vendor.vendorCategory,
        vendorName: vendor.vendorName,
      }),
    [
      product.resolvedSpecifications,
      product.specificationsJson,
      product.category,
      vendor.vendorCategory,
      vendor.vendorName,
    ]
  )
  const displayPrice = product.onSale && product.salePrice ? product.salePrice : product.price
  const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0)
  const finalPrice = displayPrice + optionsTotal
  const attributeSummary = getProductAttributeSummary({
    name: product.name,
    category: product.category,
    vendorCategory: vendor.vendorCategory,
    vendorName: vendor.vendorName,
    stock: product.stock,
  })
  const foodProduct = isFoodProduct({
    name: product.name,
    category: product.category,
    vendorCategory: vendor.vendorCategory,
    vendorName: vendor.vendorName,
  })

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

  const handleAddToCart = () => {
    const resolved = validateAndResolveSelectedOptions(optionGroups, selectedOptionsMap)
    if (!resolved.ok) {
      setSelectionError(resolved.error)
      return
    }

    const cartItemId = buildCartItemId(product.id, resolved.selectedOptions)
    const result = addItem({
      id: cartItemId,
      productId: product.id,
      name: product.name,
      price: displayPrice + resolved.optionsTotal,
      basePrice: displayPrice,
      image: product.image || undefined,
      vendorId: vendor.id,
      vendorName: vendor.vendorName,
      vendorAddress: vendor.vendorAddress || null,
      selectedOptions: resolved.selectedOptions,
      selectedOptionsSummary: resolved.selectedSummary,
    })

    if (!result.ok) {
      setSelectionError(result.error || 'Could not add this product to your cart.')
      return
    }

    setAddedToCart(true)
    setSelectionError(null)
    window.setTimeout(() => setAddedToCart(false), 1800)
  }

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[240px_1fr]">
        <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-100">
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Store className="h-12 w-12" />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Selected Product From This Store
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{product.name}</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            {product.description || 'Explore this product and browse more from the same vendor below.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {attributeSummary.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">${finalPrice.toFixed(2)}</span>
            <span>
              {foodProduct
                ? product.stock > 0
                  ? 'Available'
                  : 'Unavailable'
                : attributeSummary.availabilityLabel}
            </span>
            <span>Sold: {product.salesCount}</span>
          </div>

          {selectedOptionsSummary ? (
            <p className="mt-3 text-sm text-slate-600">Selected: {selectedOptionsSummary}</p>
          ) : null}

          {optionGroups.length ? (
            <div className="mt-6">
              <ProductOptionSelector
                key={product.id}
                groups={optionGroups}
                basePrice={displayPrice}
                onChange={handleOptionsChange}
              />
            </div>
          ) : null}

          {specifications.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {specifications.map((specification) => (
                <div
                  key={specification.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {specification.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{specification.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
                addedToCart
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {addedToCart ? 'Added To Cart' : 'Add To Cart'}
            </button>

            {selectionError ? (
              <p className="text-sm font-medium text-red-600">{selectionError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
