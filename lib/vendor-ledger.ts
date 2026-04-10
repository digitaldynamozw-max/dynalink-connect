import { Prisma, PrismaClient } from '@prisma/client'

const DEDUCTED_PAYOUT_STATUSES = ['approved', 'processing', 'completed'] as const

type LedgerClient = Prisma.TransactionClient | PrismaClient

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateCommissionSurcharge(baseAmount: number, commissionRate: number) {
  return roundCurrency(baseAmount * (commissionRate / 100))
}

export function calculateVendorSettlement(baseAmount: number, deliveryFee: number) {
  return roundCurrency(baseAmount + deliveryFee)
}

export async function getVendorLedgerSnapshot(db: LedgerClient, vendorId: string) {
  const [vendor, completedSalesAggregate, payouts] = await Promise.all([
    db.user.findUnique({
      where: { id: vendorId },
      select: { id: true, accountBalance: true, isVendor: true },
    }),
    db.orderItem.aggregate({
      where: {
        vendorId,
        status: 'completed',
      },
      _sum: {
        vendorEarnings: true,
      },
    }),
    db.vendorPayout.findMany({
      where: { vendorId },
      select: {
        amount: true,
        status: true,
      },
    }),
  ])

  if (!vendor?.isVendor) {
    return null
  }

  const completedSalesTotal = roundCurrency(completedSalesAggregate._sum.vendorEarnings || 0)
  const deductedPayouts = roundCurrency(
    payouts
      .filter((payout) =>
        DEDUCTED_PAYOUT_STATUSES.includes(
          payout.status as (typeof DEDUCTED_PAYOUT_STATUSES)[number]
        )
      )
      .reduce((sum, payout) => sum + payout.amount, 0)
  )
  const requestedPayouts = roundCurrency(
    payouts
      .filter((payout) => payout.status === 'requested')
      .reduce((sum, payout) => sum + payout.amount, 0)
  )
  const ledgerBalance = roundCurrency(Math.max(0, completedSalesTotal - deductedPayouts))
  const availableBalance = roundCurrency(Math.max(0, ledgerBalance - requestedPayouts))

  return {
    currentStoredBalance: roundCurrency(vendor.accountBalance || 0),
    completedSalesTotal,
    deductedPayouts,
    requestedPayouts,
    ledgerBalance,
    availableBalance,
    totalEarnings: roundCurrency(ledgerBalance + deductedPayouts),
  }
}

export async function syncVendorLedgerBalance(db: LedgerClient, vendorId: string) {
  const snapshot = await getVendorLedgerSnapshot(db, vendorId)
  if (!snapshot) {
    return null
  }

  if (snapshot.currentStoredBalance !== snapshot.ledgerBalance) {
    await db.user.update({
      where: { id: vendorId },
      data: {
        accountBalance: snapshot.ledgerBalance,
      },
    })
  }

  return snapshot
}
