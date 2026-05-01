import { prisma } from '@/lib/prisma'
import { deriveOrderStatus, formatOrderItemStatus } from '@/lib/order-status'
import { sendPushToAdmins, sendPushToUser } from '@/lib/push-notifications'

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
  actor: 'admin' | 'vendor' | 'courier',
  previousStatuses?: Record<string, string>
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
              mobileNumber: true,
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
    const previousStatus = previousStatuses?.[item.id] || item.status
    const fromLabel = formatOrderItemStatus(previousStatus)
    const toLabel = formatOrderItemStatus(nextStatus)
    const orderLabel = item.order.orderNumber || item.orderId.slice(0, 8)
    const actorLabel = actor === 'admin' ? 'Admin' : actor === 'courier' ? 'Courier' : vendorName
    const customerNotification = {
      recipientId: item.order.userId,
      audience: 'user',
      channel: 'in_app',
      title: `Order ${orderLabel} updated`,
      message: `${item.product.name} moved from ${fromLabel} to ${toLabel}.`,
      orderId: item.orderId,
      orderItemId: item.id,
      statusFrom: previousStatus,
      statusTo: nextStatus,
      deliveryStatus: 'sent',
      sentAt: new Date(),
    }

    const vendorNotification =
      item.vendorId
        ? {
            recipientId: item.vendorId,
            audience: 'vendor',
            channel: 'in_app',
            title: `Order ${orderLabel} updated`,
            message: `${actorLabel} changed "${item.product.name}" for ${customerName} from ${fromLabel} to ${toLabel}.`,
            orderId: item.orderId,
            orderItemId: item.id,
            statusFrom: previousStatus,
            statusTo: nextStatus,
            deliveryStatus: 'sent',
            sentAt: new Date(),
          }
        : null

    const adminNotification = {
      recipientId: null,
      audience: 'admin',
      channel: 'in_app',
      title: `Order ${orderLabel} status changed`,
      message: `${actorLabel} changed "${item.product.name}" for ${customerName} from ${fromLabel} to ${toLabel}.`,
      orderId: item.orderId,
      orderItemId: item.id,
      statusFrom: previousStatus,
      statusTo: nextStatus,
      deliveryStatus: 'sent',
      sentAt: new Date(),
    }

    return vendorNotification
      ? [customerNotification, vendorNotification, adminNotification]
      : [customerNotification, adminNotification]
  })

  if (notifications.length) {
    await prisma.notification.createMany({
      data: notifications,
    })
  }

  await Promise.all(
    items.flatMap((item) => {
      const orderLabel = item.order.orderNumber || item.orderId.slice(0, 8)
      const previousStatus = previousStatuses?.[item.id] || item.status
      const fromLabel = formatOrderItemStatus(previousStatus)
      const toLabel = formatOrderItemStatus(nextStatus)
      const productName = item.product.name

      const customerPush = sendPushToUser(item.order.userId, {
        title: `Order ${orderLabel} updated`,
        body: `${productName} moved from ${fromLabel} to ${toLabel}.`,
        url: '/orders',
        tag: `order-${item.orderId}-${item.id}`,
      })

      const vendorPush = item.vendorId
        ? sendPushToUser(item.vendorId, {
            title: `Order ${orderLabel} updated`,
            body: `${productName} changed from ${fromLabel} to ${toLabel}.`,
            url: '/vendor/orders',
            tag: `vendor-order-${item.orderId}-${item.id}`,
          })
        : Promise.resolve()

      const adminPush = sendPushToAdmins({
        title: `Order ${orderLabel} status changed`,
        body: `${productName} moved from ${fromLabel} to ${toLabel}.`,
        url: `/admin/orders/${item.orderId}`,
        tag: `admin-order-${item.orderId}-${item.id}`,
      })

      return [customerPush, vendorPush, adminPush]
    })
  )

}
