'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Store } from 'lucide-react'

interface Vendor {
  id: string
  vendorName?: string | null
  vendorCategory?: string | null
  totalProducts?: number
  rating?: number
}

export function StoreCategoryHighlights() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

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

  const categoryHighlights = useMemo(() => {
    const grouped = new Map<string, Vendor[]>()

    for (const vendor of vendors) {
      const category = vendor.vendorCategory || 'General'
      const current = grouped.get(category) || []
      current.push(vendor)
      grouped.set(category, current)
    }

    return Array.from(grouped.entries())
      .map(([category, stores]) => ({
        category,
        stores: stores.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 2),
        totalStores: stores.length,
      }))
      .sort((a, b) => b.totalStores - a.totalStores)
      .slice(0, 6)
  }, [vendors])

  if (loading) {
    return <div className="mb-8 text-sm text-gray-500">Loading store categories...</div>
  }

  if (!categoryHighlights.length) {
    return null
  }

  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Stores In These Categories</h2>
        <p className="mt-1 text-sm text-gray-600">Browse standout stores by the departments customers shop most.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categoryHighlights.map((group) => (
          <Link
            key={group.category}
            href={`/vendors?category=${encodeURIComponent(group.category)}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Category</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{group.category}</h3>
                <p className="mt-1 text-sm text-slate-500">{group.totalStores} stores available</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Store className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {group.stores.map((store) => (
                <div key={store.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{store.vendorName || 'Marketplace Store'}</p>
                    <p className="text-xs text-slate-500">{store.totalProducts || 0} products</p>
                  </div>
                  <p className="text-xs font-semibold text-amber-600">{(store.rating || 0).toFixed(1)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
              Explore stores
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
