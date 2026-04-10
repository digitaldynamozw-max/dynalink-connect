import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const validRoles = new Set(['admin', 'vendor', 'user', 'courier'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const role = typeof body.role === 'string' ? body.role : undefined
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined

    if (role !== undefined && !validRoles.has(role)) {
      return NextResponse.json({ error: 'Invalid role supplied' }, { status: 400 })
    }

    if (role === undefined && isActive === undefined) {
      return NextResponse.json({ error: 'No changes supplied' }, { status: 400 })
    }

    if (session.user.id === id && role && role !== 'admin') {
      return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        vendorName: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined
          ? {
              role,
              isVendor: role === 'vendor',
              vendorVerified: role === 'vendor' ? undefined : false,
              vendorJoinedAt: role === 'vendor' ? new Date() : null,
            }
          : {}),
        ...(isActive !== undefined ? { isActive } : {}),
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Worker update error:', error)
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 })
  }
}
