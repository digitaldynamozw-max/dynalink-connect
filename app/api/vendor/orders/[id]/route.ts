import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActingVendorId } from '@/lib/vendor-actor'
import { createStatusChangeNotifications, syncOrderStatus } from '@/lib/notifications'
import { isOrderItemStatus } from '@/lib/order-status'
import { syncLateDeliveryAlertsForOrderItems } from '@/lib/courier-tracking'

const VENDOR_ALLOWED_STATUSES = ['pending', 'accepted', 'completed', 'declined', 'cancelled']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = resolveActingVendorId(request, session).vendorId
    const { status, itemIds } = await request.json()

    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No order items selected' }, { status: 400 })
    }

    // Validate status
    if (status && !isOrderItemStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status && !VENDOR_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Delivery status is managed by admin only' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json({ error: 'No update payload supplied' }, { status: 400 })
    }

    // Verify the vendor owns these order items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId,
        id: { in: itemIds },
        vendorId,
      },
      include: { order: true },
    })

    if (orderItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'Order items not found' }, { status: 404 })
    }

    for (const orderItem of orderItems) {
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { status },
      })
    }

    await createStatusChangeNotifications(itemIds, status, 'vendor')
    await syncLateDeliveryAlertsForOrderItems(itemIds)

    const touchedOrderIds = [...new Set(orderItems.map((item) => item.orderId))]
    await Promise.all(touchedOrderIds.map((orderId) => syncOrderStatus(orderId)))

    // Get updated items
    const updatedItems = await prisma.orderItem.findMany({
      where: {
        orderId,
        id: { in: itemIds },
        vendorId,
      },
      include: { product: true, vendor: true, order: true },
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedItems.length} item(s) to ${status}`,
      items: updatedItems,
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = resolveActingVendorId(request, session).vendorId
    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get order and its items for this vendor
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { email: true, mobileNumber: true, firstName: true, lastName: true }
        },
        items: {
          where: { vendorId },
          include: { product: true }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.items.length === 0) {
      return NextResponse.json({ error: 'No items from your store in this order' }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
