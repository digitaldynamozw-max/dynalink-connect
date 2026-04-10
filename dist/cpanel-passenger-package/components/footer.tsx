'use client'

import Link from 'next/link'
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Heart,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      return
    }

    setSubscribed(true)
    setEmail('')
    window.setTimeout(() => setSubscribed(false), 3000)
  }

  return (
    <footer className="relative mt-10 overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(8,13,20,0.92),rgba(14,20,31,0.82))] text-white backdrop-blur-2xl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-[var(--brand-highlight)] opacity-18 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-[var(--brand-accent)] opacity-16 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/14" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr] lg:px-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[linear-gradient(135deg,var(--brand-accent),var(--brand-highlight))] p-1.5">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <h2 className="bg-[linear-gradient(90deg,#ffffff,#b7d7ff_52%,#9ce6ff)] bg-clip-text text-base font-bold text-transparent">
                DynaLink Connect
              </h2>
            </div>
            <p className="max-w-xs text-xs leading-5 text-slate-300">
              Fast shopping, verified vendors, and reliable delivery in one place.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="h-3 w-1 rounded bg-[linear-gradient(180deg,var(--brand-highlight),#d8eeff)]" />
              <span>Explore</span>
            </h3>
            <ul className="space-y-1.5">
              {[
                { label: 'Products', href: '/products' },
                { label: 'Vendors', href: '/vendors' },
                { label: 'Orders', href: '/orders' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-slate-300 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="h-3 w-1 rounded bg-[linear-gradient(180deg,var(--brand-accent),#dbe7ff)]" />
              <span>Support</span>
            </h3>
            <ul className="space-y-1.5">
              {[
                { label: 'Help Center', href: '/help-center' },
                { label: 'Contact Us', href: '/contact-us' },
                { label: 'Shipping Info', href: '/shipping-info' },
                { label: 'Returns', href: '/returns' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-slate-300 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="h-3 w-1 rounded bg-[linear-gradient(180deg,var(--brand-highlight),var(--brand-accent))]" />
              <span>Newsletter</span>
            </h3>
            <p className="text-[11px] text-slate-300">Offers and updates.</p>
            <form onSubmit={handleSubscribe} className="space-y-1.5">
              <div className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-l border border-white/14 bg-white/8 px-2.5 py-1.5 text-xs text-white placeholder-slate-400 backdrop-blur focus:border-[var(--brand-highlight)] focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="rounded-r bg-[linear-gradient(135deg,var(--brand-accent),var(--brand-highlight))] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_28px_-22px_rgba(79,121,219,0.7)] transition hover:brightness-105"
                >
                  {subscribed ? 'OK' : 'Go'}
                </button>
              </div>
              {subscribed && (
                <p className="text-[11px] text-green-400">Thanks for subscribing!</p>
              )}
            </form>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[var(--brand-highlight)]" />
                +263719968771
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#dbe7ff]" />
                support@dynalinkconnect.co.zw
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                2 Giraffe Cres, Borrowdale West
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[
                { icon: Facebook, label: 'Facebook', color: 'hover:text-[var(--brand-highlight)]' },
                { icon: Twitter, label: 'Twitter', color: 'hover:text-[var(--brand-highlight)]' },
                { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-[#dbe7ff]' },
                { icon: Instagram, label: 'Instagram', color: 'hover:text-[var(--brand-accent)]' },
              ].map(({ icon: Icon, label, color }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className={`rounded-lg border border-white/10 bg-white/8 p-1.5 text-slate-300 backdrop-blur transition ${color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-[11px] text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>
              Copyright 2026 DynaLink Connect. All rights reserved with{' '}
              <Heart className="inline h-3 w-3 text-red-500" />
            </p>
            <div className="flex items-center gap-3">
              <Link href="#" className="transition hover:text-white">
                Privacy
              </Link>
              <Link href="#" className="transition hover:text-white">
                Terms
              </Link>
              <Link href="#" className="transition hover:text-white">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
