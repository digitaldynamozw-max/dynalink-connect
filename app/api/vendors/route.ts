import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const vendors = await prisma.user.findMany({
      where: {
        isVendor: true,
        vendorVerified: true,
        vendorName: search ? { contains: search } : undefined
      },
      select: {
        id: true,
        vendorName: true,
        vendorDescription: true,
        vendorImage: true,
        storeCity: true,
        storeState: true,
        vendorJoinedAt: true,
        products: { select: { id: true, salesCount: true } },
        _count: { select: { products: true } }
      },
      take: 20
    })

    // Calculate stats for each vendor
    const vendorsWithStats = vendors.map(vendor => ({
      ...vendor,
      totalProducts: vendor._count.products,
      totalSales: vendor.products.reduce((sum, p) => sum + (p.salesCount || 0), 0)
    }))

    return NextResponse.json(vendorsWithStats)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
