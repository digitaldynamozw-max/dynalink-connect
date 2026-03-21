'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Variant {
  id?: string
  name: string
  type: 'size' | 'color' | 'material'
  value: string
  price?: number
  stock?: number
}

interface ProductVariantManagerProps {
  variants: Variant[]
  onVariantsChange: (variants: Variant[]) => void
}

export function ProductVariantManager({ variants, onVariantsChange }: ProductVariantManagerProps) {
  const [form, setForm] = useState({ type: 'size' as const, value: '', name: '', price: 0, stock: 0 })

  function addVariant() {
    if (!form.value) {
      alert('Please enter a variant value')
      return
    }

    const newVariant: Variant = {
      id: `variant_${Date.now()}`,
      name: form.name || form.type,
      type: form.type,
      value: form.value,
      price: form.price || 0,
      stock: form.stock || 0,
    }

    onVariantsChange([...variants, newVariant])
    setForm({ type: 'size', value: '', name: '', price: 0, stock: 0 })
  }

  function removeVariant(id?: string) {
    if (!id) return
    onVariantsChange(variants.filter(v => v.id !== id))
  }

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Variants (Optional)</h3>

      {/* Add Variant Form */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="variant-type">
              Variant Type
            </label>
            <select
              id="variant-type"
              value={form.type || 'size'}
              onChange={e => {
                const val = e.target.value as 'color' | 'size' | 'material'
                setForm({ ...form, type: val })
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select variant type"
            >
              <option value="size">Size</option>
              <option value="color">Color</option>
              <option value="material">Material</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value (e.g., &quot;Small&quot;, &quot;Red&quot;)
            </label>
            <input
              type="text"
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter variant value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 'Available Sizes'"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extra Price (+)
            </label>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock for this Variant
            </label>
            <input
              type="number"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addVariant}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          title="Add variant"
        >
          <Plus className="h-5 w-5" />
          Add Variant
        </button>
      </div>

      {/* Variants List */}
      {variants.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Added Variants</h4>
          <div className="space-y-2">
            {variants.map(variant => (
              <div key={variant.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {variant.name || variant.type}: {variant.value}
                  </p>
                  <div className="flex gap-4 mt-1">
                    {variant.price && variant.price !== null && variant.price > 0 && (
                      <span className="text-sm text-gray-600">
                        Extra Price: +${(variant.price as number).toFixed(2)}
                      </span>
                    )}
                    {variant.stock && variant.stock !== null && variant.stock > 0 && (
                      <span className="text-sm text-gray-600">
                        Stock: {variant.stock}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeVariant(variant.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Remove variant"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
