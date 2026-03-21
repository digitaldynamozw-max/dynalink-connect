'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, LayoutDashboard, Settings, LogOut, ShoppingCart } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function VendorSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', href: '/vendor/catalog', icon: Package },
    { label: 'Orders', href: '/vendor/orders', icon: ShoppingCart },
    { label: 'Payouts', href: '/vendor/payouts', icon: Package },
    { label: 'Settings', href: '/vendor/settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-6 fixed left-0 top-0">
      {/* Logo/Brand */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Vendor Panel</h2>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 mb-8">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
