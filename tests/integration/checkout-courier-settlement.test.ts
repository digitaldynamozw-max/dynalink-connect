import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../lib/prisma'

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

test('courier wallet deduction for pay-on-delivery order', async () => {
  // create courier and customer
  const courier = await prisma.user.create({ data: { name: 'Test Courier POD', email: `pod-${Date.now()}@example.com`, role: 'courier', accountBalance: 50 } })
  const customer = await prisma.user.create({ data: { name: 'Test Customer POD', email: `cust-pod-${Date.now()}@example.com`, role: 'user' } })

  // create an order with productMarkup, serviceFee, platformDeliveryShare and two items
  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      total: 0,
      deliveryFee: 5,
      platformFee: 0,
      paymentMethod: 'pay_on_delivery',
      paymentStatus: 'pending',
      status: 'pending',
      productMarkup: 10.5,
      serviceFee: 2.25,
      platformDeliveryShare: 1.75,
    },
  })

  const product = await prisma.product.create({ data: { name: `POD Product ${Date.now()}`, price: 1.0, stock: 10 } })
  const item1 = await prisma.orderItem.create({ data: { orderId: order.id, productId: product.id, quantity: 1, price: 0, vendorId: null, deliveryFee: 3 } })
  const item2 = await prisma.orderItem.create({ data: { orderId: order.id, productId: product.id, quantity: 1, price: 0, vendorId: null, deliveryFee: 2 } })

  // simulate courier assignment and settlement: deduction of fees
  const amountToDeduct = roundCurrency((order.productMarkup || 0) + (order.serviceFee || 0) + (order.platformDeliveryShare || 0))

  const before = (await prisma.user.findUnique({ where: { id: courier.id } }))!.accountBalance || 0

  await prisma.$transaction(async (tx) => {
    const balanceBefore = roundCurrency(before)
    const balanceAfter = roundCurrency(balanceBefore - amountToDeduct)

    await tx.user.update({ where: { id: courier.id }, data: { accountBalance: balanceAfter } })
    await tx.walletTransaction.create({ data: { userId: courier.id, type: 'platform_fee', status: 'completed', amount: amountToDeduct, balanceBefore, balanceAfter, description: `Platform fees deducted for order ${order.id}`, orderId: order.id } })
  })

  const final = (await prisma.user.findUnique({ where: { id: courier.id } }))!.accountBalance || 0
  assert.equal(final, roundCurrency((before) - amountToDeduct))

  const txs = await prisma.walletTransaction.findMany({ where: { userId: courier.id, orderId: order.id } })
  assert.ok(txs.length >= 1)
  const tx = txs.find((t) => t.type === 'platform_fee' && t.amount === amountToDeduct)
  assert.ok(tx)

  // cleanup
  await prisma.walletTransaction.deleteMany({ where: { userId: courier.id, orderId: order.id } })
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
  await prisma.order.delete({ where: { id: order.id } })
  await prisma.product.delete({ where: { id: product.id } })
  await prisma.user.delete({ where: { id: courier.id } })
  await prisma.user.delete({ where: { id: customer.id } })
})

test('courier wallet credit for online-paid order', async () => {
  const courier = await prisma.user.create({ data: { name: 'Test Courier Online', email: `online-${Date.now()}@example.com`, role: 'courier', accountBalance: 10 } })
  const customer = await prisma.user.create({ data: { name: 'Test Customer Online', email: `cust-online-${Date.now()}@example.com`, role: 'user' } })

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      total: 0,
      deliveryFee: 5,
      platformFee: 0,
      paymentMethod: 'paynow',
      paymentStatus: 'paid',
      status: 'pending',
      productMarkup: 0,
      serviceFee: 0,
      platformDeliveryShare: 0,
    },
  })

  const product = await prisma.product.create({ data: { name: `Online Product ${Date.now()}`, price: 1.0, stock: 10 } })
  const item1 = await prisma.orderItem.create({ data: { orderId: order.id, productId: product.id, quantity: 1, price: 0, vendorId: null, deliveryFee: 3 } })
  const item2 = await prisma.orderItem.create({ data: { orderId: order.id, productId: product.id, quantity: 1, price: 0, vendorId: null, deliveryFee: 2 } })

  // assume driverPlatformPercent = 8
  const driverPlatformPercent = 8
  const items = [item1, item2]
  const driverTotalCredit = roundCurrency(items.reduce((sum, it) => sum + roundCurrency((it.deliveryFee || 0) * (1 - driverPlatformPercent / 100)), 0))

  const before = (await prisma.user.findUnique({ where: { id: courier.id } }))!.accountBalance || 0

  if (driverTotalCredit > 0) {
    await prisma.$transaction(async (tx) => {
      const balanceBefore = roundCurrency(before)
      const balanceAfter = roundCurrency(balanceBefore + driverTotalCredit)
      await tx.user.update({ where: { id: courier.id }, data: { accountBalance: balanceAfter } })
      await tx.walletTransaction.create({ data: { userId: courier.id, type: 'delivery_credit', status: 'completed', amount: driverTotalCredit, balanceBefore, balanceAfter, description: `Delivery credit for completed order ${order.id}`, orderId: order.id } })
    })
  }

  const final = (await prisma.user.findUnique({ where: { id: courier.id } }))!.accountBalance || 0
  assert.equal(final, roundCurrency(before + driverTotalCredit))

  const txs = await prisma.walletTransaction.findMany({ where: { userId: courier.id, orderId: order.id } })
  assert.ok(txs.length >= 1)
  const tx = txs.find((t) => t.type === 'delivery_credit' && t.amount === driverTotalCredit)
  assert.ok(tx)

  // cleanup
  await prisma.walletTransaction.deleteMany({ where: { userId: courier.id, orderId: order.id } })
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
  await prisma.order.delete({ where: { id: order.id } })
  await prisma.product.delete({ where: { id: product.id } })
  await prisma.user.delete({ where: { id: courier.id } })
  await prisma.user.delete({ where: { id: customer.id } })
})
