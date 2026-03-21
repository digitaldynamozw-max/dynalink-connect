'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Upload, Save, ChevronLeft, Loader } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ProductForm {
  name: string
  description: string
  price: string
  salePrice: string
  onSale: boolean
  category: string
  stock: string
  image?: string
}

export default function ProductFormPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() as any
  const productId = typeof params?.id === 'string' ? params.id : null
  const isEdit = productId && productId !== 'new'

  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    onSale: false,
    category: '',
    stock: '',
    image: ''
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(isEdit)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    if (isEdit) {
      fetchProduct()
    } else {
      setLoading(false)
    }
  }, [session, isEdit])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/vendor/products/${productId}`)
      if (!res.ok) throw new Error('Failed to load product')
      const data = await res.json()
      setForm({
        name: data.name || '',
        description: data.description || '',
        price: data.price?.toString() || '',
        salePrice: data.salePrice?.toString() || '',
        onSale: data.onSale || false,
        category: data.category || '',
        stock: data.stock?.toString() || '',
        image: data.image || ''
      })
      if (data.image) {
        setImagePreview(data.image)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as any
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm(prev => ({ ...prev, [name]: fieldValue }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    setError(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image || null

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      const res = await fetch('/api/vendor/products/image', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Failed to upload image')
      const data = await res.json()
      return data.imageUrl
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate required fields
      if (!form.name || !form.price || !form.stock) {
        throw new Error('Please fill in all required fields')
      }

      // Upload image if needed
      let imageUrl: string | null = form.image || null
      if (imageFile) {
        imageUrl = await uploadImage()
        if (!imageUrl && !form.image) {
          throw new Error('Failed to upload image')
        }
      }

      // Submit product
      const method = isEdit ? 'PUT' : 'POST'
      const url = isEdit ? `/api/vendor/products/${productId}` : '/api/vendor/products'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
          onSale: form.onSale,
          category: form.category,
          stock: parseInt(form.stock),
          image: imageUrl
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Failed to save product')
      }

      router.push('/vendor/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/vendor/products"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Create New Product'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Product Image</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                title="Select product image file"
              />

              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Sale Price and On Sale */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">Sale Price (Optional)</label>
              <input
                type="number"
                name="salePrice"
                value={form.salePrice}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  name="onSale"
                  checked={form.onSale}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Mark as On Sale
              </label>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleInputChange}
              title="Select product category"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="food">Food & Beverages</option>
              <option value="books">Books</option>
              <option value="home">Home & Garden</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/vendor/products"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : saving ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isEdit ? 'Update Product' : 'Create Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
