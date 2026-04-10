'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Heart, LogOut, Menu, Search, ShoppingBag, SlidersHorizontal, User } from 'lucide-react'
import Image from 'next/image'
import { useCartStore } from '@/lib/store'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()
  const { items } = useCartStore()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isVendor = role === 'vendor'
  const isAdmin = role === 'admin'
  const isCourier = role === 'courier'

  return (
    <nav className="theme-nav sticky top-0 z-50 shadow-[0_12px_34px_-28px_rgba(24,34,43,0.55)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[4.75rem] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/"
              className="flex shrink-0 items-center rounded-2xl bg-[var(--brand-ink)] px-3 py-2 shadow-[0_16px_34px_-20px_rgba(24,34,43,0.85)] ring-1 ring-white/10"
            >
              <Image
                src="/logo.png"
                alt="DynaLink Connect logo"
                className="h-11 w-auto object-contain"
                width={180}
                height={60}
                priority
                quality={95}
              />
            </Link>
          </div>

          <div className="hidden items-center gap-6 lg:flex">
            <Link href="/vendors" className="text-sm font-medium text-white/82 transition hover:text-white">
              Stores
            </Link>
            <Link href="/products" className="text-sm font-medium text-white/82 transition hover:text-white">
              Marketplace
            </Link>
            <Link href="/orders" className="text-sm font-medium text-white/82 transition hover:text-white">
              Orders
            </Link>
            {session && (
              <>
                {isVendor && (
                  <Link href="/vendor/dashboard" className="text-sm font-semibold text-[#9ce6ff] transition hover:text-white">
                    My Store
                  </Link>
                )}
                {isCourier && (
                  <Link href="/courier/dashboard" className="text-sm font-semibold text-[#9ce6ff] transition hover:text-white">
                    Courier Hub
                  </Link>
                )}
                <Link href="/profile" className="text-sm font-medium text-white/82 transition hover:text-white">
                  My Account
                </Link>
                {isAdmin && (
                  <Link href="/admin/dashboard" className="text-sm font-semibold text-[#b9ccff] transition hover:text-white">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10 hover:text-white md:inline-flex"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10 hover:text-white md:inline-flex"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10 hover:text-white md:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </button>
            <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/88 transition hover:bg-white/10 hover:text-white">
              <ShoppingBag className="h-5 w-5" aria-label="View Cart" />
              <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[11px] text-white">
                {items.length}
              </span>
            </Link>
            {session ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-right md:block">
                  <p className="text-xs font-semibold text-white">{session.user?.name}</p>
                  <p className="text-[11px] text-white/55">Signed in</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10 hover:text-white"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.1))]"
                title="Sign In"
              >
                <User className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 py-4 md:hidden">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm font-medium text-white">
                <Link href="/vendors" className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-xl">Stores</Link>
                <Link href="/products" className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-xl">Marketplace</Link>
                <Link href="/orders" className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-xl">Orders</Link>
                <Link href="/profile" className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-xl">Account</Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
