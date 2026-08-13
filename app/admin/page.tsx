'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Megaphone,
  ShieldAlert,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Wallet,
} from 'lucide-react'
import { AdminPageHeader, AdminSectionCard } from '@/components/admin-ui'

const departments = [
  {
    href: '/admin/orders',
    title: 'Operations',
    description: 'Orders, fulfillment, exceptions, dispatch, and service continuity.',
    icon: ShoppingCart,
    tone: 'from-slate-900 to-slate-700',
  },
  {
    href: '/admin/vendors',
    title: 'Vendors',
    description: 'Manage vendor onboarding, storefront approvals, and marketplace health.',
    icon: Store,
    tone: 'from-emerald-600 to-lime-500',
  },
  {
    href: '/admin/couriers',
    title: 'Drivers',
    description: 'Onboarding, availability, live movement, and performance control.',
    icon: Truck,
    tone: 'from-blue-600 to-cyan-500',
  },
  {
    href: '/admin/workers',
    title: 'Staff',
    description: 'Internal team roles, work queues, and operational coverage.',
    icon: UserCog,
    tone: 'from-orange-600 to-amber-500',
  },
  {
    href: '/admin/finance',
    title: 'Financials',
    description: 'Revenue, liabilities, payouts, reconciliation, and cash oversight.',
    icon: Wallet,
    tone: 'from-emerald-600 to-teal-500',
  },
  {
    href: '/admin/marketing',
    title: 'Marketing',
    description: 'Campaigns, promos, announcements, and customer growth actions.',
    icon: Megaphone,
    tone: 'from-fuchsia-600 to-rose-500',
  },
  {
    href: '/admin/incidents',
    title: 'PR & Incidents',
    description: 'Escalations, public issues, and trust-sensitive follow-up.',
    icon: ShieldAlert,
    tone: 'from-rose-600 to-red-500',
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    description: 'Platform defaults, integrations, and operational configuration.',
    icon: Building2,
    tone: 'from-slate-700 to-slate-500',
  },
] as const

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Admin Command Center"
          description="Business owners and managers control operations, dispatch, finance, marketing, and escalation handling from here."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="rounded-[1.15rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Operations, dispatch, finance, marketing, and escalation control
                </h2>
              </div>
            </div>
          </div>

          <AdminSectionCard title="Modules">
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
                    Open module
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
