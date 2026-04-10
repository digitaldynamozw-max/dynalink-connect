'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Edit, Plus, Search, Tags, Trash2, Warehouse } from 'lucide-react'
import { AdminBadge, AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

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
  averageRating?: number
  salesCount?: number
  vendorName?: string | null
  hasConfigurableOptions?: boolean
  hasSpecifications?: boolean
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

type ProductFilter = 'all' | 'on-sale' | 'low-stock' | 'uncategorized'

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [productFilter, setProductFilter] = useState<ProductFilter>('all')
  const [search, setSearch] = useState('')

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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products.filter((product) => {
      if (productFilter === 'on-sale' && !product.onSale) return false
      if (productFilter === 'low-stock' && product.stock > 5) return false
      if (productFilter === 'uncategorized' && product.category?.trim()) return false

      if (!normalizedSearch) {
        return true
      }

      const haystack = `${product.name} ${product.category || ''} ${product.vendorName || ''}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [productFilter, products, search])

  const lowStockCount = products.filter((product) => product.stock <= 5).length
  const uncategorizedCount = products.filter((product) => !product.category?.trim()).length
  const onSaleCount = products.filter((product) => product.onSale).length
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0)
  const topProducts = [...products].sort((left, right) => (right.salesCount || 0) - (left.salesCount || 0)).slice(0, 5)

  if (status === 'loading' || (loading && !products.length)) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading products...</div>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Product Management"
          description="Catalog control for pricing, availability, and storefront readiness."
          action={
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none md:w-44"
                />
              </div>
              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value as ProductFilter)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="all">All products</option>
                <option value="on-sale">On sale</option>
                <option value="low-stock">Low stock</option>
                <option value="uncategorized">Uncategorized</option>
              </select>
            </>
          }
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          {error && error !== 'Access denied. Admins only.' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Total Products" value={products.length} helper="Items in the marketplace catalog" icon={Tags} />
            <AdminStatCard label="On Sale" value={onSaleCount} helper="Products currently carrying a sale price" icon={Tags} />
            <AdminStatCard label="Low Stock" value={lowStockCount} helper="Products with 5 units or fewer left" icon={Warehouse} />
            <AdminStatCard label="Uncategorized" value={uncategorizedCount} helper="Products needing classifier cleanup" icon={Tags} />
            <AdminStatCard label="Units In Stock" value={totalStock} helper="Combined available inventory count" icon={Warehouse} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <AdminSectionCard title={editingId ? 'Edit Product' : 'Add Product'} description="Create or update products without leaving the admin catalog.">
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
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
                    className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
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

            <div className="space-y-4">
              <AdminSectionCard title="Catalog Priorities" description="Five compact product cards highlighting items that matter most right now.">
                <div className="grid gap-3">
                  {topProducts.length === 0 ? (
                    <AdminEmptyState message="No products are available in the catalog yet." />
                  ) : (
                    topProducts.map((product) => (
                      <div key={product.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{product.vendorName || product.category || 'Marketplace product'}</p>
                          </div>
                          <AdminBadge label={product.onSale ? 'On sale' : product.stock <= 5 ? 'Low stock' : 'Live'} tone={product.onSale ? 'green' : product.stock <= 5 ? 'amber' : 'blue'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1">${product.price.toFixed(2)}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{product.stock} in stock</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{product.salesCount || 0} sold</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{product.hasSpecifications ? 'Specs ready' : 'Specs missing'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSectionCard>
            </div>
          </div>

          <AdminSectionCard title="Catalog" description={`${filteredProducts.length} products in the current view`} contentClassName="p-0">
            <AdminTableWrap>
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Category</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Price</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Stock</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <AdminEmptyState message="No products match the current filters." />
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-slate-900">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{product.vendorName || 'Admin store item'}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.category || 'Uncategorized'}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-blue-600">
                          ${product.price.toFixed(2)}
                          {product.onSale && product.salePrice ? <span className="ml-1 text-slate-400">/ ${product.salePrice.toFixed(2)}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.stock}</td>
                        <td className="px-3 py-2">
                          <AdminBadge
                            label={product.onSale ? 'On sale' : product.stock <= 5 ? 'Low stock' : 'Standard'}
                            tone={product.onSale ? 'green' : product.stock <= 5 ? 'amber' : 'neutral'}
                          />
                        </td>
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
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableWrap>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
