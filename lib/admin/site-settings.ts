import { prisma } from '@/lib/prisma'

export const SITE_SETTINGS_ID = 'global'
const REQUIRED_SITE_SETTINGS_COLUMNS = [
  'platformOrdersPaused',
  'allStoresTemporarilyClosed',
  'pickupEnabled',
  'platformFeePerOrder',
  'globalDeliveryEtaMinutes',
  'googleMapsEmbedUrl',
  'platformStoreAddress',
] as const

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
  platformOrdersPaused: boolean
  allStoresTemporarilyClosed: boolean
  pickupEnabled: boolean
  platformFeePerOrder: number
  globalDeliveryEtaMinutes: number
  googleMapsEmbedUrl: string | null
  platformStoreAddress: string | null
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
    platformOrdersPaused: false,
    allStoresTemporarilyClosed: false,
    pickupEnabled: true,
    platformFeePerOrder: 1,
    globalDeliveryEtaMinutes: 120,
    googleMapsEmbedUrl: null,
    platformStoreAddress: process.env.PLATFORM_STORE_ADDRESS || 'DynaLink Connect',
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

let warnedAboutLegacySiteSettingsSchema = false

async function hasCompleteSiteSettingsSchema() {
  try {
    const databaseUrl = process.env.DATABASE_URL ?? ''

    if (databaseUrl.startsWith('file:')) {
      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "PRAGMA table_info('SiteSettings')"
      )

      const columnNames = new Set(columns.map((column) => column.name))
      return REQUIRED_SITE_SETTINGS_COLUMNS.every((column) => columnNames.has(column))
    }

    return true
  } catch {
    return false
  }
}

export async function ensureSiteSettings(): Promise<SiteSettingsShape> {
  const delegate = getSiteSettingsDelegate()
  if (!delegate || typeof delegate.upsert !== 'function') {
    return getDefaultSiteSettings()
  }

  const hasCompleteSchema = await hasCompleteSiteSettingsSchema()
  if (!hasCompleteSchema) {
    if (!warnedAboutLegacySiteSettingsSchema) {
      warnedAboutLegacySiteSettingsSchema = true
      console.warn('Using default site settings because the local SiteSettings table is missing newer columns.')
    }

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
    if (!warnedAboutLegacySiteSettingsSchema) {
      warnedAboutLegacySiteSettingsSchema = true
      console.warn('Using default site settings because the database schema is out of sync.')
    }
    return getDefaultSiteSettings()
  }
}
