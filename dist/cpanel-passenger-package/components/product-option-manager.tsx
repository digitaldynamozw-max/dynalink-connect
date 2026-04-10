'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ProductOptionGroup, ProductOptionValue } from '@/lib/product-options'

interface ProductOptionManagerProps {
  groups: ProductOptionGroup[]
  onChange: (groups: ProductOptionGroup[]) => void
}

type GroupDraft = {
  name: string
  type: string
  required: boolean
  display: 'buttons' | 'swatches' | 'dropdown'
}

type ValueDraft = {
  label: string
  priceModifier: string
  colorHex: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ProductOptionManager({ groups, onChange }: ProductOptionManagerProps) {
  const [groupDraft, setGroupDraft] = useState<GroupDraft>({
    name: '',
    type: 'size',
    required: true,
    display: 'buttons',
  })
  const [valueDrafts, setValueDrafts] = useState<Record<string, ValueDraft>>({})

  function addGroup() {
    if (!groupDraft.name.trim()) {
      alert('Enter an option group name first.')
      return
    }

    const groupId = slugify(groupDraft.name) || `group-${Date.now()}`
    const nextGroup: ProductOptionGroup = {
      id: groupId,
      name: groupDraft.name.trim(),
      type: groupDraft.type.trim() || 'option',
      required: groupDraft.required,
      display: groupDraft.display,
      values: [],
    }

    onChange([...groups, nextGroup])
    setGroupDraft({
      name: '',
      type: 'size',
      required: true,
      display: 'buttons',
    })
  }

  function removeGroup(groupId: string) {
    onChange(groups.filter((group) => group.id !== groupId))
  }

  function addValue(groupId: string) {
    const draft = valueDrafts[groupId]
    if (!draft?.label.trim()) {
      alert('Enter a value label before adding it.')
      return
    }

    const nextValue: ProductOptionValue = {
      id: `${groupId}-${slugify(draft.label) || Date.now().toString()}`,
      label: draft.label.trim(),
      priceModifier: Number.parseFloat(draft.priceModifier || '0') || 0,
      colorHex: draft.colorHex || undefined,
      available: true,
    }

    onChange(
      groups.map((group) =>
        group.id === groupId ? { ...group, values: [...group.values, nextValue] } : group
      )
    )

    setValueDrafts((current) => ({
      ...current,
      [groupId]: { label: '', priceModifier: '', colorHex: '' },
    }))
  }

  function removeValue(groupId: string, valueId: string) {
    onChange(
      groups.map((group) =>
        group.id === groupId
          ? { ...group, values: group.values.filter((value) => value.id !== valueId) }
          : group
      )
    )
  }

  function updateGroup(groupId: string, updates: Partial<ProductOptionGroup>) {
    onChange(groups.map((group) => (group.id === groupId ? { ...group, ...updates } : group)))
  }

  return (
    <div className="space-y-6 border-t border-gray-200 pt-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Options And Extras</h3>
        <p className="mt-1 text-sm text-gray-600">
          Set required choices like pizza size, t-shirt color, shoe size, or laptop RAM. Price add-ons apply within the same product.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Group Name</label>
            <input
              type="text"
              value={groupDraft.name}
              onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="e.g. Pizza Size"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <input
              type="text"
              value={groupDraft.type}
              onChange={(event) => setGroupDraft((current) => ({ ...current, type: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="size, color, storage"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Display</label>
            <select
              value={groupDraft.display}
              onChange={(event) =>
                setGroupDraft((current) => ({
                  ...current,
                  display: event.target.value as GroupDraft['display'],
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="buttons">Buttons</option>
              <option value="dropdown">Dropdown</option>
              <option value="swatches">Swatches</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={groupDraft.required}
                onChange={(event) =>
                  setGroupDraft((current) => ({ ...current, required: event.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              Required
            </label>
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Group
            </button>
          </div>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => {
            const draft = valueDrafts[group.id] || { label: '', priceModifier: '', colorHex: '' }

            return (
              <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900">{group.name}</h4>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {group.type}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {group.display}
                      </span>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(event) => updateGroup(group.id, { required: event.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Required for checkout
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Group
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(event) =>
                      setValueDrafts((current) => ({
                        ...current,
                        [group.id]: { ...draft, label: event.target.value },
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Value label, e.g. Large"
                  />
                  <input
                    type="number"
                    value={draft.priceModifier}
                    onChange={(event) =>
                      setValueDrafts((current) => ({
                        ...current,
                        [group.id]: { ...draft, priceModifier: event.target.value },
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Extra price"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={draft.colorHex}
                    onChange={(event) =>
                      setValueDrafts((current) => ({
                        ...current,
                        [group.id]: { ...draft, colorHex: event.target.value },
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    placeholder={group.display === 'swatches' ? '#111827' : 'Optional color hex'}
                  />
                  <button
                    type="button"
                    onClick={() => addValue(group.id)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Add Value
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <div
                      key={value.id}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    >
                      {group.display === 'swatches' && value.colorHex ? (
                        <span
                          className="h-4 w-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: value.colorHex }}
                        />
                      ) : null}
                      <span>{value.label}</span>
                      {value.priceModifier > 0 ? (
                        <span className="font-semibold text-blue-700">+${value.priceModifier.toFixed(2)}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeValue(group.id, value.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove value"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
