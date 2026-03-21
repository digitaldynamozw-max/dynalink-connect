'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { VendorSidebar } from '@/components/vendor-sidebar'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  salePrice?: number | null
  onSale?: boolean
  image?: string | null
  category?: string | null
  stock: number
  salesCount: number
}

export default function VendorCatalog() {
  const { data: session } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [grouped, setGrouped] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const fetchVendorProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor/products', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Failed to fetch vendor products:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (session) {
      fetchVendorProducts()
    }
  }, [session, fetchVendorProducts])

  useEffect(() => {
    const groupedProducts: Record<string, Product[]> = {}
    products.forEach(product => {
      const cat = product.category || 'Uncategorized'
      if (!groupedProducts[cat]) {
        groupedProducts[cat] = []
      }
      groupedProducts[cat].push(product)
    })
    setGrouped(groupedProducts)
    setActiveCategory(null)
  }, [products])

  async function deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId))
      } else {
        alert('Failed to delete product')
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Error deleting product')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your catalog...</p>
        </div>
      </div>
    )
  }

  const categories = Object.keys(grouped).sort()

  return (
    <div className="flex">
      <VendorSidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Catalog</h1>
              <p className="text-gray-600 mt-1">Manage and organize your products</p>
            </div>
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              title="Add new product"
            >
              <Plus className="h-5 w-5" />
              Add Product
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {products.reduce((sum, p) => sum + p.salesCount, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-sm">In Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {products.filter(p => p.stock > 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* Catalog */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center mx-4 sm:mx-6 lg:mx-8">
            <p className="text-gray-600 mb-4">No products yet. Start by adding your first product!</p>
            <Link
              href="/vendor/products/new"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            {categories.map(category => (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{category}</h2>
                      <p className="text-blue-100 text-sm mt-1">{grouped[category].length} items</p>
                    </div>
                    <button
                      onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                      className="text-blue-100 hover:text-white transition"
                      title={activeCategory === category ? 'Collapse' : 'Expand'}
                    >
                      {activeCategory === category ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Category Products Grid */}
                {(!activeCategory || activeCategory === category) && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {grouped[category].map(product => (
                        <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                          {/* Product Image */}
                          <div className="relative aspect-square bg-gray-100 overflow-hidden group">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gray-200">
                                <span className="text-gray-400">No image</span>
                              </div>
                            )}

                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Out of Stock</span>
                              </div>
                            )}

                            {/* Quick Actions */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <Link
                                href={`/vendor/products/${product.id}/edit`}
                                className="bg-white text-gray-900 p-2 rounded-full hover:bg-blue-600 hover:text-white transition"
                                title="Edit product"
                              >
                                <Edit2 className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="bg-white text-gray-900 p-2 rounded-full hover:bg-red-600 hover:text-white transition"
                                title="Delete product"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>

                            {/* Pricing */}
                            <div className="mt-3 flex items-baseline gap-2">
                              {product.onSale && product.salePrice ? (
                                <>
                                  <span className="text-lg font-bold text-red-600">
                                    ${product.salePrice.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    ${product.price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">
                                  ${product.price.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {/* Sale Badge - On Top of Stock Amount */}
                            <div className="relative mt-3 mb-4">
                              {product.onSale && (
                                <div className="absolute -top-3 left-0 z-10">
                                  <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                    ON SALE
                                  </span>
                                </div>
                              )}
                              
                              {/* Stock & Sales */}
                              <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
                                <span className={product.stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                </span>
                                <span>{product.salesCount} sold</span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`px-2 py-1 rounded ${product.onSale ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {product.onSale ? 'On Sale' : 'Regular'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
