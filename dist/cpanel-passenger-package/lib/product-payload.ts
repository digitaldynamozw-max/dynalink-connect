import {
  getResolvedProductOptionGroups,
  getResolvedProductSpecifications,
} from '@/lib/product-options'

type SerializableProduct = {
  id: string
  name: string
  description?: string | null
  price: number
  salePrice?: number | null
  onSale: boolean
  image?: string | null
  category?: string | null
  stock: number
  salesCount?: number
  rating?: number
  averageRating?: number
  reviewCount?: number
  optionGroupsJson?: string | null
  specificationsJson?: string | null
  vendorId?: string | null
  vendor?: {
    vendorName?: string | null
    vendorCategory?: string | null
    name?: string | null
  } | null
}

export function serializeProductPayload<T extends SerializableProduct>(product: T) {
  const vendorName = product.vendor?.vendorName || product.vendor?.name || null
  const vendorCategory = product.vendor?.vendorCategory || null
  const resolvedOptionGroups = getResolvedProductOptionGroups({
    optionGroupsJson: product.optionGroupsJson,
    category: product.category,
    vendorCategory,
    vendorName,
  })
  const resolvedSpecifications = getResolvedProductSpecifications({
    specificationsJson: product.specificationsJson,
    category: product.category,
    vendorCategory,
    vendorName,
  })

  return {
    ...product,
    vendorName,
    vendorCategory,
    resolvedOptionGroups,
    resolvedSpecifications,
    hasConfigurableOptions: resolvedOptionGroups.length > 0,
    hasSpecifications: resolvedSpecifications.length > 0,
  }
}
