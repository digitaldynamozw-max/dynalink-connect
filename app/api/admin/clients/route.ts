import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clients = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountBalance: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Clients fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, name, password } = body

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password,
        role: 'user'
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Client creation error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
