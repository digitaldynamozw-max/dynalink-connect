import { Suspense } from 'react'
import { ProductGrid } from '@/components/product-grid'
import { Categories } from '@/components/categories'
import { Hero } from '@/components/hero'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <Categories />
          <ProductGrid title="Trending Products" filter="trending" />
          <ProductGrid title="Most Sold" filter="most-sold" />
          <ProductGrid title="Top Rated" filter="top-rated" />
        </Suspense>
      </div>
    </div>
  )
}
