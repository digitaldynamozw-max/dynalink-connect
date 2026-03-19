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

interface ProductsListProps {
  category?: string
}

export default function ProductsList({ category }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        let filtered = data
        if (category) {
          filtered = data.filter((p: Product) => p.category === category)
        }
        setProducts(filtered)
        setLoading(false)
      })
  }, [category])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {category ? `${category} Products` : 'All Products'}
          </h1>
          {category && (
            <a href="/products" className="text-blue-600 hover:text-blue-800">
              View All Products
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
              {product.image && (
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover rounded-md mb-4" />
              )}
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <div className="flex items-center mb-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                <span className="text-sm text-gray-500 ml-4">{product.salesCount} sold</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                <button
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                    })
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
