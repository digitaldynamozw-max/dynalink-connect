type VendorLocationInput = {
  storeCity?: string | null
  storeState?: string | null
  vendorCategory?: string | null
}

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s,]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function getVendorAddressMatchScore(address: string, vendor: VendorLocationInput) {
  const normalizedAddress = normalizeValue(address)
  const city = normalizeValue(vendor.storeCity || '')
  const state = normalizeValue(vendor.storeState || '')

  if (!normalizedAddress) return 0

  let score = 0

  if (city && normalizedAddress.includes(city)) {
    score += 7
  }

  if (state && normalizedAddress.includes(state)) {
    score += 4
  }

  if (city && state && normalizedAddress.includes(`${city} ${state}`)) {
    score += 3
  }

  return score
}

export function getVendorDistanceLabel(address: string, vendor: VendorLocationInput) {
  const score = getVendorAddressMatchScore(address, vendor)

  if (score >= 10) return 'Closest match'
  if (score >= 7) return 'Near your address'
  if (score >= 4) return 'Available in your area'
  return 'Worth exploring'
}
