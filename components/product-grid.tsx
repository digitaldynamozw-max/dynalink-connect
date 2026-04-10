'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store'
import { ShoppingCart, Star } from 'lucide-react'
import Link from 'next/link'
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
  vendorAddress?: string | null
  optionGroupsJson?: string | null
  resolvedOptionGroups?: ProductOptionGroup[]
  hasConfigurableOptions?: boolean
}

interface ProductGridProps {
  title: string
  filter?: 'trending' | 'most-sold' | 'top-rated' | 'featured' | 'collection'
  count?: number
}

const DEFAULT_PRODUCTS_PER_SECTION = 5

function shuffleProducts(items: Product[]) {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

function selectDiverseProducts(items: Product[], count: number) {
  const selected: Product[] = []
  const usedCategories = new Set<string>()
  const usedSources = new Set<string>()
  const sourceKey = (product: Product) => product.vendorId || 'admin-store'

  for (const product of items) {
    const category = product.category || 'Uncategorized'
    const source = sourceKey(product)

    if (!usedCategories.has(category) && !usedSources.has(source)) {
      selected.push(product)
      usedCategories.add(category)
      usedSources.add(source)
    }

    if (selected.length === count) {
      return selected
    }
  }

  for (const product of items) {
    if (!selected.some((selectedProduct) => selectedProduct.id === product.id)) {
      selected.push(product)
    }

    if (selected.length === count) {
      return selected
    }
  }

  return selected
}

export function ProductGrid({ title, filter = 'trending', count = DEFAULT_PRODUCTS_PER_SECTION }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : []
        const shuffled = shuffleProducts(items)
        let filtered = [...shuffled]

        switch (filter) {
          case 'featured':
            filtered = shuffled.slice(0, count)
            break
          case 'collection':
            filtered = shuffleProducts(items).slice(0, count)
            break
          case 'trending':
            filtered = selectDiverseProducts(shuffled, count)
            break
          case 'most-sold':
            filtered = selectDiverseProducts(
              [...shuffled].sort((a: Product, b: Product) => b.salesCount - a.salesCount),
              count
            )
            break
          case 'top-rated':
            filtered = selectDiverseProducts(
              [...shuffled].sort((a: Product, b: Product) => b.rating - a.rating),
              count
            )
            break
        }

        setProducts(filtered)
        setLoading(false)
      })
      .catch(() => {
        setProducts([])
        setLoading(false)
      })
  }, [count, filter])

  if (loading) return <div>Loading {title.toLowerCase()}...</div>

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <Link
          href="/products"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {products.map(product => (
          (() => {
            const productHasOptions =
              product.hasConfigurableOptions ??
              ((product.resolvedOptionGroups?.length ??
                getResolvedProductOptionGroups({
                  optionGroupsJson: product.optionGroupsJson,
                  category: product.category,
                  vendorCategory: product.vendorCategory,
                  vendorName: product.vendorName,
                }).length) > 0)
            return (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="block h-full"
          >
            <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg">
              {product.image ? (
                <div className="relative">
                  <img src={product.image} alt={product.name} className="h-44 w-full object-cover" />
                  {product.onSale && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold">
                      SALE
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-gray-200 text-gray-400">
                  No Image
                </div>
              )}
              <div className="flex flex-1 flex-col p-3">
                <h3 className="mb-1 line-clamp-2 text-base font-semibold text-gray-900">{product.name}</h3>
                <p className="mb-2 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                <div className="mb-3 flex items-center">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500 ml-4">{product.salesCount} sold</span>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {product.onSale && product.salePrice ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-bold text-red-600">${product.salePrice.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-gray-400 line-through">${product.price.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
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
                        vendorAddress: product.vendorAddress,
                      })
                      if (!result.ok) {
                        alert(result.error)
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {productHasOptions ? 'Choose' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </Link>
            )
          })()
        ))}
      </div>
    </section>
  )
}
