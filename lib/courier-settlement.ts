import { Prisma, PrismaClient } from '@prisma/client'
import { roundCurrency } from './vendor-ledger'

type DbClient = Prisma.TransactionClient | PrismaClient

export async function settleCourierForOrder(
  db: DbClient,
  opts: {
    orderId: string
    courierId: string
    paymentMethod: string
    productMarkup?: number | null
    serviceFee?: number | null
    platformDeliveryShare?: number | null
    updatedItems: Array<{ id: string; deliveryFee?: number | null }>
    driverPlatformPercent?: number | null
  }
) {
  const {
    orderId,
    courierId,
    paymentMethod,
    productMarkup,
    serviceFee,
    platformDeliveryShare,
    updatedItems,
    driverPlatformPercent,
  } = opts

  // pay-on-delivery: deduct productMarkup + serviceFee + platformDeliveryShare from courier
  if (paymentMethod === 'pay_on_delivery') {
    const amountToDeduct = roundCurrency((productMarkup || 0) + (serviceFee || 0) + (platformDeliveryShare || 0))

    await db.$transaction(async (tx) => {
      const courierUser = await tx.user.findUnique({ where: { id: courierId }, select: { id: true, accountBalance: true } })
      const balanceBefore = roundCurrency(courierUser?.accountBalance || 0)
      const balanceAfter = roundCurrency(balanceBefore - amountToDeduct)

      await tx.user.update({ where: { id: courierId }, data: { accountBalance: balanceAfter } })
      await tx.walletTransaction.create({
        data: {
          userId: courierId,
          type: 'platform_fee',
          status: 'completed',
          amount: amountToDeduct,
          balanceBefore,
          balanceAfter,
          description: `Platform fees deducted for order ${orderId}`,
          orderId,
        },
      })
    })

    const postBalance = (await db.user.findUnique({ where: { id: courierId }, select: { accountBalance: true } }))?.accountBalance || 0
    if (postBalance < 0) {
      await db.notification.create({
        data: {
          recipientId: null,
          audience: 'admin',
          channel: 'in_app',
          title: `Negative courier wallet after fees for order ${orderId}`,
          message: `Courier has a negative wallet balance after platform fees were deducted for order ${orderId}. Please review and reconcile.`,
          orderId,
          deliveryStatus: 'sent',
          sentAt: new Date(),
        },
      })
    }

    return
  }

  // online-paid: credit driver with deliveryFee * (1 - driverPlatformPercent/100)
  const driverPercent = driverPlatformPercent || 0
  const driverTotalCredit = updatedItems.reduce((sum, it) => sum + roundCurrency((it.deliveryFee || 0) * (1 - driverPercent / 100)), 0)

  if (driverTotalCredit > 0) {
    await db.$transaction(async (tx) => {
      const courierUser = await tx.user.findUnique({ where: { id: courierId }, select: { id: true, accountBalance: true } })
      const balanceBefore = roundCurrency(courierUser?.accountBalance || 0)
      const balanceAfter = roundCurrency(balanceBefore + driverTotalCredit)

      await tx.user.update({ where: { id: courierId }, data: { accountBalance: balanceAfter } })
      await tx.walletTransaction.create({
        data: {
          userId: courierId,
          type: 'delivery_credit',
          status: 'completed',
          amount: driverTotalCredit,
          balanceBefore,
          balanceAfter,
          description: `Delivery credit for completed order ${orderId}`,
          orderId,
        },
      })
    })
  }
}

export default settleCourierForOrder
