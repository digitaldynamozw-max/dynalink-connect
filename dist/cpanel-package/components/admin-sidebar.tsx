'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Bell,
  LogOut,
  Megaphone,
  PhoneCall,
  Route,
  ScanSearch,
  Settings,
  Store,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

type SidebarLink = {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

const departmentLinks: SidebarLink[] = [
  { href: '/admin/couriers', label: 'Courier', icon: Route },
  { href: '/admin/workers', label: 'Workers', icon: UserCog },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/classifier', label: 'Classifier', icon: ScanSearch },
  { href: '/admin/call-center', label: 'Call Center', icon: PhoneCall },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/admin/notifications')
        if (!response.ok) {
          return
        }

        const notifications = (await response.json()) as Array<{ read?: boolean }>
        if (!cancelled) {
          setUnreadCount(notifications.filter((notification) => !notification.read).length)
        }
      } catch (error) {
        console.error('Failed to load admin notifications:', error)
      }
    }

    void loadNotifications()
    const intervalId = window.setInterval(loadNotifications, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  return (
    <aside className="theme-sidebar fixed left-0 top-0 flex min-h-screen w-72 flex-col">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7d7ff]/72">Admin Console</p>
        <p className="mt-2 text-lg font-semibold text-white">Marketplace Control</p>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--brand-highlight)]" />
            <span className="text-sm font-medium text-slate-100">Unread alerts</span>
          </div>
          <span className="min-w-7 rounded-full bg-[var(--brand-accent)] px-2 py-1 text-center text-xs font-semibold text-white">
            {unreadCount}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b7d7ff]/68">
          Departments
        </p>
        <div className="space-y-1">
          {departmentLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-[linear-gradient(135deg,var(--brand-accent),var(--brand-highlight))] text-white shadow-[0_18px_32px_-24px_rgba(79,121,219,0.8)]'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/8 p-4">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
