'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildSelectedOptionsSummary,
  getOptionsTotal,
  getSelectedOptionsMap,
  type ProductOptionGroup,
  type SelectedProductOption,
} from '@/lib/product-options'

interface ProductOptionSelectorProps {
  groups: ProductOptionGroup[]
  basePrice: number
  onChange: (selection: {
    selectedOptions: SelectedProductOption[]
    totalPrice: number
    selectedSummary: string
    selectedMap: Record<string, string>
  }) => void
}

function getInitialSelectedMap(groups: ProductOptionGroup[]) {
  return Object.fromEntries(
    groups
      .filter((group) => group.values.length === 1)
      .map((group) => [group.id, group.values[0].id])
  )
}

export function ProductOptionSelector({ groups, basePrice, onChange }: ProductOptionSelectorProps) {
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>(() => getInitialSelectedMap(groups))

  const selectedOptions = useMemo(() => {
    return groups.flatMap((group) => {
      const valueId = selectedMap[group.id]
      const value = group.values.find((candidate) => candidate.id === valueId && candidate.available !== false)
      if (!value) return []

      return [
        {
          groupId: group.id,
          groupName: group.name,
          type: group.type,
          valueId: value.id,
          valueLabel: value.label,
          priceModifier: value.priceModifier,
        },
      ]
    })
  }, [groups, selectedMap])

  useEffect(() => {
    onChange({
      selectedOptions,
      totalPrice: basePrice + getOptionsTotal(selectedOptions),
      selectedSummary: buildSelectedOptionsSummary(selectedOptions),
      selectedMap: getSelectedOptionsMap(selectedOptions),
    })
  }, [basePrice, onChange, selectedOptions])

  if (!groups.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold uppercase tracking-[0.18em] text-slate-500">Options</span>
        <span className="font-semibold text-slate-900">
          ${(basePrice + getOptionsTotal(selectedOptions)).toFixed(2)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-start gap-3">
        {groups.map((group) => (
          <div key={group.id} className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-800">{group.name}</p>
              {group.required ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  Required
                </span>
              ) : null}
            </div>

            {group.display === 'dropdown' ? (
              <select
                value={selectedMap[group.id] || ''}
                onChange={(event) =>
                  setSelectedMap((current) => ({ ...current, [group.id]: event.target.value }))
                }
                className="w-full min-w-[180px] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="">{group.required ? `Select ${group.name}` : `Optional ${group.name}`}</option>
                {group.values
                  .filter((value) => value.available !== false)
                  .map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.label}
                      {value.priceModifier > 0 ? ` (+$${value.priceModifier.toFixed(2)})` : ''}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {group.values.map((value) => {
                  const selected = selectedMap[group.id] === value.id

                  return (
                    <button
                      key={value.id}
                      type="button"
                      disabled={value.available === false}
                      onClick={() =>
                        setSelectedMap((current) => ({
                          ...current,
                          [group.id]: value.id,
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                      } ${value.available === false ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {group.display === 'swatches' && value.colorHex ? (
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: value.colorHex }}
                        />
                      ) : null}
                      <span>{value.label}</span>
                      {value.priceModifier > 0 ? <span>+${value.priceModifier.toFixed(2)}</span> : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
