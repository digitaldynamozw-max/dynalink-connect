'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, TrendingUp, FileDown, Store, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/clients', label: 'Clients', icon: Users },
    { href: '/admin/sales', label: 'Sales Report', icon: TrendingUp },
    { href: '/admin/products', label: 'Products', icon: FileDown },
    { href: '/admin/vendors', label: 'Vendors', icon: Store }
  ]

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 pt-20">
      <nav className="p-4 space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive(href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </nav>
    </aside>
  )
}
