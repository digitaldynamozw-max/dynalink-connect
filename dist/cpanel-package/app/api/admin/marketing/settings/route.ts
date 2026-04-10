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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role

    if (!session?.user?.id || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasSiteSettingsModel()) {
      return NextResponse.json(
        {
          error: 'Site settings are not available yet. Run the Prisma migration/client update first.',
          settings: getDefaultSiteSettings(),
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const current = await ensureSiteSettings()

    const companyName = normalizeOptionalString(body.companyName)
    const heroBadge = normalizeOptionalString(body.heroBadge)
    const heroTitle = normalizeOptionalString(body.heroTitle)
    const heroSubtitle = normalizeOptionalString(body.heroSubtitle)
    const heroBackgroundImage = normalizeOptionalString(body.heroBackgroundImage)
    const heroForegroundImage = normalizeOptionalString(body.heroForegroundImage)
    const primaryCtaLabel = normalizeOptionalString(body.primaryCtaLabel)
    const primaryCtaHref = normalizeOptionalString(body.primaryCtaHref)
    const secondaryCtaLabel = normalizeOptionalString(body.secondaryCtaLabel)
    const secondaryCtaHref = normalizeOptionalString(body.secondaryCtaHref)
    const whatsappNumber = normalizeOptionalString(body.whatsappNumber)
    const referralHeadline = normalizeOptionalString(body.referralHeadline)
    const referralRewardAmount =
      body.referralRewardAmount === undefined || body.referralRewardAmount === null || body.referralRewardAmount === ''
        ? undefined
        : Number(body.referralRewardAmount)

    if (referralRewardAmount !== undefined && (!Number.isFinite(referralRewardAmount) || referralRewardAmount < 0)) {
      return NextResponse.json({ error: 'Referral reward amount must be 0 or higher' }, { status: 400 })
    }

    const updated = await prisma.siteSettings.update({
      where: { id: current.id },
      data: {
        ...(companyName !== undefined ? { companyName: companyName || 'DynaLink Connect' } : {}),
        ...(heroBadge !== undefined ? { heroBadge: heroBadge || 'Company Marketplace' } : {}),
        ...(heroTitle !== undefined ? { heroTitle: heroTitle || 'Welcome to DynaLink Connect' } : {}),
        ...(heroSubtitle !== undefined
          ? {
              heroSubtitle:
                heroSubtitle || 'Fast, reliable delivery from your favorite vendors. Shop everything you need in one place.',
            }
          : {}),
        ...(heroBackgroundImage !== undefined ? { heroBackgroundImage: heroBackgroundImage || null } : {}),
        ...(heroForegroundImage !== undefined ? { heroForegroundImage: heroForegroundImage || null } : {}),
        ...(primaryCtaLabel !== undefined ? { primaryCtaLabel: primaryCtaLabel || 'Shop Now' } : {}),
        ...(primaryCtaHref !== undefined ? { primaryCtaHref: primaryCtaHref || '/products' } : {}),
        ...(secondaryCtaLabel !== undefined ? { secondaryCtaLabel: secondaryCtaLabel || 'Become a Vendor' } : {}),
        ...(secondaryCtaHref !== undefined ? { secondaryCtaHref: secondaryCtaHref || '/vendor/register' } : {}),
        ...(whatsappNumber !== undefined ? { whatsappNumber: whatsappNumber || '1234567890' } : {}),
        ...(typeof body.referralEnabled === 'boolean' ? { referralEnabled: body.referralEnabled } : {}),
        ...(referralHeadline !== undefined
          ? { referralHeadline: referralHeadline || 'Referral program is active' }
          : {}),
        ...(referralRewardAmount !== undefined ? { referralRewardAmount } : {}),
      },
    })

    return NextResponse.json({ success: true, settings: updated })
  } catch (error) {
    console.error('Admin marketing settings update error:', error)
    return NextResponse.json({ error: 'Failed to update marketing settings' }, { status: 500 })
  }
}
