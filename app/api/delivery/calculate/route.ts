import { NextRequest, NextResponse } from 'next/server'
import { calculateDeliveryQuote } from '@/lib/delivery'
import { ensureSiteSettings } from '@/lib/admin/site-settings'

export async function POST(request: NextRequest) {
  try {
    const settings = await ensureSiteSettings()
    if (settings.platformOrdersPaused || settings.allStoresTemporarilyClosed) {
      return NextResponse.json(
        { error: 'Delivery quotes are unavailable while the marketplace is paused.' },
        { status: 400 }
      )
    }

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

    const deliveryQuote = await calculateDeliveryQuote(items, customerAddress)

    return NextResponse.json(deliveryQuote)
  } catch (error) {
    console.error('Delivery calculation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to calculate delivery fee',
      },
      { status: 500 }
    )
  }
}
