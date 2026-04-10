import { KeyRound, Shield, SlidersHorizontal, Upload } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminBadge, AdminPageHeader, AdminSectionCard, AdminStatCard } from '@/components/admin-ui'

export default async function AdminSettingsPage() {
  await requireAdmin()

  const [vendorCount, supportTicketCount, notificationCount] = await Promise.all([
    prisma.user.count({ where: { isVendor: true } }),
    prisma.supportTicket.count(),
    prisma.notification.count(),
  ])

  const databaseConfigured = Boolean(process.env.DATABASE_URL)
  const mapsConfigured = Boolean(process.env.GOOGLE_MAPS_API_KEY)
  const authConfigured = Boolean(process.env.NEXTAUTH_SECRET)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Settings"
          description="Admin and system settings, platform checks, integrations, and configuration overview."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Admin Controls" value={vendorCount} helper="Managed marketplace entities in scope" icon={Shield} />
            <AdminStatCard label="System Flows" value={supportTicketCount} helper="Operational records touching admin tools" icon={SlidersHorizontal} />
            <AdminStatCard label="Notifications" value={notificationCount} helper="Admin and user notification records" icon={Upload} />
            <AdminStatCard label="Integrations Ready" value={[databaseConfigured, mapsConfigured, authConfigured].filter(Boolean).length} helper="Core system checks currently passing" icon={KeyRound} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title="Admin Settings" description="Core admin access and platform runtime checks.">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Database</p>
                    <p className="text-sm text-slate-500">Primary marketplace storage</p>
                  </div>
                  <AdminBadge label={databaseConfigured ? 'Configured' : 'Missing'} tone={databaseConfigured ? 'green' : 'red'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Admin Auth</p>
                    <p className="text-sm text-slate-500">NextAuth secret and admin session security</p>
                  </div>
                  <AdminBadge label={authConfigured ? 'Ready' : 'Missing'} tone={authConfigured ? 'green' : 'red'} />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="System Settings" description="Platform integrations and service readiness.">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Google Maps</p>
                    <p className="text-sm text-slate-500">Distance-based delivery calculations</p>
                  </div>
                  <AdminBadge label={mapsConfigured ? 'Connected' : 'Not set'} tone={mapsConfigured ? 'green' : 'amber'} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Vendor Assets</p>
                    <p className="text-sm text-slate-500">Upload pipeline for logos, banners, and images</p>
                  </div>
                  <AdminBadge label="Live" tone="blue" />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Configuration Notes" description="Administrative and system settings currently reflected in the platform.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">Vendor priorities and storefront banners</p>
                  <p className="mt-1">Managed from the Vendors department.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">Promo codes and homepage merchandising</p>
                  <p className="mt-1">Managed from Marketing.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">Delivery rules and courier visibility</p>
                  <p className="mt-1">Monitored through Couriers and order operations.</p>
                </div>
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
