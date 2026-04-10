import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workers = await prisma.user.findMany({
      where: {
        OR: [{ role: 'admin' }, { role: 'vendor' }, { role: 'user' }, { role: 'courier' }],
      },
      include: {
        _count: {
          select: {
            orders: true,
            supportTickets: true,
            products: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { updatedAt: 'desc' }],
      take: 50,
    })

    return NextResponse.json(workers)
  } catch (error) {
    console.error('Workers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
  }
}

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
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const email = normalizeOptionalString(body.email)
    const name = normalizeOptionalString(body.name)
    const mobileNumber = normalizeOptionalString(body.mobileNumber)
    const role = normalizeOptionalString(body.role) || 'courier'

    if (!email) {
      return NextResponse.json({ error: 'Courier email is required' }, { status: 400 })
    }

    if (role !== 'courier') {
      return NextResponse.json({ error: 'Only courier creation is supported here' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
    }

    const temporaryPassword = randomBytes(6).toString('base64url')
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    const courier = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        mobileNumber,
        role: 'courier',
        isActive: true,
        isVendor: false,
        vendorVerified: false,
        vendorJoinedAt: null,
      },
      include: {
        _count: {
          select: {
            orders: true,
            supportTickets: true,
            products: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Courier created successfully',
      courier,
      temporaryPassword,
    })
  } catch (error) {
    console.error('Courier creation error:', error)
    return NextResponse.json({ error: 'Failed to create courier' }, { status: 500 })
  }
}
