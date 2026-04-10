'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CircleHelp, Gift, Home, LifeBuoy, Menu, Sparkles, User2, Users2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

const profileLinks = [
  { href: '/profile', label: 'Overview', helper: 'Profile, password, delivery details', icon: Home },
  { href: '/profile/notifications', label: 'Notifications', helper: 'Delivery channels and updates', icon: Bell },
  { href: '/profile/promocodes', label: 'Promo Codes', helper: 'Discounts and savings', icon: Gift },
  { href: '/profile/invite-friends', label: 'Invite Friends', helper: 'Referrals and rewards', icon: Users2 },
  { href: '/profile/support', label: 'Support', helper: 'Tickets, FAQs, help', icon: LifeBuoy },
  { href: '/profile/about', label: 'About', helper: 'Marketplace story and values', icon: CircleHelp },
]

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const activeItem = useMemo(
    () =>
      profileLinks.find((item) => (item.href === '/profile' ? pathname === '/profile' : pathname.startsWith(item.href))) ||
      profileLinks[0],
    [pathname]
  )

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <button
          onClick={() => setSidebarOpen((current) => !current)}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-slate-950 p-3 text-white shadow-xl md:hidden"
          aria-label={sidebarOpen ? 'Close profile menu' : 'Open profile menu'}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close profile menu overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/35 md:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-x-4 top-24 z-40 rounded-[1.5rem] border border-amber-100 bg-white/95 p-4 shadow-2xl transition-all duration-300 md:sticky md:top-24 md:block md:w-72 md:self-start md:shadow-sm ${
            sidebarOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100'
          }`}
        >
          <div className="rounded-[1.25rem] bg-[linear-gradient(135deg,#0f172a,#1e293b,#334155)] p-4 text-white">
            <div className="inline-flex rounded-full bg-white/10 p-2.5">
              <User2 className="h-4 w-4" />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">My Account</p>
            <h2 className="mt-1.5 text-xl font-black">Control Center</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">
              Rewards, settings, delivery details, and support in one cleaner space.
            </p>
          </div>

          <nav className="mt-4 space-y-1.5">
            {profileLinks.map((link) => {
              const Icon = link.icon
              const active = activeItem.href === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-start gap-2.5 rounded-[1.05rem] px-3 py-2.5 transition ${
                    active
                      ? 'bg-orange-50 text-slate-950 ring-1 ring-orange-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`mt-0.5 rounded-xl p-2 ${active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5">{link.label}</p>
                    <p className="text-[11px] leading-4 text-slate-500">{link.helper}</p>
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 rounded-[1.15rem] border border-amber-100 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold">Now redesigned</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
              Your whole account area now shares one updated UI system instead of separate page styles.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
