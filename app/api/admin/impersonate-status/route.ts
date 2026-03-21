import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const vendorId = request.cookies.get('impersonatedVendorId')?.value
    const adminId = request.cookies.get('adminImpersonationId')?.value

    if (!vendorId || !adminId) {
      return NextResponse.json({
        isImpersonating: false
      })
    }

    // Verify vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { vendorName: true }
    })

    if (!vendor) {
      return NextResponse.json({
        isImpersonating: false
      })
    }

    return NextResponse.json({
      isImpersonating: true,
      vendorId,
      vendorName: vendor.vendorName,
      adminId
    })
  } catch (error) {
    return NextResponse.json({
      isImpersonating: false
    })
  }
}
