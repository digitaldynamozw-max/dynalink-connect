import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStatusChangeNotifications, syncOrderStatus } from '@/lib/notifications'
import { isOrderItemStatus } from '@/lib/order-status'
import { syncLateDeliveryAlertsForOrderItems } from '@/lib/courier-tracking'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status, itemIds } = (await request.json()) as {
      status?: string
      itemIds?: string[]
    }

    if (!status || !isOrderItemStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!itemIds?.length) {
      return NextResponse.json({ error: 'No order items selected' }, { status: 400 })
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId: id,
        id: { in: itemIds },
      },
    })

    if (!orderItems.length) {
      return NextResponse.json({ error: 'Order items not found' }, { status: 404 })
    }

    await prisma.orderItem.updateMany({
      where: {
        orderId: id,
        id: { in: itemIds },
      },
      data: { status },
    })

    await createStatusChangeNotifications(itemIds, status, 'admin')
    const overallStatus = await syncOrderStatus(id)
    await syncLateDeliveryAlertsForOrderItems(itemIds)

    const updatedItems = await prisma.orderItem.findMany({
      where: {
        orderId: id,
        id: { in: itemIds },
      },
      include: {
        product: true,
        vendor: true,
      },
    })

    return NextResponse.json({
      success: true,
      orderStatus: overallStatus,
      items: updatedItems,
    })
  } catch (error) {
    console.error('Admin order update error:', error)
    return NextResponse.json({ error: 'Failed to update admin order status' }, { status: 500 })
  }
}
