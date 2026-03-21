import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = (session.user as any).id
    const body = await request.json()
    const { vendorId } = body

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 })
    }

    // Verify vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        email: true,
        name: true,
        isVendor: true,
        vendorName: true
      }
    })

    if (!vendor?.isVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Create special impersonation token/session
    // Store impersonation info in response cookie
    const response = NextResponse.json({
      success: true,
      message: `Impersonating ${vendor.vendorName}`,
      vendor: {
        id: vendor.id,
        email: vendor.email,
        vendorName: vendor.vendorName
      },
      adminId
    })

    // Set cookies for impersonation session
    response.cookies.set('impersonatedVendorId', vendorId, {
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    response.cookies.set('adminImpersonationId', adminId, {
      maxAge: 3600,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response
  } catch (error) {
    console.error('Error in impersonate:', error)
    return NextResponse.json(
      { error: 'Failed to impersonate vendor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Impersonation ended'
    })

    // Clear impersonation cookies
    response.cookies.delete('impersonatedVendorId')
    response.cookies.delete('adminImpersonationId')

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    )
  }
}
