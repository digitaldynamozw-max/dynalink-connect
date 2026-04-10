import { prisma } from '../lib/prisma'
import { calculateVendorSettlement, roundCurrency } from '../lib/vendor-ledger'

const DEDUCTED_PAYOUT_STATUSES = new Set(['approved', 'processing', 'completed'])

type VendorSummary = {
  vendorId: string
  vendorLabel: string
  currentBalance: number
  expectedBalance: number
  creditedSales: number
  deductedPayouts: number
  requestedButNotDeducted: number
  itemUpdates: Array<{
    itemId: string
    currentVendorEarnings: number
    nextVendorEarnings: number
  }>
}

async function main() {
  const shouldApply = process.argv.includes('--apply')

  const vendors = await prisma.user.findMany({
    where: { isVendor: true },
    select: {
      id: true,
      email: true,
      vendorName: true,
      accountBalance: true,
      orderItems: {
        select: {
          id: true,
          price: true,
          quantity: true,
          deliveryFee: true,
          vendorEarnings: true,
          order: {
            select: {
              status: true,
            },
          },
        },
      },
      payouts: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: [{ vendorName: 'asc' }, { email: 'asc' }],
  })

  const summaries: VendorSummary[] = vendors.map((vendor) => {
    const itemUpdates = vendor.orderItems
      .map((item) => {
        const nextVendorEarnings = calculateVendorSettlement(item.price * item.quantity, item.deliveryFee)
        return {
          itemId: item.id,
          currentVendorEarnings: roundCurrency(item.vendorEarnings),
          nextVendorEarnings,
          orderStatus: item.order.status,
        }
      })
      .filter((item) => item.currentVendorEarnings !== item.nextVendorEarnings)

    const creditedSales = roundCurrency(
      vendor.orderItems.reduce((sum, item) => {
        if (item.order.status !== 'completed') {
          return sum
        }

        return sum + calculateVendorSettlement(item.price * item.quantity, item.deliveryFee)
      }, 0)
    )

    const deductedPayouts = roundCurrency(
      vendor.payouts.reduce((sum, payout) => {
        if (!DEDUCTED_PAYOUT_STATUSES.has(payout.status)) {
          return sum
        }

        return sum + payout.amount
      }, 0)
    )

    const requestedButNotDeducted = roundCurrency(
      vendor.payouts.reduce((sum, payout) => {
        if (payout.status !== 'requested') {
          return sum
        }

        return sum + payout.amount
      }, 0)
    )

    const expectedBalance = roundCurrency(creditedSales - deductedPayouts)

    return {
      vendorId: vendor.id,
      vendorLabel: vendor.vendorName || vendor.email,
      currentBalance: roundCurrency(vendor.accountBalance),
      expectedBalance,
      creditedSales,
      deductedPayouts,
      requestedButNotDeducted,
      itemUpdates: itemUpdates.map(({ itemId, currentVendorEarnings, nextVendorEarnings }) => ({
        itemId,
        currentVendorEarnings,
        nextVendorEarnings,
      })),
    }
  })

  const changedVendors = summaries.filter(
    (summary) => summary.currentBalance !== summary.expectedBalance || summary.itemUpdates.length > 0
  )

  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Vendors scanned: ${summaries.length}`)
  console.log(`Vendors needing balance changes: ${summaries.filter((summary) => summary.currentBalance !== summary.expectedBalance).length}`)
  console.log(`Order items needing vendorEarnings normalization: ${summaries.reduce((sum, summary) => sum + summary.itemUpdates.length, 0)}`)
  console.log('')

  for (const summary of changedVendors) {
    console.log(`Vendor: ${summary.vendorLabel}`)
    console.log(`  Current balance: ${summary.currentBalance.toFixed(2)}`)
    console.log(`  Expected balance: ${summary.expectedBalance.toFixed(2)}`)
    console.log(`  Credited completed sales: ${summary.creditedSales.toFixed(2)}`)
    console.log(`  Deducted approved payouts: ${summary.deductedPayouts.toFixed(2)}`)
    console.log(`  Requested not deducted: ${summary.requestedButNotDeducted.toFixed(2)}`)
    if (summary.itemUpdates.length > 0) {
      console.log(`  Item earning updates: ${summary.itemUpdates.length}`)
    }
    console.log('')
  }

  if (!shouldApply) {
    console.log('Dry run complete. Re-run with --apply to persist vendorEarnings and accountBalance updates.')
    return
  }

  for (const summary of changedVendors) {
    await prisma.$transaction(async (tx) => {
      for (const item of summary.itemUpdates) {
        await tx.orderItem.update({
          where: { id: item.itemId },
          data: {
            vendorEarnings: item.nextVendorEarnings,
          },
        })
      }

      if (summary.currentBalance !== summary.expectedBalance) {
        await tx.user.update({
          where: { id: summary.vendorId },
          data: {
            accountBalance: summary.expectedBalance,
          },
        })
      }
    })
  }

  console.log('Reconciliation applied successfully.')
}

main()
  .catch((error) => {
    console.error('Vendor balance reconciliation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
