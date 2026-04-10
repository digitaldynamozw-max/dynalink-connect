'use client'

import { useState } from 'react'

interface Variant {
  id?: string
  name: string
  type: 'size' | 'color' | 'material'
  value: string
  price?: number
  stock?: number
}

interface ProductVariantSelectorProps {
  variants: Variant[]
  basePrice: number
  onVariantSelect: (variant: Variant) => void
}

export function ProductVariantSelector({ variants, basePrice, onVariantSelect }: ProductVariantSelectorProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  function handleVariantChange(type: string, value: string) {
    const newSelection = { ...selectedVariants, [type]: value }
    setSelectedVariants(newSelection)

    // Find the matching variant
    const selected = variants.find(v => v.type === type && v.value === value)
    if (selected) {
      onVariantSelect(selected)
    }
  }

  // Group variants by type
  const variantsByType: Record<string, Variant[]> = {}
  variants.forEach(v => {
    if (!variantsByType[v.type]) {
      variantsByType[v.type] = []
    }
    variantsByType[v.type].push(v)
  })

  if (variants.length === 0) {
    return null
  }

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Options</h3>

      <div className="space-y-6">
        {Object.entries(variantsByType).map(([type, typeVariants]) => (
          <div key={type}>
            <label className="block text-sm font-medium text-gray-700 mb-3 capitalize">
              {typeVariants[0]?.name || type}
            </label>

            {type === 'color' ? (
              // Color swatches
              <div className="flex gap-3">
                {typeVariants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantChange(type, variant.value)}
                    className={`relative w-10 h-10 rounded-lg border-2 transition ${
                      selectedVariants[type] === variant.value
                        ? 'border-blue-600'
                        : 'border-gray-300'
                    }`}
                    data-color={variant.value}
                    title={`Select ${variant.value}`}
                  >
                    {selectedVariants[type] === variant.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold checkmark">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              // Size/Material buttons
              <div className="flex gap-2 flex-wrap">
                {typeVariants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantChange(type, variant.value)}
                    disabled={!variant.stock || variant.stock <= 0}
                    className={`px-4 py-2 rounded-lg border-2 transition ${
                      selectedVariants[type] === variant.value
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : variant.stock && variant.stock > 0
                        ? 'border-gray-300 text-gray-700 hover:border-blue-600'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-medium">{variant.value}</span>
                    {variant.price && variant.price > 0 && (
                      <span className="text-xs ml-2">+${variant.price.toFixed(2)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Stock info */}
            {selectedVariants[type] && (
              <p className="text-xs text-gray-600 mt-2">
                Stock: {typeVariants.find(v => v.value === selectedVariants[type])?.stock || 0} available
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Price update */}
      {Object.keys(selectedVariants).length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <p className="text-lg font-semibold text-gray-900">
            Price: ${(basePrice + calculateVariantPrice(variants, selectedVariants)).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  )
}

function calculateVariantPrice(variants: Variant[], selected: Record<string, string>): number {
  let totalPrice = 0

  Object.entries(selected).forEach(([type, value]) => {
    const variant = variants.find(v => v.type === type && v.value === value)
    if (variant?.price) {
      totalPrice += variant.price
    }
  })

  return totalPrice
}
