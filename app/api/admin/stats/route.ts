import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalUsers, totalOrders, activeUsers] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'user', isActive: { not: false } } })
    ])

    const orders = await prisma.order.findMany()
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalRevenue,
      activeUsers
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
