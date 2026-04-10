import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizePriority(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user && (session.user as { role?: string }).role === 'admin'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const vendor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        vendorName: true,
        vendorDescription: true,
        vendorImage: true,
        storeBannerImage: true,
        vendorCategory: true,
        vendorPriority: true,
        vendorPhoneNumber: true,
        storeAddress: true,
        storeCity: true,
        storeState: true,
        storeZipCode: true,
        vendorVerified: true,
        vendorJoinedAt: true,
        commissionRate: true,
        isVendor: true,
      },
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const email = normalizeOptionalString(body.email)
    const vendorName = normalizeOptionalString(body.vendorName)
    const vendorPriority = normalizePriority(body.vendorPriority)

    if (!email || !vendorName) {
      return NextResponse.json({ error: 'Email and vendor name are required' }, { status: 400 })
    }

    if (vendorPriority === null) {
      return NextResponse.json({ error: 'Vendor priority must be 0 or higher' }, { status: 400 })
    }

    const [existingVendor, existingEmail, existingVendorName] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true, isVendor: true } }),
      prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: {
          vendorName,
          NOT: { id },
        },
        select: { id: true },
      }),
    ])

    if (!existingVendor?.isVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (existingEmail) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
    }

    if (existingVendorName) {
      return NextResponse.json({ error: 'Vendor name is already in use' }, { status: 400 })
    }

    const updatedVendor = await prisma.user.update({
      where: { id },
      data: {
        email,
        vendorName,
        vendorDescription: normalizeOptionalString(body.vendorDescription) ?? null,
        vendorImage: normalizeOptionalString(body.vendorImage) ?? null,
        storeBannerImage: normalizeOptionalString(body.storeBannerImage) ?? null,
        vendorCategory: normalizeOptionalString(body.vendorCategory) ?? null,
        vendorPhoneNumber: normalizeOptionalString(body.vendorPhoneNumber) ?? null,
        storeAddress: normalizeOptionalString(body.storeAddress) ?? null,
        storeCity: normalizeOptionalString(body.storeCity) ?? null,
        storeState: normalizeOptionalString(body.storeState) ?? null,
        storeZipCode: normalizeOptionalString(body.storeZipCode) ?? null,
        vendorVerified:
          typeof body.vendorVerified === 'boolean' ? body.vendorVerified : undefined,
        vendorPriority: vendorPriority ?? 0,
        commissionRate:
          body.commissionRate !== undefined && body.commissionRate !== null && body.commissionRate !== ''
            ? Number.parseFloat(String(body.commissionRate))
            : undefined,
      },
    })

    return NextResponse.json(updatedVendor)
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}
