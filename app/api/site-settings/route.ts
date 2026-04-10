import { NextResponse } from 'next/server'
import { ensureSiteSettings, getDefaultSiteSettings, hasSiteSettingsModel } from '@/lib/admin/site-settings'

export async function GET() {
  const settings = hasSiteSettingsModel()
    ? await ensureSiteSettings()
    : getDefaultSiteSettings()

  return NextResponse.json({
    settings: {
      pickupEnabled: settings.pickupEnabled,
      platformFeePerOrder: settings.platformFeePerOrder,
      globalDeliveryEtaMinutes: settings.globalDeliveryEtaMinutes,
      platformOrdersPaused: settings.platformOrdersPaused,
      allStoresTemporarilyClosed: settings.allStoresTemporarilyClosed,
      platformStoreAddress: settings.platformStoreAddress,
      googleMapsEmbedUrl: settings.googleMapsEmbedUrl,
    },
  })
}
