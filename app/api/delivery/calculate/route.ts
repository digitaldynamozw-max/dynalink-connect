import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface DeliveryCalculation {
  productId: string
  vendorId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, customerAddress } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    if (!customerAddress) {
      return NextResponse.json(
        { error: 'Customer address is required' },
        { status: 400 }
      )
    }

    // Group items by vendor
    const itemsByVendor = new Map<string, typeof items>()

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { vendor: true }
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }

      const vendorId = product.vendorId || 'admin'
      if (!itemsByVendor.has(vendorId)) {
        itemsByVendor.set(vendorId, [])
      }
      itemsByVendor.get(vendorId)!.push(item)
    }

    // Calculate delivery fee for each vendor
    const deliveryFees: any[] = []
    let totalDeliveryFee = 0

    for (const [vendorId, vendorItems] of itemsByVendor) {
      let fee = 0

      if (vendorId !== 'admin') {
        // Check if vendor has delivery zones that cover this address
        const zones = await prisma.deliveryZone.findMany({
          where: {
            vendorId,
            active: true
          }
        })

        // Try to find a zone that matches the address
        let matchedZone = null
        if (zones.length > 0) {
          // Simple matching: check if zone address/city/state appears in customer address
          for (const zone of zones) {
            if (zone.address && customerAddress.toLowerCase().includes(zone.address.toLowerCase())) {
              matchedZone = zone
              break
            }
            if (zone.city && customerAddress.toLowerCase().includes(zone.city.toLowerCase())) {
              matchedZone = zone
              break
            }
            if (zone.state && customerAddress.toLowerCase().includes(zone.state.toLowerCase())) {
              matchedZone = zone
              break
            }
          }
        }

        if (matchedZone) {
          // Calculate fee: base + per-km fee
          // For now, use simple calculation: base fee + (km * perKmFee)
          // In production, you'd use real distance calculation
          fee = matchedZone.baseFee + (matchedZone.perKmFee * 5) // Assuming ~5km average
        } else {
          // No delivery zone found - apply default fee
          fee = 50 // Default delivery fee when no zone matches
        }
      }

      deliveryFees.push({
        vendorId,
        fee,
        itemCount: vendorItems.length
      })

      totalDeliveryFee += fee
    }

    return NextResponse.json({
      customerAddress,
      vendorFees: deliveryFees,
      totalDeliveryFee,
      itemsByVendor: Object.fromEntries(
        Array.from(itemsByVendor).map(([k, v]) => [k, v.length])
      )
    })
  } catch (error) {
    console.error('Delivery calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate delivery fee' },
      { status: 500 }
    )
  }
}
