import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultWeeklyHours, serializeWeeklyHours } from '@/lib/store-hours'

type VendorSession = {
  user?: {
    id?: string
    role?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as VendorSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      vendorName,
      vendorDescription,
      vendorImage,
      storeBannerImage,
      vendorCategory,
      storeAddress,
      storeCity,
      storeState,
      storeZipCode,
      vendorPhoneNumber,
      latitude,
      longitude,
      weeklyOpeningHours,
      temporarilyClosed,
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
        vendorImage,
        storeBannerImage,
        vendorCategory,
        storeAddress,
        storeCity,
        storeState,
        storeZipCode,
        vendorPhoneNumber,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        vendorJoinedAt: new Date(),
        role: 'vendor',
        weeklyOpeningHours: weeklyOpeningHours || serializeWeeklyHours(getDefaultWeeklyHours()),
        temporarilyClosed: Boolean(temporarilyClosed),
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
    const session = (await auth()) as VendorSession | null
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
      const impersonationValid = session.user?.id === adminId || session.user?.role === 'admin'
      if (impersonationValid) {
        userId = impersonatedVendorId
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        products: true,
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
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch vendor info' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = (await auth()) as VendorSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      vendorName,
      vendorDescription,
      vendorImage,
      storeBannerImage,
      vendorCategory,
      storeAddress,
      storeCity,
      storeState,
      storeZipCode,
      vendorPhoneNumber,
      latitude,
      longitude,
      weeklyOpeningHours,
      temporarilyClosed,
    } = body

    const existingVendor = vendorName
      ? await prisma.user.findFirst({
          where: {
            vendorName,
            NOT: { id: session.user.id },
          },
          select: { id: true },
        })
      : null

    if (existingVendor) {
      return NextResponse.json(
        { error: 'Vendor name already taken' },
        { status: 400 }
      )
    }

    const updatedVendor = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        vendorName,
        vendorDescription,
        vendorImage:
          typeof vendorImage === 'string' ? vendorImage : undefined,
        storeBannerImage:
          typeof storeBannerImage === 'string' ? storeBannerImage : undefined,
        vendorCategory:
          typeof vendorCategory === 'string' ? vendorCategory : undefined,
        storeAddress,
        storeCity,
        storeState,
        storeZipCode,
        vendorPhoneNumber,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        weeklyOpeningHours:
          typeof weeklyOpeningHours === 'string' ? weeklyOpeningHours : undefined,
        temporarilyClosed:
          typeof temporarilyClosed === 'boolean' ? temporarilyClosed : undefined,
      },
    })

    return NextResponse.json(updatedVendor)
  } catch (error) {
    console.error('Vendor settings update failed:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor settings' },
      { status: 500 }
    )
  }
}
