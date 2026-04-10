import { prisma } from '@/lib/prisma'
import { syncVendorLedgerBalance } from '@/lib/vendor-ledger'

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

export async function buildVendorStatementCsv(vendorId: string) {
  const vendor = await prisma.user.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      email: true,
      vendorName: true,
      commissionRate: true,
      accountBalance: true,
      isVendor: true,
    },
  })

  if (!vendor?.isVendor) {
    return null
  }

  const ledger = await syncVendorLedgerBalance(prisma, vendorId)
  if (!ledger) {
    return null
  }

  const [items, payouts] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        vendorId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            platformFee: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ order: { createdAt: 'desc' } }],
    }),
    prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  let csv = ''
  csv += `${escapeCsv('Vendor Statement')},${escapeCsv(vendor.vendorName || vendor.email)}\n`
  csv += `${escapeCsv('Vendor Email')},${escapeCsv(vendor.email)}\n`
  csv += `${escapeCsv('Commission Rate')},${escapeCsv(`${vendor.commissionRate}%`)}\n`
  csv += `${escapeCsv('Completed Sales Total')},${escapeCsv(ledger.completedSalesTotal.toFixed(2))}\n`
  csv += `${escapeCsv('Awaiting Approval')},${escapeCsv(ledger.requestedPayouts.toFixed(2))}\n`
  csv += `${escapeCsv('Available Balance')},${escapeCsv(ledger.availableBalance.toFixed(2))}\n`
  csv += '\n'
  csv += `${escapeCsv('Sales Ledger')}\n`
  csv += [
    'Order Number',
    'Order Status',
    'Created At',
    'Product',
    'Quantity',
    'Unit Price',
    'Line Subtotal',
    'Delivery Fee',
    'Vendor Settlement',
    'Payout Status',
  ].map(escapeCsv).join(',') + '\n'

  for (const item of items) {
    csv += [
      item.order.orderNumber || item.order.id.slice(0, 8),
      item.order.status,
      item.order.createdAt.toISOString(),
      item.product.name,
      item.quantity,
      item.price.toFixed(2),
      (item.price * item.quantity).toFixed(2),
      item.deliveryFee.toFixed(2),
      item.vendorEarnings.toFixed(2),
      item.payoutId ? 'Allocated to payout' : 'Available or settled in balance',
    ].map(escapeCsv).join(',') + '\n'
  }

  csv += '\n'
  csv += `${escapeCsv('Payout Ledger')}\n`
  csv += [
    'Created At',
    'Amount',
    'Status',
    'Orders Included',
    'Payment Method',
    'Transaction Id',
    'Reviewed At',
    'Processed At',
    'Review Notes',
  ].map(escapeCsv).join(',') + '\n'

  for (const payout of payouts) {
    csv += [
      payout.createdAt.toISOString(),
      payout.amount.toFixed(2),
      payout.status,
      payout.ordersIncluded,
      payout.paymentMethod || '',
      payout.transactionId || '',
      payout.reviewedAt?.toISOString() || '',
      payout.processedAt?.toISOString() || '',
      payout.reviewNotes || '',
    ].map(escapeCsv).join(',') + '\n'
  }

  return {
    vendor,
    csv,
  }
}
