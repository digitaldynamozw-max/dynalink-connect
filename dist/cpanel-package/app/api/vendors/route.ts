import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const vendors = await prisma.user.findMany({
      where: {
        isVendor: true,
        vendorVerified: true,
        vendorName: {
          not: null,
          ...(search ? { contains: search } : {}),
        },
      },
      select: {
        id: true,
        vendorName: true,
        vendorDescription: true,
        vendorImage: true,
        storeBannerImage: true,
        vendorVerified: true,
        vendorPriority: true,
        vendorCategory: true,
        storeCity: true,
        storeState: true,
        vendorJoinedAt: true,
        products: {
          select: {
            id: true,
            stock: true,
            salesCount: true,
            averageRating: true,
            rating: true,
            reviewCount: true,
            category: true,
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: [{ vendorPriority: 'desc' }, { vendorJoinedAt: 'desc' }],
      take: 50,
    })

    const vendorsWithStats = vendors.map((vendor) => {
      const ratedProducts = vendor.products.filter(
        (product) =>
          (typeof product.averageRating === 'number' && product.averageRating > 0) ||
          (typeof product.rating === 'number' && product.rating > 0)
      )

      const totalReviews = vendor.products.reduce(
        (sum, product) => sum + (product.reviewCount || 0),
        0
      )

      return {
        ...vendor,
        totalProducts: vendor.products.filter((product) => product.stock > 0).length || vendor._count.products,
        totalSales: vendor.products.reduce((sum, product) => sum + (product.salesCount || 0), 0),
        rating:
          ratedProducts.length > 0
            ? ratedProducts.reduce(
                (sum, product) => sum + (product.averageRating || product.rating || 0),
                0
              ) / ratedProducts.length
            : 0,
        totalReviews,
        categories: [...new Set(vendor.products.map((product) => product.category).filter(Boolean))],
      }
    })

    return NextResponse.json(vendorsWithStats)
  } catch (error) {
    console.error('GET /api/vendors failed', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
