import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const client = await prisma.user.findUnique({
      where: { id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        accountBalance: client.accountBalance + amount
      },
      select: {
        id: true,
        email: true,
        name: true,
        accountBalance: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Credit addition error:', error)
    return NextResponse.json({ error: 'Failed to add credit: ' + (error as Error).message }, { status: 500 })
  }
}
