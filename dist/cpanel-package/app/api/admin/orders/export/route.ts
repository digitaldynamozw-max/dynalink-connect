import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function csvEscape(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? '' : String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true, category: true },
            },
            vendor: {
              select: { vendorName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const rows = [
      [
        'Order ID',
        'Order Date',
        'Customer',
        'Customer Email',
        'Customer Phone',
        'Order Status',
        'Delivery Address',
        'Delivery Fee',
        'Order Total',
        'Vendor',
        'Product',
        'Category',
        'Quantity',
        'Unit Price',
        'Item Status',
      ].join(','),
    ]

    orders.forEach((order) => {
      const customerName =
        [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
        order.user.name ||
        order.user.email

      order.items.forEach((item) => {
        rows.push(
          [
            csvEscape(order.id),
            csvEscape(order.createdAt.toISOString()),
            csvEscape(customerName),
            csvEscape(order.user.email),
            csvEscape(order.user.mobileNumber),
            csvEscape(order.status),
            csvEscape(order.deliveryAddress),
            csvEscape(order.deliveryFee.toFixed(2)),
            csvEscape(order.total.toFixed(2)),
            csvEscape(item.vendor?.vendorName || 'Admin Store'),
            csvEscape(item.product.name),
            csvEscape(item.product.category),
            csvEscape(item.quantity),
            csvEscape(item.price.toFixed(2)),
            csvEscape(item.status),
          ].join(',')
        )
      })
    })

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Order export error:', error)
    return NextResponse.json({ error: 'Failed to export orders' }, { status: 500 })
  }
}
