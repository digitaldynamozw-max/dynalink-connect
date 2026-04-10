export type ProductOptionValue = {
  id: string
  label: string
  priceModifier: number
  colorHex?: string
  available?: boolean
}

export type ProductOptionGroup = {
  id: string
  name: string
  type: string
  required: boolean
  display: 'buttons' | 'swatches' | 'dropdown'
  values: ProductOptionValue[]
}

export type ProductSpecification = {
  id: string
  label: string
  value: string
}

export type SelectedProductOption = {
  groupId: string
  groupName: string
  type: string
  valueId: string
  valueLabel: string
  priceModifier: number
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeOptionValue(groupId: string, value: Partial<ProductOptionValue>, index: number): ProductOptionValue {
  return {
    id: value.id || `${groupId}-value-${index + 1}`,
    label: value.label || `Option ${index + 1}`,
    priceModifier: Number(value.priceModifier || 0),
    colorHex: value.colorHex || undefined,
    available: value.available !== false,
  }
}

type ProductOptionGroupInput = Partial<Omit<ProductOptionGroup, 'values'>> & {
  values?: Partial<ProductOptionValue>[]
}

export function normalizeOptionGroup(group: ProductOptionGroupInput, index: number): ProductOptionGroup {
  const name = group.name || `Option Group ${index + 1}`
  const groupId = group.id || slugify(name) || `group-${index + 1}`

  return {
    id: groupId,
    name,
    type: group.type || 'option',
    required: group.required !== false,
    display:
      group.display === 'swatches' || group.display === 'dropdown' || group.display === 'buttons'
        ? group.display
        : 'buttons',
    values: Array.isArray(group.values)
      ? group.values.map((value, valueIndex) => normalizeOptionValue(groupId, value, valueIndex))
      : [],
  }
}

export function parseProductOptionGroups(value: string | null | undefined) {
  const parsed = safeJsonParse<Partial<ProductOptionGroup>[]>(value, [])
  return parsed.map((group, index) => normalizeOptionGroup(group, index)).filter((group) => group.values.length > 0)
}

export function stringifyProductOptionGroups(groups: ProductOptionGroup[]) {
  return JSON.stringify(groups)
}

export function parseProductSpecifications(value: string | null | undefined) {
  const parsed = safeJsonParse<Partial<ProductSpecification>[]>(value, [])
  return parsed
    .map((spec, index) => ({
      id: spec.id || `spec-${index + 1}`,
      label: spec.label || '',
      value: spec.value || '',
    }))
    .filter((spec) => spec.label && spec.value)
}

export function stringifyProductSpecifications(specs: ProductSpecification[]) {
  return JSON.stringify(specs)
}

export function getOptionsTotal(selectedOptions: SelectedProductOption[]) {
  return selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0)
}

export function buildSelectedOptionsSummary(selectedOptions: SelectedProductOption[]) {
  return selectedOptions.map((option) => `${option.groupName}: ${option.valueLabel}`).join(', ')
}

export function getSelectedOptionsMap(selectedOptions: SelectedProductOption[]) {
  return Object.fromEntries(selectedOptions.map((option) => [option.groupId, option.valueId]))
}

type ProductContext = {
  category?: string | null
  vendorCategory?: string | null
  vendorName?: string | null
}

type ProductOptionResolutionInput = ProductContext & {
  optionGroupsJson?: string | null
  specificationsJson?: string | null
}

function isFoodContext(context: ProductContext) {
  const combined = `${context.category || ''} ${context.vendorCategory || ''} ${context.vendorName || ''}`.toLowerCase()
  return ['food', 'beverage', 'pizza', 'burger', 'sushi', 'coffee', 'restaurant', 'kitchen'].some((token) =>
    combined.includes(token)
  )
}

function isPizzaContext(context: ProductContext) {
  const combined = `${context.category || ''} ${context.vendorCategory || ''} ${context.vendorName || ''}`.toLowerCase()
  return combined.includes('pizza')
}

function isElectronicsContext(context: ProductContext) {
  const combined = `${context.category || ''} ${context.vendorCategory || ''}`.toLowerCase()
  return combined.includes('electronics')
}

function isFashionContext(context: ProductContext) {
  const combined = `${context.category || ''} ${context.vendorCategory || ''}`.toLowerCase()
  return combined.includes('fashion') || combined.includes('clothing')
}

function isShoeContext(context: ProductContext) {
  const combined = `${context.category || ''} ${context.vendorCategory || ''} ${context.vendorName || ''}`.toLowerCase()
  return ['shoe', 'sneaker', 'footwear', 'kick'].some((token) => combined.includes(token))
}

