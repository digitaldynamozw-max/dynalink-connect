import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = (session.user as any).id
    const { status, itemIds } = await request.json()

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify the vendor owns these order items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        id: { in: itemIds },
        vendorId: vendorId
      },
      include: { order: true }
    })

    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Order items not found' }, { status: 404 })
    }

    // Update order items
    await prisma.orderItem.updateMany({
      where: {
        id: { in: itemIds },
        vendorId: vendorId
      },
      data: { status }
    })

    // Get updated items
    const updatedItems = await prisma.orderItem.findMany({
      where: { id: { in: itemIds } },
      include: { product: true }
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedItems.length} item(s) to ${status}`,
      items: updatedItems
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
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = (session.user as any).id
    const orderId = id

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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
