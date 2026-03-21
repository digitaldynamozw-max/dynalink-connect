import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      vendorName,
      vendorDescription,
      storeAddress,
      storeCity,
      storeState,
      storeZipCode,
      vendorPhoneNumber,
      latitude,
      longitude
    } = body

    // Check if vendor name is already taken
    const existingVendor = await prisma.user.findUnique({
      where: { vendorName }
    }).catch(() => null)

    if (existingVendor) {
      return NextResponse.json(
        { error: 'Vendor name already taken' },
        { status: 400 }
      )
    }

    // Update user to become vendor
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isVendor: true,
        vendorName,
        vendorDescription,
        storeAddress,
        storeCity,
        storeState,
        storeZipCode,
        vendorPhoneNumber,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        vendorJoinedAt: new Date(),
        role: 'vendor'
      },
      include: {
        products: { select: { id: true, name: true } },
        _count: { select: { products: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Vendor registration failed:', error)
    return NextResponse.json(
      { error: 'Failed to register as vendor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin is impersonating a vendor
    const impersonatedVendorId = request.cookies.get('impersonatedVendorId')?.value
    const adminId = request.cookies.get('adminImpersonationId')?.value
    
    let userId = session.user.id
    
    // If admin is impersonating, use the impersonated vendor's ID
    if (impersonatedVendorId && adminId) {
      // Verify this is a valid impersonation session
      const impersonationValid = (session.user as any).id === adminId || (session.user as any).role === 'admin'
      if (impersonationValid) {
        userId = impersonatedVendorId
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        products: true,
        deliveryZones: true,
        payouts: true
      }
    })

    if (!user?.isVendor) {
      return NextResponse.json(
        { error: 'User is not a vendor' },
        { status: 403 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch vendor info' },
      { status: 500 }
    )
  }
}
