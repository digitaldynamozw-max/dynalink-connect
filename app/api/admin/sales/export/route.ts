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

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: { email: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    })

    // Create CSV
    let csv = 'Date,Order ID,Customer,Email,Items,Total,Status\n'

    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0]
      const itemList = order.items.map(i => `${i.product.name} (x${i.quantity})`).join('; ')
      csv += `"${date}","${order.id}","${order.user?.name || 'N/A'}","${order.user?.email}","${itemList}","${order.total}","${order.status}"\n`
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sales-report.csv"'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
  }
}
