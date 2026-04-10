import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Clock3, MapPin, ShoppingBag } from 'lucide-react'
import { VendorSelectedProductPanel } from '@/components/vendor-selected-product-panel'
import { VendorStoreProductsGrid } from '@/components/vendor-store-products-grid'
import { serializeProductPayload } from '@/lib/product-payload'
import { prisma } from '@/lib/prisma'
import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { DAY_KEYS, formatHoursLabel, getStoreAvailability, parseWeeklyHours } from '@/lib/store-hours'
import { matchesVendorSlug } from '@/lib/vendor-slug'

export const dynamic = 'force-dynamic'

export default async function VendorStorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ product?: string }>
}) {
  const { slug } = await params
  const { product: selectedProductId } = (await searchParams) ?? {}

  const vendorCandidates = await prisma.user.findMany({
    where: {
      isVendor: true,
      vendorVerified: true,
      vendorName: { not: null },
    },
    select: {
      id: true,
      vendorName: true,
    },
  })

  const matchedVendor = vendorCandidates.find(
    (candidate) => candidate.vendorName && matchesVendorSlug(candidate.vendorName, slug)
  )

  if (!matchedVendor?.id) {
    notFound()
  }

  const [vendor, siteSettings] = await Promise.all([
    prisma.user.findUnique({
    where: { id: matchedVendor.id },
    include: {
      products: {
        where: { stock: { gt: 0 } },
        include: {
          ratings: true,
          orderItems: true,
        },
      },
    },
    }),
    ensureSiteSettings(),
  ])

  if (!vendor || !vendor.vendorName || !vendor.vendorVerified || !vendor.isVendor) {
    notFound()
  }

  const allRatings = vendor.products.flatMap((product) => product.ratings)
  const avgRating =
    allRatings.length > 0
      ? (allRatings.reduce((sum, rating) => sum + rating.rating, 0) / allRatings.length).toFixed(2)
      : '0.00'

  const totalSold = vendor.products.reduce((sum, product) => sum + (product.salesCount || 0), 0)
  const availability = getStoreAvailability(vendor.weeklyOpeningHours, vendor.temporarilyClosed)
  const weeklyHours = parseWeeklyHours(vendor.weeklyOpeningHours)
  const currentDayKey = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const todayHours = weeklyHours[currentDayKey]
  const serializedProducts = vendor.products.map((product) =>
    serializeProductPayload({
      ...product,
      vendor: {
        vendorName: vendor.vendorName,
        vendorCategory: vendor.vendorCategory,
        name: vendor.name,
      },
    })
  )
  const selectedProduct =
    serializedProducts.find((product) => product.id === selectedProductId) ?? serializedProducts[0] ?? null
  const relatedProducts = selectedProduct
    ? serializedProducts.filter((product) => product.id !== selectedProduct.id)
    : serializedProducts
  const productGrid = selectedProduct ? [selectedProduct, ...relatedProducts] : serializedProducts
  const storefrontClosed = siteSettings.allStoresTemporarilyClosed || vendor.temporarilyClosed
  const storeAddress = [vendor.storeAddress, vendor.storeCity, vendor.storeState]
    .filter(Boolean)
    .join(', ')
  const pickupAddress = storeAddress || siteSettings.platformStoreAddress || 'Vendor shop address will be shared after confirmation.'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative py-12 text-white">
        {vendor.storeBannerImage ? (
          <>
            <Image
              src={vendor.storeBannerImage}
              alt={`${vendor.vendorName} banner`}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
        )}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col items-start space-y-6 md:flex-row md:items-center md:space-x-8 md:space-y-0">
            {vendor.vendorImage && (
              <Image
                src={vendor.vendorImage}
                alt={vendor.vendorName}
                width={96}
                height={96}
                className="h-24 w-24 rounded-lg border-4 border-white object-cover"
              />
            )}

            <div className="flex-1">
              <h1 className="mb-2 text-4xl font-bold">{vendor.vendorName}</h1>
              <p className="mb-4 text-blue-100">{vendor.vendorDescription || 'Welcome to our store'}</p>

              <div className="flex flex-wrap items-center gap-6">
                <div
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    availability.isOpenNow && !storefrontClosed
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {availability.isOpenNow && !storefrontClosed ? 'Open now' : 'Currently closed'}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex text-yellow-300">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <span className="font-semibold">{avgRating}</span>
                </div>

                <p className="text-sm text-blue-100">
                  Products: <span className="font-semibold">{vendor.products.length}</span>
                </p>

                <p className="text-sm text-blue-100">
                  Sold: <span className="font-semibold">{totalSold}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Store Address</p>
                <p className="truncate text-lg font-bold text-slate-900">{storeAddress || pickupAddress}</p>
                <p className="text-sm text-slate-500">
                  Vendor phone and email stay private. Orders are coordinated through the marketplace.
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                  availability.isOpenNow
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <Clock3 className="h-4 w-4" />
                {availability.isOpenNow ? 'Open Now' : 'Closed Now'}
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {storefrontClosed ? 'Orders are temporarily paused for this store.' : availability.message}
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                Today:{' '}
                <span className="font-semibold text-slate-900">
                  {todayHours.isOpen
                    ? `${formatHoursLabel(todayHours.open)} - ${formatHoursLabel(todayHours.close)}`
                    : 'Closed'}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                <ShoppingBag className="h-4 w-4" />
                {siteSettings.pickupEnabled ? `Customer collection happens at ${pickupAddress}` : 'Delivery only right now'}
              </div>
            </div>
          </div>
        </div>

        <div>
          {selectedProduct ? (
            <VendorSelectedProductPanel
              key={selectedProduct.id}
              product={{
                id: selectedProduct.id,
                name: selectedProduct.name,
                description: selectedProduct.description,
                image: selectedProduct.image,
                category: selectedProduct.category,
                stock: selectedProduct.stock,
                salesCount: selectedProduct.salesCount,
                price: selectedProduct.price,
                salePrice: selectedProduct.salePrice,
                onSale: selectedProduct.onSale,
                optionGroupsJson: selectedProduct.optionGroupsJson,
                specificationsJson: selectedProduct.specificationsJson,
                resolvedOptionGroups: selectedProduct.resolvedOptionGroups,
                resolvedSpecifications: selectedProduct.resolvedSpecifications,
              }}
              vendor={{
                id: vendor.id,
                vendorName: vendor.vendorName,
                vendorCategory: vendor.vendorCategory,
                vendorAddress: storeAddress || null,
              }}
            />
          ) : null}

          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            {selectedProduct
              ? `More From ${vendor.vendorName} (${vendor.products.length})`
              : `Featured Products (${vendor.products.length})`}
          </h2>

          {vendor.products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg text-gray-600">No products available at the moment</p>
            </div>
          ) : (
            <VendorStoreProductsGrid
              vendor={{
                id: vendor.id,
                vendorName: vendor.vendorName,
                vendorCategory: vendor.vendorCategory,
                vendorAddress: storeAddress || null,
              }}
              products={productGrid.map((product) => ({
                id: product.id,
                name: product.name,
                description: product.description,
                image: product.image,
                category: product.category,
                stock: product.stock,
                salesCount: product.salesCount,
                price: product.price,
                salePrice: product.salePrice,
                onSale: product.onSale,
                optionGroupsJson: product.optionGroupsJson,
                resolvedOptionGroups: product.resolvedOptionGroups,
                hasConfigurableOptions: product.hasConfigurableOptions,
                ratings: product.ratings.map((rating) => ({ rating: rating.rating })),
              }))}
              selectedProductId={selectedProduct?.id || null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
