import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultWeeklyHours, serializeWeeklyHours } from '@/lib/store-hours'
import { resolveActingVendorId } from '@/lib/vendor-actor'
import { createRequestDebugId, getSessionDebug, logRequestDebug, logRequestError } from '@/lib/request-debug'

type VendorSession = {
  user?: {
    id?: string
    role?: string
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestDebugId('vendor-register-post')
  try {
    const session = (await auth()) as VendorSession | null
    logRequestDebug('vendor register POST start', requestId, {
      ...getSessionDebug(session),
    })

    if (!session?.user?.id) {
      logRequestDebug('vendor register POST unauthorized', requestId, {
        ...getSessionDebug(session),
      })
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

    const normalizedVendorName =
      typeof vendorName === 'string' ? vendorName.trim() : ''

    if (!normalizedVendorName) {
      logRequestDebug('vendor register POST invalid vendor name', requestId, {
        ...getSessionDebug(session),
      })
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      )
    }

    logRequestDebug('vendor register POST payload', requestId, {
      ...getSessionDebug(session),
      vendorName: normalizedVendorName,
      storeCity: typeof storeCity === 'string' ? storeCity.trim() : null,
      storeState: typeof storeState === 'string' ? storeState.trim() : null,
      hasDescription: typeof vendorDescription === 'string' && vendorDescription.trim().length > 0,
      weeklyOpeningHoursLength:
        typeof weeklyOpeningHours === 'string' ? weeklyOpeningHours.length : null,
    })

    // Check if vendor name is already taken
    const existingVendor = await prisma.user.findUnique({
      where: { vendorName: normalizedVendorName }
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
        vendorName: normalizedVendorName,
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
    logRequestError('vendor register POST failed', requestId, error, {})
    return NextResponse.json(
      { error: 'Failed to register as vendor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestDebugId('vendor-register-get')
  try {
    const session = (await auth()) as VendorSession | null
    logRequestDebug('vendor register GET start', requestId, {
      ...getSessionDebug(session),
    })

    if (!session?.user?.id) {
      logRequestDebug('vendor register GET unauthorized', requestId, {
        ...getSessionDebug(session),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const actingVendor = resolveActingVendorId(request, session)
    const userId = actingVendor.vendorId || session.user.id

    logRequestDebug('vendor register GET resolved user', requestId, {
      ...getSessionDebug(session),
      impersonatedVendorId: actingVendor.impersonatedVendorId,
      adminId: actingVendor.adminId,
      resolvedUserId: userId,
    })

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
    logRequestError('vendor register GET failed', requestId, 'unknown error', {})
    return NextResponse.json(
      { error: 'Failed to fetch vendor info' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const requestId = createRequestDebugId('vendor-register-put')
  try {
    const session = (await auth()) as VendorSession | null
    logRequestDebug('vendor register PUT start', requestId, {
      ...getSessionDebug(session),
    })

    if (!session?.user?.id) {
      logRequestDebug('vendor register PUT unauthorized', requestId, {
        ...getSessionDebug(session),
      })
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

    const normalizedVendorName =
      typeof vendorName === 'string' ? vendorName.trim() : undefined

    logRequestDebug('vendor register PUT payload', requestId, {
      ...getSessionDebug(session),
      vendorName: normalizedVendorName || null,
      hasDescription: typeof vendorDescription === 'string' && vendorDescription.trim().length > 0,
      weeklyOpeningHoursLength:
        typeof weeklyOpeningHours === 'string' ? weeklyOpeningHours.length : null,
    })

    const existingVendor = normalizedVendorName
      ? await prisma.user.findFirst({
          where: {
            vendorName: normalizedVendorName,
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
        vendorName: normalizedVendorName,
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
    logRequestError('vendor register PUT failed', requestId, error, {})
    return NextResponse.json(
      { error: 'Failed to update vendor settings' },
      { status: 500 }
    )
  }
}
