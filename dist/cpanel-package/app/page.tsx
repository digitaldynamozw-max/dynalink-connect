import { Suspense } from 'react'
import { Categories } from '@/components/categories'
import { Hero } from '@/components/hero'
import { StoreGrid } from '@/components/store-grid'

export default function Home() {
  return (
    <div className="theme-app-shell min-h-screen">
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <Categories />
          <StoreGrid
            title="Closest Stores To Your Address"
            subtitle="Save your delivery address above and we’ll move matching stores to the front."
            filter="nearby"
            count={4}
          />
          <StoreGrid
            title="Top Featured Stores"
            subtitle="Priority stores your team wants customers to discover first."
            filter="featured"
            count={4}
          />
          <StoreGrid
            title="Top Rated Stores"
            subtitle="Highly rated storefronts with strong customer feedback."
            filter="top-rated"
            count={4}
          />
          <StoreGrid
            title="Most Active Stores"
            subtitle="Stores moving the most products right now."
            filter="most-active"
            count={4}
          />
        </Suspense>
      </div>
    </div>
  )
}
