import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface SessionUser {
  id?: string
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order || order.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order || order.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const status = body.status as string | undefined

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = status ?? order.status

      return tx.order.update({
        where: { id },
        data: {
          status: nextStatus
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
