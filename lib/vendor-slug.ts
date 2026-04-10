export function toVendorSlug(vendorName: string) {
  return vendorName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '-')
}

export function matchesVendorSlug(vendorName: string, slug: string) {
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase()
  return (
    vendorName.trim().toLowerCase() === normalizedSlug ||
    toVendorSlug(vendorName) === normalizedSlug
  )
}
