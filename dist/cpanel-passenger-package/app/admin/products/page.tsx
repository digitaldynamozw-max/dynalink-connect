'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { AdminPageHeader, AdminSectionCard, AdminTableWrap } from '@/components/admin-ui'

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
  stock: 0,
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = useMemo(() => session?.user?.role === 'admin', [session])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      setError('Access denied. Admins only.')
      setLoading(false)
      return
    }

    void fetchProducts()
  }, [isAdmin, router, session, status])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to load products')
      }

      const data = (await res.json()) as Product[]
      setProducts(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleChange = (key: keyof typeof initialForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save product')
      }

      resetForm()
      await fetchProducts()
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
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      await fetchProducts()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (status === 'loading' || (loading && !products.length)) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading products...</div>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Product Management"
          description="Create, update, and retire marketplace products from one compact admin view."
        />

        <div className="p-3.5 sm:p-4">
          {error && error !== 'Access denied. Admins only.' ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title={editingId ? 'Edit Product' : 'Add Product'}>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Product Name</label>
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => handleChange('price', Number.parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.stock}
                    onChange={(e) => handleChange('stock', Number.parseInt(e.target.value || '0', 10))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Sale Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.salePrice}
                    onChange={(e) => handleChange('salePrice', Number.parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    step="0.01"
                  />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.onSale}
                    onChange={(e) => handleChange('onSale', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Mark as On Sale
                </label>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    placeholder="Enter product description"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="h-20 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={form.image}
                    onChange={(e) => handleChange('image', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => void saveProduct()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? 'Update' : 'Add'} Product
                </button>
                {editingId ? (
                  <button
                    onClick={resetForm}
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Catalog" description={`${products.length} products available`} contentClassName="p-0">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Name</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Category</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Price</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Stock</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs text-slate-900">{product.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.category || '-'}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-blue-600">${product.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.stock}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                handleChange('name', product.name)
                                handleChange('description', product.description || '')
                                handleChange('price', product.price)
                                handleChange('salePrice', product.salePrice || 0)
                                handleChange('onSale', Boolean(product.onSale))
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
                              onClick={() => void deleteProduct(product.id)}
                              title="Delete product"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
