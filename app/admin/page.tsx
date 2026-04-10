'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
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
    href: '/admin/finance',
    title: 'Finance',
    description: 'Revenue, profit, vendor liabilities, payout pipeline, and reporting.',
    icon: CircleDollarSign,
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    href: '/admin/classifier',
    title: 'Classifier',
    description: 'Products and vendor records that still need structure or cleanup.',
    icon: ScanSearch,
    tone: 'from-pink-500 to-rose-400',
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
] as const

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Admin Departments"
          description="A signal-first launchpad for operations, marketplace management, customer service, and growth."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,243,214,0.8),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              <Boxes className="h-3.5 w-3.5" />
              Control Center
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Everything grouped by responsibility</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Each department now acts like its own control surface, so operations, service, catalog, finance, and growth can move faster without sharing one overloaded admin page.
            </p>
          </div>

          <AdminSectionCard
            title="Departments"
            description="Choose the area that matches the work you need to do right now."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {departments.map(({ href, title, description, icon: Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition group-hover:text-slate-950">
                    Open department
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </AdminSectionCard>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Priority Surfaces</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="font-semibold text-white">Live operations</p>
                  <p className="mt-1 text-slate-300">Call Center, Courier, and Workers hold the active service queue.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="font-semibold text-white">Store quality</p>
                  <p className="mt-1 text-slate-300">Vendors, Classifier, and catalog reviews keep storefronts accurate.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="font-semibold text-white">Platform controls</p>
                  <p className="mt-1 text-slate-300">Finance, Marketing, Analytics, and Settings handle cash, growth, and defaults.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation Notes</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>The sidebar is the primary admin navigation.</p>
                <p>Each department owns its own listings, controls, and quick summaries.</p>
                <p>The landing page is now a launchpad instead of another place to manage records.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
