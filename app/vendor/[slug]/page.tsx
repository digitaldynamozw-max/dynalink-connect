import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Star, MapPin, Phone } from 'lucide-react'

export default async function VendorStorefrontPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Fetch vendor by vendorName (the slug)
  const vendor = await prisma.user.findFirst({
    where: {
      vendorName: slug,
      isVendor: true,
      vendorVerified: true
    },
    include: {
      products: {
        where: { stock: { gt: 0 } },
        include: {
          ratings: true,
          orderItems: true
        }
      }
    }
  })

  if (!vendor) {
    notFound()
  }

  if (!vendor.vendorName) {
    notFound()
  }

  // Calculate average rating for vendor
  const allRatings = vendor.products.flatMap(p => p.ratings)
  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
    : 0

  const totalSold = vendor.products.reduce((sum, p) => sum + (p.salesCount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Vendor Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {vendor.vendorImage && (
              <img
                src={vendor.vendorImage}
                alt={vendor.vendorName || 'Vendor'}
                className="h-24 w-24 rounded-lg object-cover border-4 border-white"
              />
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{vendor.vendorName}</h1>
              <p className="text-blue-100 mb-4">{vendor.vendorDescription || 'Welcome to our store'}</p>
              
              <div className="flex flex-wrap gap-6 items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="flex text-yellow-300">
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    <span className="font-semibold">{avgRating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-blue-100">Products: <span className="font-semibold">{vendor.products.length}</span></p>
                </div>
                <div>
                  <p className="text-sm text-blue-100">Sold: <span className="font-semibold">{totalSold}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Store Location</p>
                <p className="font-semibold text-gray-900">
                  {vendor.storeCity ? `${vendor.storeCity}, ${vendor.storeState}` : 'Location not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold text-gray-900">{vendor.vendorPhoneNumber || 'Not listed'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-semibold text-gray-900">
                {vendor.vendorJoinedAt ? new Date(vendor.vendorJoinedAt).toLocaleDateString() : 'Recently joined'}
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Featured Products ({vendor.products.length})
          </h2>
          
          {vendor.products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {vendor.products.map((product) => {
                const productRatings = product.ratings
                const avgProductRating = productRatings.length > 0
                  ? (productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length).toFixed(1)
                  : 0

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="h-40 w-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {product.ratings.length > 0 && (
                        <div className="flex items-center space-x-1 mb-2">
                          <div className="flex text-yellow-400 text-xs">
                            {[...Array(5)].map((_, i) => (
                              <span key={i}>
                                {i < Math.round(parseFloat(avgProductRating as string)) ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">({product.ratings.length})</span>
                        </div>
                      )}

                      <p className="text-sm text-gray-600 mb-3">
                        {product.description ? product.description.slice(0, 60) + '...' : 'No description'}
                      </p>

                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Stock: {product.stock}
                        </span>
                      </div>

                      <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Generate static paths for popular vendors
export async function generateStaticParams() {
  const vendors = await prisma.user.findMany({
    where: { isVendor: true, vendorVerified: true },
    select: { vendorName: true },
    take: 100
  })

  return vendors.map(vendor => ({
    slug: vendor.vendorName
  }))
}
