'use client'

import {
  BarChart3,
  Boxes,
  Megaphone,
  PhoneCall,
  Route,
  ScanSearch,
  Settings,
  Store,
  UserCog,
} from 'lucide-react'
import { AdminPageHeader, AdminSectionCard } from '@/components/admin-ui'

const departments = [
  {
    href: '/admin/couriers',
    title: 'Courier',
    description: 'Riders, dispatch movement, trip progress, and delivery visibility.',
    icon: Route,
    tone: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/admin/workers',
    title: 'Workers',
    description: 'Our staff roster, internal roles, and day-to-day workload visibility.',
    icon: UserCog,
    tone: 'from-orange-500 to-amber-500',
  },
  {
    href: '/admin/vendors',
    title: 'Vendors',
    description: 'Store onboarding, balances, priority, and listing assets.',
    icon: Store,
    tone: 'from-red-500 to-rose-500',
  },
  {
    href: '/admin/classifier',
    title: 'Classifier',
    description: 'Products and vendor records that still need structure or cleanup.',
    icon: ScanSearch,
    tone: 'from-fuchsia-500 to-pink-500',
  },
  {
    href: '/admin/call-center',
    title: 'Call Center',
    description: 'Order control, follow-up queues, and customer communication context.',
    icon: PhoneCall,
    tone: 'from-violet-500 to-indigo-500',
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    description: 'Admin and system settings, integrations, and operational configuration.',
    icon: Settings,
    tone: 'from-emerald-500 to-green-500',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Reports, charts, graphs, and marketplace performance trends.',
    icon: BarChart3,
    tone: 'from-sky-500 to-blue-500',
  },
  {
    href: '/admin/marketing',
    title: 'Marketing',
    description: 'Customers, banners, vendors, referrals, and promotions.',
    icon: Megaphone,
    tone: 'from-yellow-500 to-amber-400',
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Admin Departments"
          description="A compact control center for operations, marketplace management, customer service, and growth."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <AdminSectionCard
            title="Departments"
            description="Department overview mirrored in the sidebar navigation."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
              {departments.map(({ href, title, description, icon: Icon, tone }) => (
                <div
                  key={href}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
                </div>
              ))}
            </div>
          </AdminSectionCard>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                <Boxes className="h-3.5 w-3.5" />
                Department Flow
              </div>
              <h2 className="mt-4 text-xl font-semibold">Everything grouped by role and function</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Operations, catalog, customer support, analytics, and system control now live as separate admin departments so teams can work faster without digging through unrelated pages.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>The sidebar is now the primary admin navigation.</p>
                <p>Each department owns its own tools and views.</p>
                <p>Vendors stay inside the Vendors department.</p>
                <p>Cross-page shortcuts and embedded hyperlinks have been removed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
