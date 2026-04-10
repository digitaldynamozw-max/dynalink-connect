type ProductAttributeInput = {
  name: string
  category?: string | null
  vendorCategory?: string | null
  vendorName?: string | null
  stock: number
}

export type ProductAttributeSummary = {
  badges: string[]
  availabilityLabel: string
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isFoodStore(input: ProductAttributeInput) {
  const category = `${input.category || ''} ${input.vendorCategory || ''}`.toLowerCase()
  const vendorName = (input.vendorName || '').toLowerCase()

  return (
    category.includes('food') ||
    category.includes('beverage') ||
    vendorName.includes('pizza') ||
    vendorName.includes('grill') ||
    vendorName.includes('coffee') ||
    vendorName.includes('sushi') ||
    vendorName.includes('bites') ||
    vendorName.includes('kitchen') ||
    vendorName.includes('burger') ||
    vendorName.includes('restaurant')
  )
}

function getPizzaFlavor(name: string) {
  const cleaned = name
    .replace(/pizza/gi, '')
    .replace(/feast/gi, '')
    .trim()

  return cleaned ? titleCase(cleaned) : 'House Special'
}

export function getProductAttributeSummary(input: ProductAttributeInput): ProductAttributeSummary {
  const name = input.name.toLowerCase()
  const category = (input.category || input.vendorCategory || '').toLowerCase()
  const vendorName = (input.vendorName || '').toLowerCase()
  const foodStore = isFoodStore(input)
  const shoeStore =
    vendorName.includes('shoe') ||
    vendorName.includes('kick') ||
    vendorName.includes('sneaker') ||
    vendorName.includes('footwear')

  let badges: string[] = []

  if (foodStore && (vendorName.includes('pizza') || name.includes('pizza'))) {
    badges = [`Flavor: ${getPizzaFlavor(input.name)}`, 'Sizes: S, M, L']
  } else if (
    name.includes('sneaker') ||
    name.includes('runner') ||
    name.includes('trainer') ||
    name.includes('slide') ||
    name.includes('pump') ||
    name.includes('heel') ||
    name.includes('shoe')
  ) {
    badges = ['Sizes: 38-44', 'Fit: Regular']
  } else if (shoeStore) {
    badges = ['Sizes: 38-44', 'Style: Everyday']
  } else if (category.includes('clothing') || category.includes('fashion')) {
    badges = ['Sizes: S-XL', 'Fit: Standard']
  } else if (foodStore) {
    badges = ['Options: Regular, Large', 'Prep: 15-25 min']
  } else if (category.includes('beauty')) {
    badges = ['Volume: 100ml', 'Skin: All Types']
  } else if (category.includes('books')) {
    badges = ['Format: Paperback', 'Language: English']
  } else if (category.includes('electronics')) {
    badges = ['Condition: New', 'Warranty: 12 Months']
  } else if (category.includes('home')) {
    badges = ['Style: Modern', 'Finish: Premium']
  } else if (category.includes('sports')) {
    badges = ['Use: Training', 'Fit: Everyday']
  } else {
    badges = ['Curated Item', 'Store Favorite']
  }

  return {
    badges,
    availabilityLabel: foodStore
      ? input.stock > 0
        ? 'Available'
        : 'Unavailable'
      : input.stock > 0
        ? `${input.stock} in stock`
        : 'Out of stock',
  }
}

export function isFoodProduct(input: Omit<ProductAttributeInput, 'stock'>) {
  return isFoodStore({ ...input, stock: 0 })
}
