'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store'
import { ShoppingCart, Star } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image?: string
  category?: string
  stock: number
  salesCount: number
  rating: number
}

interface ProductGridProps {
  title: string
  filter: 'trending' | 'most-sold' | 'top-rated'
}

export function ProductGrid({ title, filter }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        let filtered = data

        switch (filter) {
          case 'trending':
            filtered = data.slice(0, 4) // First 4 as trending
            break
          case 'most-sold':
            filtered = data.sort((a: Product, b: Product) => b.salesCount - a.salesCount).slice(0, 4)
            break
          case 'top-rated':
            filtered = data.sort((a: Product, b: Product) => b.rating - a.rating).slice(0, 4)
            break
        }

        setProducts(filtered)
        setLoading(false)
      })
  }, [filter])

  if (loading) return <div>Loading {title.toLowerCase()}...</div>

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <a href="/products" className="text-blue-600 hover:text-blue-800 font-medium">
          View All →
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                </div>
                <span className="text-sm text-gray-500 ml-4">{product.salesCount} sold</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                <button
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image
                  })}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center gap-1 text-sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}