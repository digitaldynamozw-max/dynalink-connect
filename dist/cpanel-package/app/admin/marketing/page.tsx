import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { AdminMarketingDashboard } from '@/components/admin-marketing-dashboard'

function formatDateTime(date: Date | null | undefined) {
  if (!date) return 'No activity yet'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDate(date: Date | null | undefined) {
  if (!date) return 'Not set'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function AdminMarketingPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  const now = new Date()
  const last30Days = startOfDay(new Date(now))
  last30Days.setDate(last30Days.getDate() - 29)

  const [siteSettings, customersRaw, vendorsRaw, orders, promoCodes, referrals, reviews] = await Promise.all([
    ensureSiteSettings(),
    prisma.user.findMany({
      where: { role: 'user' },
      include: {
        orders: {
          select: {
            total: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          select: {
            createdAt: true,
            rating: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
            referralsReceived: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 120,
    }),
    prisma.user.findMany({
      where: { isVendor: true },
      include: {
        products: {
          select: {
            stock: true,
            averageRating: true,
            rating: true,
          },
        },
        _count: {
          select: {
            products: true,
            orderItems: true,
          },
        },
      },
      orderBy: [{ vendorPriority: 'desc' }, { vendorJoinedAt: 'desc' }],
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: last30Days } },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.promoCode.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            vendorName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referral.findMany({
      include: {
        referrer: {
          select: {
            email: true,
            name: true,
            vendorName: true,
          },
        },
        referred: {
          select: {
            email: true,
            name: true,
            vendorName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: last30Days } },
      select: {
        rating: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const customerRows = customersRaw.map((user) => {
    const customerName =
      user.firstName || user.lastName
        ? [user.firstName, user.lastName].filter(Boolean).join(' ')
        : user.name || user.email
    const totalSpend = user.orders.reduce((sum, order) => sum + order.total, 0)
    const lastOrder = user.orders[0]?.createdAt ?? null
    const lastReview = user.reviews[0]?.createdAt ?? null
    const lastSeen = new Date(
      Math.max(
        user.updatedAt.getTime(),
        lastOrder?.getTime() ?? 0,
        lastReview?.getTime() ?? 0
      )
    )

    return {
      id: user.id,
      name: customerName,
      email: user.email,
      phone: user.mobileNumber || 'Not set',
      lastSeenAt: lastSeen,
      joinedAt: formatDateTime(user.createdAt),
      lastSeen: formatDateTime(lastSeen),
      lastOrderAt: formatDateTime(lastOrder),
      orders: user.orders.length,
      totalSpend,
      averageOrder: user.orders.length > 0 ? totalSpend / user.orders.length : 0,
      reviews: user._count.reviews,
      referrals: user._count.referralsReceived,
      status: user.isActive === false ? ('Blacklisted' as const) : ('Active' as const),
    }
  })

  const vendorRows = vendorsRaw.map((vendor) => {
    const ratedProducts = vendor.products.filter(
      (product) =>
        (typeof product.averageRating === 'number' && product.averageRating > 0) ||
        (typeof product.rating === 'number' && product.rating > 0)
    )
    const averageRating =
      ratedProducts.length > 0
        ? ratedProducts.reduce(
            (sum, product) => sum + (product.averageRating || product.rating || 0),
            0
          ) / ratedProducts.length
        : 0

    return {
      id: vendor.id,
      vendorName: vendor.vendorName || vendor.email,
      category: vendor.vendorCategory || 'Uncategorized',
      priority: vendor.vendorPriority ?? 0,
      status: vendor.vendorVerified ? 'Verified' : 'Pending',
      products: vendor._count.products,
      orders: vendor._count.orderItems,
      averageRating,
      bannersReady: Boolean(vendor.storeBannerImage),
    }
  })

  const marketingPromoCodes = promoCodes.map((promo) => {
    const isActive = promo.expiryDate > now && promo.currentUses < promo.maxUses

    return {
      id: promo.id,
      code: promo.code,
      discount: promo.discount,
      uses: promo.currentUses,
      maxUses: promo.maxUses,
      expiresAt: formatDateTime(promo.expiryDate),
      owner: promo.user.vendorName || promo.user.name || promo.user.email,
      ownerId: promo.user.id,
      status: isActive ? ('Active' as const) : ('Inactive' as const),
      description: promo.description || 'Discount code',
      minPurchase: promo.minPurchase,
      createdAt: formatDateTime(promo.createdAt),
    }
  })

  const marketingReferrals = referrals.map((referral) => ({
    id: referral.id,
    referrer: referral.referrer.vendorName || referral.referrer.name || referral.referrer.email,
    referred: referral.referred.vendorName || referral.referred.name || referral.referred.email,
    rewardAmount: referral.rewardAmount,
    status: referral.status,
    createdAt: formatDateTime(referral.createdAt),
  }))

  const ordersPerDayMap = new Map<string, { date: string; label: string; orders: number; revenue: number }>()
  const ratingsPerDayMap = new Map<string, { date: string; label: string; ratings: number; average: number }>()

  for (let index = 0; index < 14; index += 1) {
    const day = startOfDay(new Date(now))
    day.setDate(day.getDate() - (13 - index))
    const key = getDayKey(day)
    ordersPerDayMap.set(key, { date: key, label: formatDate(day), orders: 0, revenue: 0 })
    ratingsPerDayMap.set(key, { date: key, label: formatDate(day), ratings: 0, average: 0 })
  }

  orders.forEach((order) => {
    const key = getDayKey(order.createdAt)
    const bucket = ordersPerDayMap.get(key)
    if (bucket) {
      bucket.orders += 1
      bucket.revenue += order.total
    }
  })

  reviews.forEach((review) => {
    const key = getDayKey(review.createdAt)
    const bucket = ratingsPerDayMap.get(key)
    if (bucket) {
      const nextCount = bucket.ratings + 1
      bucket.average = (bucket.average * bucket.ratings + review.rating) / nextCount
      bucket.ratings = nextCount
    }
  })

  const activityFeed = [
    ...orders.slice(0, 5).map((order) => ({
      id: order.id,
      label: `Order from ${order.user.name || order.user.email}`,
      meta: `US$${order.total.toFixed(2)} - ${order.status}`,
      atValue: order.createdAt.getTime(),
      at: formatDateTime(order.createdAt),
    })),
    ...promoCodes.slice(0, 3).map((promo) => ({
      id: promo.id,
      label: `Promo ${promo.code} assigned to ${promo.user.vendorName || promo.user.name || promo.user.email}`,
      meta: `${promo.discount}% discount`,
      atValue: promo.createdAt.getTime(),
      at: formatDateTime(promo.createdAt),
    })),
    ...referrals.slice(0, 3).map((referral) => ({
      id: referral.id,
      label: `${referral.referrer.name || referral.referrer.email} referred ${referral.referred.name || referral.referred.email}`,
      meta: `${referral.status} - US$${referral.rewardAmount.toFixed(2)}`,
      atValue: referral.createdAt.getTime(),
      at: formatDateTime(referral.createdAt),
    })),
  ]
    .sort((left, right) => right.atValue - left.atValue)
    .slice(0, 8)
    .map((item) => {
      const { atValue, ...nextItem } = item
      void atValue
      return nextItem
    })

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  const stats = {
    activeCustomers: customerRows.filter((customer) => customer.status === 'Active').length,
    blacklistedCustomers: customerRows.filter((customer) => customer.status === 'Blacklisted').length,
    totalVendors: vendorRows.length,
    verifiedVendors: vendorRows.filter((vendor) => vendor.status === 'Verified').length,
    activePromoCodes: marketingPromoCodes.filter((promo) => promo.status === 'Active').length,
    inactivePromoCodes: marketingPromoCodes.filter((promo) => promo.status === 'Inactive').length,
    totalReferrals: marketingReferrals.length,
    completedReferrals: marketingReferrals.filter((referral) => referral.status === 'completed').length,
    revenueWindow: orders.reduce((sum, order) => sum + order.total, 0),
    ordersWindow: orders.length,
    averageRating,
    ratingsWindow: reviews.length,
    activeCustomersThisWeek: customerRows.filter((customer) =>
      customer.lastSeenAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  }

  const customerOptions = customersRaw.map((user) => ({
    id: user.id,
    label:
      user.firstName || user.lastName
        ? [user.firstName, user.lastName].filter(Boolean).join(' ')
        : user.name || user.email,
    secondary: user.email,
  }))

  return (
    <AdminMarketingDashboard
      customers={customerRows.map((customer) => {
        const { lastSeenAt, ...nextCustomer } = customer
        void lastSeenAt
        return nextCustomer
      })}
      vendors={vendorRows}
      promoCodes={marketingPromoCodes}
      referrals={marketingReferrals}
      settings={{
        companyName: siteSettings.companyName,
        heroBadge: siteSettings.heroBadge,
        heroTitle: siteSettings.heroTitle,
        heroSubtitle: siteSettings.heroSubtitle,
        heroBackgroundImage: siteSettings.heroBackgroundImage || '',
        heroForegroundImage: siteSettings.heroForegroundImage || '',
        primaryCtaLabel: siteSettings.primaryCtaLabel,
        primaryCtaHref: siteSettings.primaryCtaHref,
        secondaryCtaLabel: siteSettings.secondaryCtaLabel,
        secondaryCtaHref: siteSettings.secondaryCtaHref,
        whatsappNumber: siteSettings.whatsappNumber,
        referralEnabled: siteSettings.referralEnabled,
        referralRewardAmount: siteSettings.referralRewardAmount,
        referralHeadline: siteSettings.referralHeadline,
      }}
      customerOptions={customerOptions}
      stats={stats}
      ordersPerDay={[...ordersPerDayMap.values()]}
      ratingsPerDay={[...ratingsPerDayMap.values()]}
      activityFeed={activityFeed}
      latestUpdate={formatDateTime(now)}
    />
  )
}
