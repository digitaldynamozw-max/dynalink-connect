import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const daysParam = req.nextUrl.searchParams.get('days') || '30'
    const days = parseInt(daysParam)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all orders and items for the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Calculate daily sales
    const dailySalesMap = new Map<string, any>()
    
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0]
      if (!dailySalesMap.has(date)) {
        dailySalesMap.set(date, { orders: 0, revenue: 0, totalValue: 0 })
      }
      const day = dailySalesMap.get(date)
      day.orders += 1
      day.revenue += order.total
      day.totalValue += order.total
    })

    const totalSales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.revenue / (data.orders || 1)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get top products
    const productSales = new Map<string, any>()
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales.has(item.productId)) {
          productSales.set(item.productId, {
            name: item.product.name,
            quantity: 0,
            revenue: 0
          })
        }
        const product = productSales.get(item.productId)
        product.quantity += item.quantity
        product.revenue += item.price * item.quantity
      })
    })

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

    return NextResponse.json({
      totalSales,
      topProducts,
      totalRevenue,
      totalOrders: orders.length
    })
  } catch (error) {
    console.error('Sales report error:', error)
    return NextResponse.json({ error: 'Failed to fetch sales report' }, { status: 500 })
  }
}
