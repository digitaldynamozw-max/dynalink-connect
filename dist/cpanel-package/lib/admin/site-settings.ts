import { prisma } from '@/lib/prisma'

export const SITE_SETTINGS_ID = 'global'

export type SiteSettingsShape = {
  id: string
  companyName: string
  heroBadge: string
  heroTitle: string
  heroSubtitle: string
  heroBackgroundImage: string | null
  heroForegroundImage: string | null
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
  whatsappNumber: string
  referralEnabled: boolean
  referralRewardAmount: number
  referralHeadline: string
  createdAt: Date
  updatedAt: Date
}

export function getDefaultSiteSettings(): SiteSettingsShape {
  const now = new Date()

  return {
    id: SITE_SETTINGS_ID,
    companyName: 'DynaLink Connect',
    heroBadge: 'Company Marketplace',
    heroTitle: 'Welcome to DynaLink Connect',
    heroSubtitle: 'Discover trusted vendors, featured storefronts, and fast delivery from one connected marketplace.',
    heroBackgroundImage: null,
    heroForegroundImage: null,
    primaryCtaLabel: 'Explore Vendors',
    primaryCtaHref: '/vendors',
    secondaryCtaLabel: 'Become a Vendor',
    secondaryCtaHref: '/vendor/register',
    whatsappNumber: '1234567890',
    referralEnabled: true,
    referralRewardAmount: 25,
    referralHeadline: 'Referral program is active',
    createdAt: now,
    updatedAt: now,
  }
}

function getSiteSettingsDelegate() {
  const prismaWithOptionalSiteSettings = prisma as typeof prisma & {
    siteSettings?: {
      upsert: (args: unknown) => Promise<SiteSettingsShape>
      update: (args: unknown) => Promise<SiteSettingsShape>
    }
  }

  return prismaWithOptionalSiteSettings.siteSettings
}

export function hasSiteSettingsModel() {
  const delegate = getSiteSettingsDelegate()
  return Boolean(delegate && typeof delegate.upsert === 'function')
}

export async function ensureSiteSettings(): Promise<SiteSettingsShape> {
  const delegate = getSiteSettingsDelegate()
  if (!delegate || typeof delegate.upsert !== 'function') {
    return getDefaultSiteSettings()
  }

  try {
    return await delegate.upsert({
      where: { id: SITE_SETTINGS_ID },
      update: {},
      create: {
        id: SITE_SETTINGS_ID,
      },
    })
  } catch (error) {
    console.error('Falling back to default site settings:', error)
    return getDefaultSiteSettings()
  }
}
