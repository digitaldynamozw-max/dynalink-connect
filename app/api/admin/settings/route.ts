import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureSiteSettings, getDefaultSiteSettings, hasSiteSettingsModel } from '@/lib/admin/site-settings'
import { prisma } from '@/lib/prisma'

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : ''
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : Number.NaN
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  const role = (session?.user as { role?: string } | undefined)?.role
  return Boolean(session?.user?.id && role === 'admin')
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasSiteSettingsModel()) {
    return NextResponse.json({ settings: getDefaultSiteSettings() })
  }

  const settings = await ensureSiteSettings()
  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasSiteSettingsModel()) {
      return NextResponse.json(
        { error: 'Site settings are not available yet. Run the Prisma migration/client update first.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const current = await ensureSiteSettings()
    const platformFeePerOrder = normalizeOptionalNumber(body.platformFeePerOrder)
    const globalDeliveryEtaMinutes = normalizeOptionalNumber(body.globalDeliveryEtaMinutes)
    const referralRewardAmount = normalizeOptionalNumber(body.referralRewardAmount)

    if (platformFeePerOrder !== undefined && (!Number.isFinite(platformFeePerOrder) || platformFeePerOrder < 0)) {
      return NextResponse.json({ error: 'Platform fee must be 0 or higher' }, { status: 400 })
    }

    if (
      globalDeliveryEtaMinutes !== undefined &&
      (!Number.isFinite(globalDeliveryEtaMinutes) || globalDeliveryEtaMinutes < 0)
    ) {
      return NextResponse.json({ error: 'Global delivery time must be 0 or higher' }, { status: 400 })
    }

    if (referralRewardAmount !== undefined && (!Number.isFinite(referralRewardAmount) || referralRewardAmount < 0)) {
      return NextResponse.json({ error: 'Referral reward must be 0 or higher' }, { status: 400 })
    }

    const updated = await prisma.siteSettings.update({
      where: { id: current.id },
      data: {
        ...(normalizeRequiredString(body.companyName) ? { companyName: normalizeRequiredString(body.companyName) } : {}),
        ...(normalizeRequiredString(body.heroBadge) ? { heroBadge: normalizeRequiredString(body.heroBadge) } : {}),
        ...(normalizeRequiredString(body.heroTitle) ? { heroTitle: normalizeRequiredString(body.heroTitle) } : {}),
        ...(normalizeRequiredString(body.heroSubtitle) ? { heroSubtitle: normalizeRequiredString(body.heroSubtitle) } : {}),
        ...(normalizeRequiredString(body.primaryCtaLabel) ? { primaryCtaLabel: normalizeRequiredString(body.primaryCtaLabel) } : {}),
        ...(normalizeRequiredString(body.primaryCtaHref) ? { primaryCtaHref: normalizeRequiredString(body.primaryCtaHref) } : {}),
        ...(normalizeRequiredString(body.secondaryCtaLabel) ? { secondaryCtaLabel: normalizeRequiredString(body.secondaryCtaLabel) } : {}),
        ...(normalizeRequiredString(body.secondaryCtaHref) ? { secondaryCtaHref: normalizeRequiredString(body.secondaryCtaHref) } : {}),
        ...(normalizeRequiredString(body.whatsappNumber) ? { whatsappNumber: normalizeRequiredString(body.whatsappNumber) } : {}),
        ...(typeof body.referralEnabled === 'boolean' ? { referralEnabled: body.referralEnabled } : {}),
        ...(referralRewardAmount !== undefined ? { referralRewardAmount } : {}),
        ...(normalizeRequiredString(body.referralHeadline) ? { referralHeadline: normalizeRequiredString(body.referralHeadline) } : {}),
        ...(typeof body.platformOrdersPaused === 'boolean'
          ? { platformOrdersPaused: body.platformOrdersPaused }
          : {}),
        ...(typeof body.allStoresTemporarilyClosed === 'boolean'
          ? { allStoresTemporarilyClosed: body.allStoresTemporarilyClosed }
          : {}),
        ...(typeof body.pickupEnabled === 'boolean' ? { pickupEnabled: body.pickupEnabled } : {}),
        ...(platformFeePerOrder !== undefined ? { platformFeePerOrder } : {}),
        ...(globalDeliveryEtaMinutes !== undefined
          ? { globalDeliveryEtaMinutes: Math.round(globalDeliveryEtaMinutes) }
          : {}),
        ...(normalizeOptionalString(body.googleMapsEmbedUrl) !== undefined
          ? { googleMapsEmbedUrl: normalizeOptionalString(body.googleMapsEmbedUrl) || null }
          : {}),
        ...(normalizeOptionalString(body.platformStoreAddress) !== undefined
          ? {
              platformStoreAddress:
                normalizeOptionalString(body.platformStoreAddress) ||
                process.env.PLATFORM_STORE_ADDRESS ||
                'DynaLink Connect',
            }
          : {}),
      },
    })

    return NextResponse.json({ success: true, settings: updated })
  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json({ error: 'Failed to update admin settings' }, { status: 500 })
  }
}
