import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all vendors (users with isVendor = true)
    const vendors = await prisma.user.findMany({
      where: { isVendor: true },
      select: {
        id: true,
        email: true,
        vendorName: true,
        vendorDescription: true,
        storeAddress: true,
        storeCity: true,
        storeState: true,
        storeZipCode: true,
        vendorPhoneNumber: true,
        vendorVerified: true,
        vendorJoinedAt: true,
        _count: {
          select: { products: true, orders: true }
        }
      },
      orderBy: { vendorJoinedAt: 'desc' }
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { vendorId, verified, reason } = body

    if (!vendorId || verified === undefined) {
      return NextResponse.json({ error: 'Missing vendorId or verified status' }, { status: 400 })
    }

    // Check vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, email: true }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Update vendor verification status
    const updated = await prisma.user.update({
      where: { id: vendorId },
      data: { vendorVerified: verified },
      select: {
        id: true,
        vendorName: true,
        email: true,
        vendorVerified: true
      }
    })

    // TODO: Send email notification to vendor about approval/rejection

    return NextResponse.json({
      success: true,
      message: `Vendor ${verified ? 'approved' : 'rejected'}`,
      vendor: updated
    })
  } catch (error) {
    console.error('Error updating vendor verification:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}
