import {
  FlaskConical,
  BarChart3,
  AlertTriangle,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Route,
  Settings,
  Store,
  UserCog,
  Wallet,
  Package,
  Building2,
  Megaphone as CampaignIcon,
  ShieldAlert,
  Truck,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react'
import type { AdminSection } from '@/lib/admin/access'

export type AdminNavLink = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  section: AdminSection
}

export type AdminNavGroup = {
  id: string
  label: string
  description: string
  links: AdminNavLink[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'control',
    label: 'Control',
    description: 'High-level view for owners and management.',
    links: [
      {
        href: '/admin',
        label: 'Command Center',
        description: 'The main dashboard for business owners and managers.',
        icon: LayoutDashboard,
        section: 'operations',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Orders, dispatch, service issues, and day-to-day control.',
    links: [
      {
        href: '/admin/orders',
        label: 'Orders',
        description: 'Live order board, fulfillment progress, and exceptions.',
        icon: Package,
        section: 'operations',
      },
      {
        href: '/admin/vendors',
        label: 'Vendors',
        description: 'Manage vendor onboarding, storefront approvals, balances, and marketplace health.',
        icon: Store,
        section: 'operations',
      },
      {
        href: '/admin/attention-queue',
        label: 'Exception Queue',
        description: 'Escalations, risky orders, and items that need a manager now.',
        icon: AlertTriangle,
        section: 'operations',
      },
      {
        href: '/admin/couriers',
        label: 'Dispatch',
        description: 'Rider coverage, live movement, and assignment control.',
        icon: Route,
        section: 'operations',
      },
      {
        href: '/admin/workers',
        label: 'Staff',
        description: 'Internal staff roles, assignments, and operational coverage.',
        icon: UserCog,
        section: 'workers',
      },
      {
        href: '/admin/incidents',
        label: 'PR & Incidents',
        description: 'Public-facing issues, escalation handling, and issue tracking.',
        icon: ShieldAlert,
        section: 'operations',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Revenue, payouts, reconciliations, and cash controls.',
    links: [
      {
        href: '/admin/finance',
        label: 'Financials',
        description: 'Revenue, margin, liabilities, and owner reporting.',
        icon: Wallet,
        section: 'finance',
      },
      {
        href: '/admin/payments',
        label: 'Payments',
        description: 'PayNow tracking, reconciliation, and payment health.',
        icon: ReceiptText,
        section: 'finance',
      },
      {
        href: '/admin/settlements',
        label: 'Settlements',
        description: 'Vendor settlements, approvals, and resolution queues.',
        icon: Wallet,
        section: 'finance',
      },
      {
        href: '/admin/wallet',
        label: 'Wallet',
        description: 'Customer wallet top-ups, withdrawals, and balance handling.',
        icon: CreditCard,
        section: 'finance',
      },
      {
        href: '/admin/sales',
        label: 'Sales',
        description: 'Detailed sales-range reporting and exports.',
        icon: BarChart3,
        section: 'finance',
      },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Marketing, campaigns, and platform configuration.',
    links: [
      {
        href: '/admin/marketing',
        label: 'Marketing',
        description: 'Promotions, referrals, campaigns, and growth controls.',
        icon: CampaignIcon,
        section: 'marketing',
      },
      {
        href: '/admin/push',
        label: 'PR Broadcasts',
        description: 'Send announcements, alerts, and broadcast updates.',
        icon: Megaphone,
        section: 'marketing',
      },
      {
        href: '/admin/settings#rollout-lab',
        label: 'Rollout Lab',
        description: 'Feature cohorts, rollback presets, and release health.',
        icon: FlaskConical,
        section: 'settings',
      },
      {
        href: '/admin/settings',
        label: 'Settings',
        description: 'System setup, integrations, and operating defaults.',
        icon: Settings,
        section: 'settings',
      },
    ],
  },
]

export const adminNavLinks = adminNavGroups.flatMap((group) => group.links)
