import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await (prisma as any).supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    const open = tickets.filter(t => t.status === 'open').length
    const resolved = tickets.filter(t => t.status === 'resolved').length

    return NextResponse.json({
      tickets,
      open,
      resolved
    })
  } catch (error) {
    console.error('Support tickets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { subject, message, priority } = body

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const ticket = await (prisma as any).supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        message,
        priority: priority || 'normal',
        status: 'open'
      }
    })

    // TODO: Send ticket confirmation email

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket
    })
  } catch (error) {
    console.error('Support ticket creation error:', error)
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
  }
}
