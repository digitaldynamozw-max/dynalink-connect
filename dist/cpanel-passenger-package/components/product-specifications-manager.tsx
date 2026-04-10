'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ProductSpecification } from '@/lib/product-options'

interface ProductSpecificationsManagerProps {
  specifications: ProductSpecification[]
  onChange: (specifications: ProductSpecification[]) => void
}

export function ProductSpecificationsManager({
  specifications,
  onChange,
}: ProductSpecificationsManagerProps) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  function addSpecification() {
    if (!label.trim() || !value.trim()) {
      alert('Enter both specification label and value.')
      return
    }

    onChange([
      ...specifications,
      {
        id: `spec-${Date.now()}`,
        label: label.trim(),
        value: value.trim(),
      },
    ])
    setLabel('')
    setValue('')
  }

  function removeSpecification(id: string) {
    onChange(specifications.filter((specification) => specification.id !== id))
  }

  return (
    <div className="space-y-4 border-t border-gray-200 pt-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Specifications</h3>
        <p className="mt-1 text-sm text-gray-600">
          Useful for electronics and technical products like laptops, phones, and appliances.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_1.4fr_auto]">
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Processor"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Intel Core i7"
        />
        <button
          type="button"
          onClick={addSpecification}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Spec
        </button>
      </div>

      {specifications.length ? (
        <div className="space-y-2">
          {specifications.map((specification) => (
            <div
              key={specification.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{specification.label}</p>
                <p className="text-sm text-gray-600">{specification.value}</p>
              </div>
              <button
                type="button"
                onClick={() => removeSpecification(specification.id)}
                className="text-red-600 hover:text-red-700"
                title="Remove specification"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
