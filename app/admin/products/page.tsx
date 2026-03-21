'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Plus } from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  salePrice?: number
  onSale?: boolean
  image?: string
  category?: string
  stock: number
}

const initialForm = {
  name: '',
  description: '',
  price: 0,
  salePrice: 0,
  onSale: false,
  image: '',
  category: '',
  stock: 0
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = useMemo(() => (session?.user as any)?.role === 'admin', [session])

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      setError('Access denied. Admins only.')
      setLoading(false)
      return
    }

    const fetchProducts = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/products')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || 'Failed to load products')
        }
        const data = await res.json()
        setProducts(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [session, router, isAdmin])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleChange = (key: keyof typeof initialForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Failed to save product')
      }

      resetForm()
      const updated = await (await fetch('/api/products')).json()
      setProducts(updated)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete')

      const updated = await (await fetch('/api/products')).json()
      setProducts(updated)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading && !products.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading products...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Product Management</h1>

        {error && error !== 'Access denied. Admins only.' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Product Name</label>
              <input
                type="text"
                placeholder="Product Name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Price</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Category</label>
              <input
                type="text"
                placeholder="e.g., Electronics"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Stock Quantity</label>
              <input
                type="number"
                placeholder="0"
                value={form.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Sale Price (Optional)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.salePrice}
                onChange={(e) => handleChange('salePrice', parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.onSale}
                  onChange={(e) => handleChange('onSale', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Mark as On Sale
              </label>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="block text-sm font-semibold text-gray-700">Description</label>
              <textarea
                placeholder="Enter product description"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full border rounded px-3 py-2 h-20"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="block text-sm font-semibold text-gray-700">Image URL</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={form.image}
                onChange={(e) => handleChange('image', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={saveProduct}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {editingId ? 'Update' : 'Add'} Product
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Name</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Stock</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{product.name}</td>
                <td className="px-6 py-4">{product.category || '—'}</td>
                <td className="px-6 py-4 font-semibold text-blue-600">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => {
                      handleChange('name', product.name)
                      handleChange('description', product.description || '')
                      handleChange('price', product.price)
                      handleChange('image', product.image || '')
                      handleChange('category', product.category || '')
                      handleChange('stock', product.stock)
                      setEditingId(product.id)
                    }}
                    title="Edit product"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    title="Delete product"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
