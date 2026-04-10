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

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user?.id || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const code = normalizeOptionalString(body.code)?.toUpperCase()
    const userId = normalizeOptionalString(body.userId)
    const description = normalizeOptionalString(body.description)
    const discount = Number(body.discount)
    const maxUses = Number(body.maxUses)
    const minPurchase = Number(body.minPurchase ?? 0)
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null

    if (!code || !userId || !expiryDate || Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: 'Code, owner, and expiry date are required' }, { status: 400 })
    }

    if (!Number.isFinite(discount) || discount <= 0) {
      return NextResponse.json({ error: 'Discount must be greater than 0' }, { status: 400 })
    }

    if (!Number.isFinite(maxUses) || maxUses <= 0) {
      return NextResponse.json({ error: 'Max uses must be greater than 0' }, { status: 400 })
    }

    if (!Number.isFinite(minPurchase) || minPurchase < 0) {
      return NextResponse.json({ error: 'Minimum purchase must be 0 or higher' }, { status: 400 })
    }

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Promo code owner not found' }, { status: 404 })
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code,
        discount,
        description,
        expiryDate,
        maxUses,
        minPurchase,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            vendorName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, promoCode }, { status: 201 })
  } catch (error) {
    console.error('Admin promo code creation error:', error)
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
  }
}
