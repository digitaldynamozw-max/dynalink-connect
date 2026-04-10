import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { AdminMarketingDashboard } from '@/components/admin-marketing-dashboard'

export const dynamic = 'force-dynamic'

const HIGH_PRIORITY_THRESHOLD = 8
const CUSTOMER_TABLE_LIMIT = 40
const PROMO_TABLE_LIMIT = 24
const REFERRAL_TABLE_LIMIT = 24

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

function formatDayLabel(date: Date) {
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

  if (!session?.user) redirect('/auth/signin')
  if (role !== 'admin') redirect('/')

  const now = new Date()
  const last30Days = startOfDay(new Date(now))
  last30Days.setDate(last30Days.getDate() - 29)

  const last14Days = startOfDay(new Date(now))
  last14Days.setDate(last14Days.getDate() - 13)

  const [
    siteSettings,
    totalCustomers,
    activeCustomers,
    blacklistedCustomers,
    newCustomers30Days,
    totalVendors,
    verifiedVendors,
    bannerReadyVendors,
    highPriorityVendors,
    promoCodeStatusRaw,
    referralTotals,
    orderWindow,
    reviewWindow,
    customersRaw,
    customerOptionsRaw,
    vendorsRaw,
    recentOrders,
    recentPromoCodes,
    recentReferrals,
    ratingsWindowRaw,
  ] = await Promise.all([
    ensureSiteSettings(),
    prisma.user.count({ where: { role: 'user' } }),
    prisma.user.count({ where: { role: 'user', isActive: true } }),
    prisma.user.count({ where: { role: 'user', isActive: false } }),
    prisma.user.count({ where: { role: 'user', createdAt: { gte: last30Days } } }),
    prisma.user.count({ where: { isVendor: true } }),
    prisma.user.count({ where: { isVendor: true, vendorVerified: true } }),
    prisma.user.count({
      where: { isVendor: true, NOT: [{ storeBannerImage: null }, { storeBannerImage: '' }] },
    }),
    prisma.user.count({
      where: { isVendor: true, vendorPriority: { gte: HIGH_PRIORITY_THRESHOLD } },
    }),
    prisma.promoCode.findMany({
      select: { expiryDate: true, currentUses: true, maxUses: true },
    }),
    prisma.referral.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: last30Days } },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true },
    }),
    prisma.review.aggregate({
      where: { createdAt: { gte: last30Days } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        orders: {
          select: { total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { reviews: true, referralsReceived: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: CUSTOMER_TABLE_LIMIT,
    }),
    prisma.user.findMany({
      where: { role: 'user', isActive: true },
      select: { id: true, email: true, name: true, firstName: true, lastName: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.user.findMany({
      where: { isVendor: true },
      select: {
        id: true,
        email: true,
        vendorName: true,
        vendorCategory: true,
        vendorPriority: true,
        vendorVerified: true,
        storeBannerImage: true,
        products: { select: { averageRating: true, rating: true } },
        _count: { select: { products: true, orderItems: true } },
      },
      orderBy: [{ vendorPriority: 'desc' }, { vendorJoinedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: last14Days } },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.promoCode.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, vendorName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: PROMO_TABLE_LIMIT,
    }),
    prisma.referral.findMany({
      include: {
        referrer: { select: { email: true, name: true, vendorName: true } },
        referred: { select: { email: true, name: true, vendorName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: REFERRAL_TABLE_LIMIT,
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: last14Days } },
      select: { rating: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const customerRows = customersRaw.map((user) => {
    const name =
      user.firstName || user.lastName
        ? [user.firstName, user.lastName].filter(Boolean).join(' ')
        : user.name || user.email
    const totalSpend = user.orders.reduce((sum, order) => sum + order.total, 0)
    const lastOrder = user.orders[0]?.createdAt ?? null
    const lastReview = user.reviews[0]?.createdAt ?? null
    const lastSeen = new Date(
      Math.max(user.updatedAt.getTime(), lastOrder?.getTime() ?? 0, lastReview?.getTime() ?? 0)
    )

    return {
      id: user.id,
      name,
      email: user.email,
      phone: user.mobileNumber || 'Not set',
      joinedAt: formatDateTime(user.createdAt),
      lastSeen: formatDateTime(lastSeen),
      lastOrderAt: formatDateTime(lastOrder),
      orders: user.orders.length,
      totalSpend,
      averageOrder: user.orders.length ? totalSpend / user.orders.length : 0,
      reviews: user._count.reviews,
      referrals: user._count.referralsReceived,
      status: user.isActive ? ('Active' as const) : ('Blacklisted' as const),
    }
  })

  const customerOptions = customerOptionsRaw.map((user) => ({
    id: user.id,
    label:
      user.firstName || user.lastName
        ? [user.firstName, user.lastName].filter(Boolean).join(' ')
        : user.name || user.email,
    secondary: user.email,
  }))

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
      status: vendor.vendorVerified ? ('Verified' as const) : ('Pending' as const),
      products: vendor._count.products,
      orders: vendor._count.orderItems,
      averageRating,
      bannersReady: Boolean(vendor.storeBannerImage),
    }
  })

  const promoCodes = recentPromoCodes.map((promo) => {
    const active = promo.expiryDate > now && promo.currentUses < promo.maxUses

    return {
      id: promo.id,
      code: promo.code,
      discount: promo.discount,
      uses: promo.currentUses,
      maxUses: promo.maxUses,
      expiresAt: formatDateTime(promo.expiryDate),
      owner: promo.user.vendorName || promo.user.name || promo.user.email,
      ownerId: promo.user.id,
      status: active ? ('Active' as const) : ('Inactive' as const),
      description: promo.description || 'Discount code',
      minPurchase: promo.minPurchase,
      createdAt: formatDateTime(promo.createdAt),
    }
  })

  const referrals = recentReferrals.map((referral) => ({
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
    ordersPerDayMap.set(key, { date: key, label: formatDayLabel(day), orders: 0, revenue: 0 })
    ratingsPerDayMap.set(key, { date: key, label: formatDayLabel(day), ratings: 0, average: 0 })
  }

  recentOrders.forEach((order) => {
    const bucket = ordersPerDayMap.get(getDayKey(order.createdAt))
    if (!bucket) return
    bucket.orders += 1
    bucket.revenue += order.total
  })

  ratingsWindowRaw.forEach((review) => {
    const bucket = ratingsPerDayMap.get(getDayKey(review.createdAt))
    if (!bucket) return
    const nextCount = bucket.ratings + 1
    bucket.average = (bucket.average * bucket.ratings + review.rating) / nextCount
    bucket.ratings = nextCount
  })

  const activityFeed = [
    ...recentOrders.slice(0, 5).map((order) => ({
      id: order.id,
      label: `Order from ${order.user.name || order.user.email}`,
      meta: `US$${order.total.toFixed(2)} - ${order.status}`,
      atValue: order.createdAt.getTime(),
      at: formatDateTime(order.createdAt),
    })),
    ...recentPromoCodes.slice(0, 3).map((promo) => ({
      id: promo.id,
      label: `Promo ${promo.code} created for ${promo.user.vendorName || promo.user.name || promo.user.email}`,
      meta: `${promo.discount}% off - max ${promo.maxUses} uses`,
      atValue: promo.createdAt.getTime(),
      at: formatDateTime(promo.createdAt),
    })),
    ...recentReferrals.slice(0, 3).map((referral) => ({
      id: referral.id,
      label: `${referral.referrer.name || referral.referrer.email} referred ${referral.referred.name || referral.referred.email}`,
      meta: `${referral.status} - US$${referral.rewardAmount.toFixed(2)}`,
      atValue: referral.createdAt.getTime(),
      at: formatDateTime(referral.createdAt),
    })),
  ]
    .sort((left, right) => right.atValue - left.atValue)
    .slice(0, 8)
    .map(({ atValue, ...item }) => {
      void atValue
      return item
    })

  const totalPromoCodes = promoCodeStatusRaw.length
  const activePromoCodes = promoCodeStatusRaw.filter(
    (promo) => promo.expiryDate > now && promo.currentUses < promo.maxUses
  ).length
  const completedReferrals = referralTotals.find((item) => item.status === 'completed')?._count._all ?? 0
  const pendingReferrals = referralTotals.find((item) => item.status === 'pending')?._count._all ?? 0
  const totalReferrals = referralTotals.reduce((sum, item) => sum + item._count._all, 0)

  return (
    <AdminMarketingDashboard
      overview={{
        revenue30Days: orderWindow._sum.total ?? 0,
        orders30Days: orderWindow._count._all,
        averageOrderValue: orderWindow._avg.total ?? 0,
        averageRating30Days: reviewWindow._avg.rating ?? 0,
        reviews30Days: reviewWindow._count._all,
        activePromoCodes,
        pendingReferrals,
      }}
      health={{
        totalCustomers,
        activeCustomers,
        blacklistedCustomers,
        newCustomers30Days,
        totalVendors,
        verifiedVendors,
        bannerReadyVendors,
        highPriorityVendors,
        totalPromoCodes,
        totalReferrals,
        completedReferrals,
      }}
      customers={customerRows}
      customerLimit={CUSTOMER_TABLE_LIMIT}
      vendors={vendorRows}
      promoCodes={promoCodes}
      promoLimit={PROMO_TABLE_LIMIT}
      referrals={referrals}
      referralLimit={REFERRAL_TABLE_LIMIT}
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
      ordersPerDay={[...ordersPerDayMap.values()]}
      ratingsPerDay={[...ratingsPerDayMap.values()]}
      activityFeed={activityFeed}
      latestUpdate={formatDateTime(now)}
    />
  )
}
