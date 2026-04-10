'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { getProductAttributeSummary, isFoodProduct } from '@/lib/product-attributes'
import { buildCartItemId, getResolvedProductOptionGroups } from '@/lib/product-options'
import type { ProductOptionGroup } from '@/lib/product-options'
import { toVendorSlug } from '@/lib/vendor-slug'

interface VendorStoreProduct {
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
  resolvedOptionGroups?: ProductOptionGroup[]
  hasConfigurableOptions?: boolean
  ratings: Array<{ rating: number }>
}

interface VendorStoreProductsGridProps {
  vendor: {
    id: string
    vendorName: string
    vendorCategory: string | null
  }
  products: VendorStoreProduct[]
  selectedProductId?: string | null
}

export function VendorStoreProductsGrid({
  vendor,
  products,
  selectedProductId,
}: VendorStoreProductsGridProps) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => {
        const avgProductRating =
          product.ratings.length > 0
            ? (
                product.ratings.reduce((sum, rating) => sum + rating.rating, 0) /
                product.ratings.length
              ).toFixed(2)
            : '0.00'

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
        const hasOptions =
          product.hasConfigurableOptions ??
          ((product.resolvedOptionGroups?.length ??
            getResolvedProductOptionGroups({
              optionGroupsJson: product.optionGroupsJson,
              category: product.category,
              vendorCategory: vendor.vendorCategory,
              vendorName: vendor.vendorName,
            }).length) > 0)
        const isSelected = selectedProductId === product.id

        return (
          <div
            key={product.id}
            className={`overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex h-40 w-full items-center justify-center overflow-hidden bg-gray-200">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={320}
                  height={160}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>

            <div className="p-4">
              <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900">
                {product.name}
              </h3>

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

              {product.ratings.length > 0 && (
                <div className="mb-2 flex items-center space-x-1">
                  <div className="flex text-xs text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < Math.round(Number.parseFloat(avgProductRating)) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">{avgProductRating} ({product.ratings.length})</span>
                </div>
              )}

              <p className="mb-3 text-sm text-gray-600">
                {product.description ? `${product.description.slice(0, 60)}...` : 'No description'}
              </p>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">
                  ${(product.onSale && product.salePrice ? product.salePrice : product.price).toFixed(2)}
                </p>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {foodProduct
                    ? product.stock > 0
                      ? 'Available'
                      : 'Unavailable'
                    : attributeSummary.availabilityLabel}
                </span>
              </div>

              {isSelected ? (
                <div className="mt-3 block w-full rounded-lg bg-blue-600 py-2 text-center text-sm font-semibold text-white">
                  Selected Product
                </div>
              ) : hasOptions ? (
                <Link
                  href={`/vendor/${toVendorSlug(vendor.vendorName)}?product=${product.id}`}
                  className="mt-3 block w-full rounded-lg bg-blue-600 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Choose Options
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const unitPrice = product.onSale && product.salePrice ? product.salePrice : product.price
                    const result = addItem({
                      id: buildCartItemId(product.id, []),
                      productId: product.id,
                      name: product.name,
                      price: unitPrice,
                      basePrice: unitPrice,
                      image: product.image || undefined,
                      vendorId: vendor.id,
                      vendorName: vendor.vendorName,
                      selectedOptions: [],
                      selectedOptionsSummary: '',
                    })

                    if (!result.ok) {
                      alert(result.error)
                    }
                  }}
                  disabled={product.stock === 0}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add To Cart
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
