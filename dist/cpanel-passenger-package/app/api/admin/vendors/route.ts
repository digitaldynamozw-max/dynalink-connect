import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SessionUserWithRole {
  role?: string
}

function isAdminRole(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user && (session.user as SessionUserWithRole).role === 'admin'
}

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

export async function GET() {
  try {
    const session = await auth()
    if (!isAdminRole(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendors = await prisma.user.findMany({
      where: { isVendor: true },
      select: {
        id: true,
        email: true,
        isActive: true,
        vendorName: true,
        vendorDescription: true,
        vendorImage: true,
        storeBannerImage: true,
        vendorCategory: true,
        vendorPriority: true,
        temporarilyClosed: true,
        accountBalance: true,
        storeAddress: true,
        storeCity: true,
        storeState: true,
        storeZipCode: true,
        vendorPhoneNumber: true,
        vendorVerified: true,
        vendorJoinedAt: true,
        products: {
          select: {
            id: true,
            stock: true,
            averageRating: true,
            rating: true,
            reviewCount: true,
          },
        },
        _count: {
          select: { products: true, orderItems: true },
        },
      },
      orderBy: [{ vendorPriority: 'desc' }, { vendorJoinedAt: 'desc' }],
    })

    const vendorsWithMetrics = vendors.map((vendor) => {
      const ratedProducts = vendor.products.filter(
        (product) =>
          (typeof product.averageRating === 'number' && product.averageRating > 0) ||
          (typeof product.rating === 'number' && product.rating > 0)
      )
      const averageRating =
        ratedProducts.length > 0
          ? ratedProducts.reduce(
              (sum, product) => sum + (product.averageRating || product.rating || 0),
              0
            ) / ratedProducts.length
          : 0
      const activeProductCount = vendor.products.filter((product) => product.stock > 0).length

      return {
        ...vendor,
        averageRating,
        activeProductCount,
      }
    })

    return NextResponse.json(vendorsWithMetrics)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdminRole(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const email = normalizeOptionalString(body.email)
    const vendorName = normalizeOptionalString(body.vendorName)
    const vendorDescription = normalizeOptionalString(body.vendorDescription)
    const vendorPhoneNumber = normalizeOptionalString(body.vendorPhoneNumber)
    const vendorImage = normalizeOptionalString(body.vendorImage)
    const storeBannerImage = normalizeOptionalString(body.storeBannerImage)
    const vendorCategory = normalizeOptionalString(body.vendorCategory)
    const storeAddress = normalizeOptionalString(body.storeAddress)
    const storeCity = normalizeOptionalString(body.storeCity)
    const storeState = normalizeOptionalString(body.storeState)
    const storeZipCode = normalizeOptionalString(body.storeZipCode)
    const vendorPriority = normalizePriority(body.vendorPriority)
    const vendorVerified = Boolean(body.vendorVerified ?? true)

    if (!email || !vendorName) {
      return NextResponse.json({ error: 'Email and vendor name are required' }, { status: 400 })
    }

    if (vendorPriority === null) {
      return NextResponse.json({ error: 'Vendor priority must be 0 or higher' }, { status: 400 })
    }

    const [emailTaken, vendorNameTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { vendorName }, select: { id: true } }).catch(() => null),
    ])

    if (emailTaken) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
    }

    if (vendorNameTaken) {
      return NextResponse.json({ error: 'Vendor name is already in use' }, { status: 400 })
    }

    const temporaryPassword = randomBytes(6).toString('base64url')
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    const vendor = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'vendor',
        isVendor: true,
        isActive: true,
        vendorName,
        vendorDescription,
        vendorPhoneNumber,
        vendorImage,
        storeBannerImage,
        vendorCategory,
        storeAddress,
        storeCity,
        storeState,
        storeZipCode,
        vendorPriority: vendorPriority ?? 0,
        vendorVerified,
        vendorJoinedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        vendorName: true,
        vendorVerified: true,
        vendorPriority: true,
        storeBannerImage: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Vendor created successfully',
      vendor,
      temporaryPassword,
    })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdminRole(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const vendorId = normalizeOptionalString(body.vendorId)

    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 })
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true, isVendor: true },
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const vendorPriority = normalizePriority(body.vendorPriority)
    if (vendorPriority === null) {
      return NextResponse.json({ error: 'Vendor priority must be 0 or higher' }, { status: 400 })
    }

    const updateData: {
      vendorVerified?: boolean
      vendorPriority?: number
      storeBannerImage?: string | null
      vendorImage?: string | null
      vendorCategory?: string | null
      vendorDescription?: string | null
    } = {}

    if (typeof body.verified === 'boolean') {
      updateData.vendorVerified = body.verified
    }
    if (vendorPriority !== undefined) {
      updateData.vendorPriority = vendorPriority
    }
    if (body.storeBannerImage !== undefined) {
      updateData.storeBannerImage = normalizeOptionalString(body.storeBannerImage) ?? null
    }
    if (body.vendorImage !== undefined) {
      updateData.vendorImage = normalizeOptionalString(body.vendorImage) ?? null
    }
    if (body.vendorCategory !== undefined) {
      updateData.vendorCategory = normalizeOptionalString(body.vendorCategory) ?? null
    }
    if (body.vendorDescription !== undefined) {
      updateData.vendorDescription = normalizeOptionalString(body.vendorDescription) ?? null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No vendor changes supplied' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: vendorId },
      data: updateData,
      select: {
        id: true,
        vendorName: true,
        email: true,
        vendorVerified: true,
        vendorPriority: true,
        storeBannerImage: true,
        vendorImage: true,
        vendorCategory: true,
        vendorDescription: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Vendor updated successfully',
      vendor: updated,
    })
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}
