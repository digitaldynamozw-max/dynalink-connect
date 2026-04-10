import { NextRequest, NextResponse } from 'next/server'
import { calculateDeliveryQuote } from '@/lib/delivery'

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
