'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, LayoutDashboard, Settings, LogOut, ShoppingCart, Bell } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function VendorSidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/vendor/notifications')
        if (!response.ok) {
          return
        }

        const notifications = (await response.json()) as Array<{ read?: boolean }>
        if (!cancelled) {
          setUnreadCount(notifications.filter((notification) => !notification.read).length)
        }
      } catch (error) {
        console.error('Failed to load vendor notifications:', error)
      }
    }

    loadNotifications()
    const intervalId = window.setInterval(loadNotifications, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const menuItems = [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', href: '/vendor/catalog', icon: Package },
    { label: 'Orders', href: '/vendor/orders', icon: ShoppingCart },
    { label: 'Payouts', href: '/vendor/payouts', icon: Package },
    { label: 'Settings', href: '/vendor/settings', icon: Settings },
  ]

  return (
    <div className="theme-sidebar fixed left-0 top-0 min-h-screen w-64 p-6">
      {/* Logo/Brand */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Vendor Panel</h2>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--brand-highlight)]" />
            <span className="text-sm font-semibold text-white">Alerts</span>
          </div>
          <span className="min-w-8 rounded-full bg-[var(--brand-accent)] px-2 py-1 text-center text-xs font-bold text-white">
            {unreadCount}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mb-8 space-y-2">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-[linear-gradient(135deg,var(--brand-accent),var(--brand-highlight))] text-white shadow-[0_18px_32px_-24px_rgba(79,121,219,0.8)]'
                  : 'text-gray-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.href === '/vendor/dashboard' && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-[var(--brand-highlight)] px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 pt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-300 transition hover:bg-white/8 hover:text-white"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
