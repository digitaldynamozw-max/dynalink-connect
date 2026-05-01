import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

export type DevicePushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
  badge?: string
  sound?: 'default' | null
  priority?: 'default' | 'high'
  channelId?: string
  data?: Record<string, string | number | boolean | null>
}

type PushAudienceTarget = 'all' | 'admins' | 'vendors' | 'couriers' | 'customers' | 'guests'

type SubscriptionWriteInput = {
  endpoint: string
  p256dh: string
  auth: string
  userId?: string | null
  role?: string | null
  visitorId?: string | null
  userAgent?: string | null
  lastKnownPath?: string | null
}

let webPushConfigured = false

function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()

  if (!publicKey || !privateKey || !subject) {
    return null
  }

  return { publicKey, privateKey, subject }
}

function ensureWebPushConfigured() {
  const config = getWebPushConfig()
  if (!config) {
    return null
  }

  if (!webPushConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
    webPushConfigured = true
  }

  return config
}

function resolveAudience(role?: string | null, userId?: string | null) {
  if (!userId) {
    return 'guest'
  }

  if (role === 'admin' || role === 'vendor' || role === 'courier') {
    return role
  }

  return 'user'
}

function buildPushBody(payload: DevicePushPayload) {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'dynalink-general',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    channelId: payload.channelId || 'orders',
    data: payload.data || {},
  })
}

async function sendToStoredSubscriptions(
  subscriptions: Array<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
  }>,
  payload: DevicePushPayload
) {
  if (!subscriptions.length) {
    return
  }

  const body = buildPushBody(payload)
  const webPushConfig = ensureWebPushConfigured()

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        if (isExpoPushToken(subscription.endpoint)) {
          await sendExpoPush(subscription, payload)
        } else if (webPushConfig) {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            body
          )
        } else {
          return
        }

        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: {
            isActive: true,
            lastSentAt: new Date(),
            lastErrorAt: null,
            lastErrorMessage: null,
          },
        })
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : undefined

        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: {
            isActive: statusCode === 404 || statusCode === 410 ? false : true,
            lastErrorAt: new Date(),
            lastErrorMessage: error instanceof Error ? error.message : 'Push delivery failed',
          },
        })
      }
    })
  )
}

function isExpoPushToken(value: string) {
  return /^ExponentPushToken\[[^\]]+\]$/.test(value) || /^ExpoPushToken\[[^\]]+\]$/.test(value)
}

async function sendExpoPush(
  subscription: {
    id: string
    endpoint: string
  },
  payload: DevicePushPayload
) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: subscription.endpoint,
      title: payload.title,
      body: payload.body,
      sound: payload.sound === null ? null : payload.sound || 'default',
      priority: payload.priority === 'high' ? 'high' : 'default',
      channelId: payload.channelId || 'orders',
      data: {
        url: payload.url || '/',
        tag: payload.tag || 'dynalink-general',
        ...(payload.data || {}),
      },
    }),
  })

  const result = (await response.json().catch(() => null)) as {
    data?: {
      status?: string
      message?: string
      details?: {
        error?: string
      }
    }
  } | null

  if (!response.ok || result?.data?.status === 'error') {
    const error = result?.data?.details?.error || result?.data?.message || `Expo push failed with ${response.status}`

    if (error === 'DeviceNotRegistered') {
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          isActive: false,
          lastErrorAt: new Date(),
          lastErrorMessage: error,
        },
      })
      return
    }

    throw new Error(error)
  }
}

export function isWebPushConfigured() {
  return Boolean(getWebPushConfig())
}

export function getWebPushPublicKey() {
  return getWebPushConfig()?.publicKey ?? null
}

export async function upsertPushSubscription(input: SubscriptionWriteInput) {
  const audience = resolveAudience(input.role, input.userId)

  return prisma.pushSubscription.upsert({
    where: {
      endpoint: input.endpoint,
    },
    create: {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userId: input.userId || null,
      visitorId: input.visitorId || null,
      audience,
      userAgent: input.userAgent || null,
      lastKnownPath: input.lastKnownPath || null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      p256dh: input.p256dh,
      auth: input.auth,
      userId: input.userId || null,
      visitorId: input.visitorId || null,
      audience,
      userAgent: input.userAgent || null,
      lastKnownPath: input.lastKnownPath || null,
      isActive: true,
      lastSeenAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  })
}

export async function deactivatePushSubscription(endpoint: string) {
  if (!endpoint.trim()) {
    return
  }

  await prisma.pushSubscription.updateMany({
    where: {
      endpoint,
    },
    data: {
      isActive: false,
      lastErrorAt: new Date(),
      lastErrorMessage: 'Subscription deactivated by client',
    },
  })
}

export async function sendPushToUser(userId: string, payload: DevicePushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  })

  await sendToStoredSubscriptions(subscriptions, payload)
}

export async function sendPushToAdmins(payload: DevicePushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      isActive: true,
      user: {
        is: {
          role: 'admin',
        },
      },
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  })

  await sendToStoredSubscriptions(subscriptions, payload)
}

export async function sendPushToCouriers(payload: DevicePushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      isActive: true,
      user: {
        is: {
          role: 'courier',
        },
      },
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  })

  await sendToStoredSubscriptions(subscriptions, payload)
}

export async function sendPushBroadcast(target: PushAudienceTarget, payload: DevicePushPayload) {
  const where =
    target === 'all'
      ? { isActive: true }
      : target === 'guests'
        ? { isActive: true, userId: null }
        : target === 'customers'
          ? {
              isActive: true,
              user: {
                is: {
                  role: 'user',
                },
              },
            }
          : {
              isActive: true,
              user: {
                is: {
                  role: target.slice(0, -1),
                },
              },
            }

  const subscriptions = await prisma.pushSubscription.findMany({
    where,
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  })

  await sendToStoredSubscriptions(subscriptions, payload)

  return subscriptions.length
}
