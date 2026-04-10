import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const { eventType, productId, productName, amount, orderId } = await request.json()

    if (!eventType) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 })
    }

    // Store analytics event (for now, just log it)
    console.log('Analytics Event:', {
      eventType,
      userId: session?.user?.email,
      productId,
      productName,
      amount,
      orderId,
      timestamp: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Analytics tracking failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get sales analytics
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
    const totalOrders = orders.length
    const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0)

    // Get top products
    const topProducts = await prisma.product.findMany({
      orderBy: { salesCount: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      totalSales,
      totalOrders,
      totalItems,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      topProducts,
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
