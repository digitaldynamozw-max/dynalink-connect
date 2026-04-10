import { prisma } from '@/lib/prisma'
import { computeDrivingDistance } from '@/lib/google-maps'
import { getStoreAvailability } from '@/lib/store-hours'

interface DeliveryItemInput {
  productId: string
  quantity?: number
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function buildAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')
}

function getDeliveryRatePerKm() {
  const rawRate = process.env.DELIVERY_FEE_PER_KM?.trim() || '1.5'
  const rate = Number.parseFloat(rawRate)

  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('DELIVERY_FEE_PER_KM must be a non-negative number.')
  }

  return rate
}

function getMinimumDeliveryFee() {
  const rawFee = process.env.DELIVERY_MIN_FEE?.trim()

  if (!rawFee) {
    return 0
  }

  const fee = Number.parseFloat(rawFee)

  if (!Number.isFinite(fee) || fee < 0) {
    throw new Error('DELIVERY_MIN_FEE must be a non-negative number.')
  }

  return fee
}

export async function calculateDeliveryQuote(items: DeliveryItemInput[], customerAddress: string) {
  if (!items.length) {
    return {
      customerAddress,
      vendorFees: [],
      totalDeliveryFee: 0,
      itemsByVendor: {},
    }
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: items.map((item) => item.productId),
      },
    },
    select: {
      id: true,
      vendorId: true,
      vendor: {
        select: {
          vendorName: true,
          storeAddress: true,
          storeCity: true,
          storeState: true,
          storeZipCode: true,
          weeklyOpeningHours: true,
          temporarilyClosed: true,
        },
      },
    },
  })

  if (products.length !== items.length) {
    const foundIds = new Set(products.map((product) => product.id))
    const missingId = items.find((item) => !foundIds.has(item.productId))?.productId
    throw new Error(missingId ? `Product ${missingId} not found` : 'One or more products were not found.')
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const itemsByVendor = new Map<string, DeliveryItemInput[]>()
  const deliveryRatePerKm = getDeliveryRatePerKm()
  const minimumDeliveryFee = getMinimumDeliveryFee()

  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new Error(`Product ${item.productId} not found`)
    }

    const vendorId = product.vendorId || 'admin'
    if (!itemsByVendor.has(vendorId)) {
      itemsByVendor.set(vendorId, [])
    }
    itemsByVendor.get(vendorId)!.push(item)
  }

  const vendorFees = []
  let totalDeliveryFee = 0

  for (const [vendorId, vendorItems] of itemsByVendor) {
    const sampleProduct = productMap.get(vendorItems[0].productId)
    if (!sampleProduct) {
      throw new Error('Failed to resolve delivery vendor.')
    }

    const vendorName = sampleProduct.vendor?.vendorName || 'Admin Store'
    const originAddress =
      vendorId === 'admin'
        ? process.env.PLATFORM_STORE_ADDRESS?.trim()
        : buildAddress([
            sampleProduct.vendor?.storeAddress,
            sampleProduct.vendor?.storeCity,
            sampleProduct.vendor?.storeState,
            sampleProduct.vendor?.storeZipCode,
          ])

    if (!originAddress) {
      throw new Error(
        vendorId === 'admin'
          ? 'PLATFORM_STORE_ADDRESS must be set for admin-managed products.'
          : `Vendor "${vendorName}" is missing a store address.`
      )
    }

    const availability = getStoreAvailability(
      sampleProduct.vendor?.weeklyOpeningHours,
      sampleProduct.vendor?.temporarilyClosed
    )

    if (!availability.isOpenNow) {
      vendorFees.push({
        vendorId,
        vendorName,
        originAddress,
        distanceKm: null,
        durationMinutes: null,
        fee: 0,
        itemCount: vendorItems.length,
        available: false,
        availabilityMessage: availability.message,
        nextOpenLabel: availability.nextOpenLabel,
      })
      continue
    }

    const route = await computeDrivingDistance(originAddress, customerAddress)
    const fee = roundCurrency(Math.max(minimumDeliveryFee, route.distanceKm * deliveryRatePerKm))

    vendorFees.push({
      vendorId,
      vendorName,
      originAddress,
      distanceKm: roundCurrency(route.distanceKm),
      durationMinutes:
        route.durationSeconds === null ? null : roundCurrency(route.durationSeconds / 60),
      fee,
      itemCount: vendorItems.length,
      available: true,
      availabilityMessage: availability.message,
      nextOpenLabel: availability.nextOpenLabel,
    })

    totalDeliveryFee += fee
  }

  return {
    customerAddress,
    vendorFees,
    totalDeliveryFee: roundCurrency(totalDeliveryFee),
    itemsByVendor: Object.fromEntries(
      Array.from(itemsByVendor).map(([vendorId, vendorItems]) => [vendorId, vendorItems.length])
    ),
    ratePerKm: deliveryRatePerKm,
    hasUnavailableVendors: vendorFees.some((vendorFee) => vendorFee.available === false),
  }
}