export function getSuggestedProductOptions(context: ProductContext): ProductOptionGroup[] {
  if (isPizzaContext(context)) {
    return [
      normalizeOptionGroup(
        {
          name: 'Pizza Size',
          type: 'size',
          required: true,
          display: 'buttons',
          values: [
            { label: 'Small', priceModifier: 0 },
            { label: 'Medium', priceModifier: 2 },
            { label: 'Large', priceModifier: 5 },
          ],
        },
        0
      ),
      normalizeOptionGroup(
        {
          name: 'Flavor',
          type: 'flavor',
          required: true,
          display: 'dropdown',
          values: [
            { label: 'Pepperoni', priceModifier: 0 },
            { label: 'BBQ Chicken', priceModifier: 1.5 },
            { label: 'Veggie Supreme', priceModifier: 1 },
          ],
        },
        1
      ),
    ]
  }

  if (isFoodContext(context)) {
    return [
      normalizeOptionGroup(
        {
          name: 'Portion Size',
          type: 'size',
          required: true,
          display: 'buttons',
          values: [
            { label: 'Regular', priceModifier: 0 },
            { label: 'Large', priceModifier: 2.5 },
          ],
        },
        0
      ),
      normalizeOptionGroup(
        {
          name: 'Add-ons',
          type: 'extras',
          required: false,
          display: 'dropdown',
          values: [
            { label: 'Extra Cheese', priceModifier: 1.5 },
            { label: 'Extra Sauce', priceModifier: 0.75 },
            { label: 'No Add-on', priceModifier: 0 },
          ],
        },
        1
      ),
    ]
  }

  if (isShoeContext(context)) {
    return [
      normalizeOptionGroup(
        {
          name: 'Available Sizes',
          type: 'size',
          required: true,
          display: 'buttons',
          values: [
            { label: '38', priceModifier: 0 },
            { label: '40', priceModifier: 0 },
            { label: '42', priceModifier: 0 },
            { label: '44', priceModifier: 0 },
          ],
        },
        0
      ),
    ]
  }

  if (isFashionContext(context)) {
    return [
      normalizeOptionGroup(
        {
          name: 'Size',
          type: 'size',
          required: true,
          display: 'buttons',
          values: [
            { label: 'S', priceModifier: 0 },
            { label: 'M', priceModifier: 0 },
            { label: 'L', priceModifier: 0 },
            { label: 'XL', priceModifier: 1 },
          ],
        },
        0
      ),
      normalizeOptionGroup(
        {
          name: 'Color',
          type: 'color',
          required: true,
          display: 'swatches',
          values: [
            { label: 'Black', priceModifier: 0, colorHex: '#111827' },
            { label: 'White', priceModifier: 0, colorHex: '#f8fafc' },
            { label: 'Red', priceModifier: 0.5, colorHex: '#dc2626' },
          ],
        },
        1
      ),
    ]
  }

  if (isElectronicsContext(context)) {
    return [
      normalizeOptionGroup(
        {
          name: 'RAM',
          type: 'memory',
          required: true,
          display: 'buttons',
          values: [
            { label: '8GB', priceModifier: 0 },
            { label: '16GB', priceModifier: 80 },
            { label: '32GB', priceModifier: 180 },
          ],
        },
        0
      ),
      normalizeOptionGroup(
        {
          name: 'Storage',
          type: 'storage',
          required: true,
          display: 'buttons',
          values: [
            { label: '256GB SSD', priceModifier: 0 },
            { label: '512GB SSD', priceModifier: 120 },
            { label: '1TB SSD', priceModifier: 240 },
          ],
        },
        1
      ),
    ]
  }

  return []
}

export function getSuggestedProductSpecifications(context: ProductContext): ProductSpecification[] {
  if (isElectronicsContext(context)) {
    return [
      { id: 'spec-cpu', label: 'Processor', value: 'Intel Core i7' },
      { id: 'spec-display', label: 'Display', value: '15.6-inch FHD' },
      { id: 'spec-battery', label: 'Battery', value: 'Up to 10 hours' },
      { id: 'spec-os', label: 'Operating System', value: 'Windows 11' },
    ]
  }

  if (isFashionContext(context) || isShoeContext(context)) {
    return [
      { id: 'spec-material', label: 'Material', value: 'Premium cotton blend' },
      { id: 'spec-fit', label: 'Fit', value: 'Regular fit' },
    ]
  }

  return []
}

export function getResolvedProductOptionGroups(input: ProductOptionResolutionInput) {
  const configuredGroups = parseProductOptionGroups(input.optionGroupsJson)
  if (configuredGroups.length > 0) {
    return configuredGroups
  }

  return getSuggestedProductOptions({
    category: input.category,
    vendorCategory: input.vendorCategory,
    vendorName: input.vendorName,
  })
}

export function getResolvedProductSpecifications(input: ProductOptionResolutionInput) {
  const configuredSpecifications = parseProductSpecifications(input.specificationsJson)
  if (configuredSpecifications.length > 0) {
    return configuredSpecifications
  }

  return getSuggestedProductSpecifications({
    category: input.category,
    vendorCategory: input.vendorCategory,
    vendorName: input.vendorName,
  })
}

export function validateAndResolveSelectedOptions(
  groups: ProductOptionGroup[],
  selectedMap: Record<string, string>
) {
  const resolved: SelectedProductOption[] = []

  for (const group of groups) {
    const selectedValueId = selectedMap[group.id]

    if (!selectedValueId) {
      if (group.required) {
        return {
          ok: false as const,
          error: `Please select ${group.name.toLowerCase()}.`,
        }
      }
      continue
    }

    const value = group.values.find((groupValue) => groupValue.id === selectedValueId)
    if (!value || value.available === false) {
      return {
        ok: false as const,
        error: `${group.name} selection is unavailable.`,
      }
    }

    resolved.push({
      groupId: group.id,
      groupName: group.name,
      type: group.type,
      valueId: value.id,
      valueLabel: value.label,
      priceModifier: value.priceModifier,
    })
  }

  return {
    ok: true as const,
    selectedOptions: resolved,
    selectedSummary: buildSelectedOptionsSummary(resolved),
    optionsTotal: getOptionsTotal(resolved),
  }
}

export function buildCartItemId(productId: string, selectedOptions: SelectedProductOption[]) {
  if (!selectedOptions.length) return productId

  const serialized = selectedOptions
    .map((option) => `${option.groupId}:${option.valueId}`)
    .sort()
    .join('|')

  return `${productId}::${serialized}`
}
