import { prisma } from '../lib/prisma'
import {
  COURIER_ASSIGNMENT_AUDIT_AUDIENCE,
  DELIVERY_CHANNEL_LOG_AUDIENCE,
  DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
  DELIVERY_EXCEPTION_AUDIENCE,
  DELIVERY_PROOF_AUDIENCE,
  DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
  DELIVERY_TIMELINE_AUDIENCE,
  parseDeliveryNotificationPreferences,
} from '../lib/courier-tracking'

async function main() {
  const [users, items, notifications] = await Promise.all([
    prisma.user.findMany({
      where: {
        email: {
          in: ['admin@example.com', 'customer@example.com', 'courier1@example.com', 'vendor1@example.com'],
        },
      },
      select: {
        email: true,
        role: true,
        notificationPreferencesJson: true,
      },
    }),
    prisma.orderItem.findMany({
      take: 10,
      select: {
        id: true,
        status: true,
        proofSubmittedAt: true,
        proofSignatureName: true,
        proofChecklistJson: true,
      },
    }),
    prisma.notification.groupBy({
      by: ['audience'],
      _count: {
        _all: true,
      },
      where: {
        audience: {
          in: [
            DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
            DELIVERY_EXCEPTION_AUDIENCE,
            DELIVERY_PROOF_AUDIENCE,
            DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
            DELIVERY_TIMELINE_AUDIENCE,
            DELIVERY_CHANNEL_LOG_AUDIENCE,
            COURIER_ASSIGNMENT_AUDIT_AUDIENCE,
          ],
        },
      },
    }),
  ])

  const summary = {
    users: users.map((user) => ({
      email: user.email,
      role: user.role,
      preferences: parseDeliveryNotificationPreferences(user.notificationPreferencesJson),
    })),
    proofEnabledItems: items.filter((item) => item.proofSubmittedAt || item.proofSignatureName || item.proofChecklistJson).length,
    notificationCounts: notifications.reduce<Record<string, number>>((acc, item) => {
      acc[item.audience] = item._count._all
      return acc
    }, {}),
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
