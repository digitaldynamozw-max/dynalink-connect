import { prisma } from '@/lib/prisma'
import { deriveOrderStatus, formatOrderItemStatus } from '@/lib/order-status'

export async function syncOrderStatus(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { status: true },
  })

  const derivedStatus = deriveOrderStatus(items.map((item) => item.status))

  await prisma.order.update({
    where: { id: orderId },
    data: { status: derivedStatus },
  })

  return derivedStatus
}

export async function createStatusChangeNotifications(
  itemIds: string[],
  nextStatus: string,
  actor: 'admin' | 'vendor' | 'courier'
) {
  const items = await prisma.orderItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      order: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
            },
          },
        },
      },
      product: {
        select: {
          name: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorName: true,
        },
      },
    },
  })

  if (!items.length) {
    return
  }

  const notifications = items.flatMap((item) => {
    const customerName =
      [item.order.user.firstName, item.order.user.lastName].filter(Boolean).join(' ') ||
      item.order.user.name ||
      item.order.user.email

    const vendorName = item.vendor?.vendorName || 'Admin Store'
    const fromLabel = formatOrderItemStatus(item.status)
    const toLabel = formatOrderItemStatus(nextStatus)
    const orderLabel = item.orderId.slice(0, 8)
    const actorLabel = actor === 'admin' ? 'Admin' : actor === 'courier' ? 'Courier' : vendorName

    const vendorNotification =
      item.vendorId
        ? {
            recipientId: item.vendorId,
            audience: 'vendor',
            title: `Order ${orderLabel} updated`,
            message: `${actorLabel} changed "${item.product.name}" for ${customerName} from ${fromLabel} to ${toLabel}.`,
            orderId: item.orderId,
            orderItemId: item.id,
            statusFrom: item.status,
            statusTo: nextStatus,
          }
        : null

    const adminNotification = {
      recipientId: null,
      audience: 'admin',
      title: `Order ${orderLabel} status changed`,
      message: `${actorLabel} changed "${item.product.name}" for ${customerName} from ${fromLabel} to ${toLabel}.`,
      orderId: item.orderId,
      orderItemId: item.id,
      statusFrom: item.status,
      statusTo: nextStatus,
    }

    return vendorNotification ? [vendorNotification, adminNotification] : [adminNotification]
  })

  if (notifications.length) {
    await prisma.notification.createMany({
      data: notifications,
    })
  }
}
