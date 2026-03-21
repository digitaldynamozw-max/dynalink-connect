'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  category?: string
  stock: number
}

export default function VendorProductsPage() {
  const { data: session } = useSession() as any
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchProducts()
  }, [session])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vendor/products')
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return

    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete')
      await fetchProducts()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
          <Link
            href="/vendor/products/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-6">Add your first product to get started</p>
            <Link
              href="/vendor/products/new"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                {/* Image */}
                <div className="relative bg-gray-100 h-48 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-2">
                    <Link
                      href={`/vendor/products/${product.id}/edit`}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 inline-flex items-center gap-1 text-sm"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 inline-flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{product.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className="text-lg font-semibold text-gray-900">{product.stock}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
