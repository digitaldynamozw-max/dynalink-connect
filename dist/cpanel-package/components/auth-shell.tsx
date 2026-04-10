'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft, ShieldCheck } from 'lucide-react'

type AuthShellProps = {
  title: string
  subtitle: string
  kicker: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ title, subtitle, kicker, children, footer }: AuthShellProps) {
  return (
    <div className="theme-app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
        <div className="mb-6 lg:mb-0 lg:flex-1">
          <div className="theme-hero overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_30px_80px_-38px_rgba(15,23,34,0.75)] sm:p-8 lg:min-h-[38rem] lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/12"
              >
                <ChevronLeft className="h-4 w-4" />
                Back home
              </Link>
              <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78 backdrop-blur-xl">
                {kicker}
              </div>
            </div>

            <div className="mt-12 max-w-xl">
              <div className="inline-flex rounded-[1.5rem] border border-white/10 bg-[rgba(8,13,20,0.58)] px-4 py-3 shadow-[0_20px_44px_-28px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                <Image
                  src="/logo.png"
                  alt="DynaLink Connect logo"
                  width={200}
                  height={64}
                  className="h-12 w-auto object-contain"
                  priority
                />
              </div>

              <h1 className="mt-8 text-4xl font-black leading-tight text-white sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/72 sm:text-base">
                {subtitle}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ce6ff]">
                    Unified Marketplace
                  </p>
                  <p className="mt-2 text-sm text-white/78">
                    One storefront, one delivery network, and one account across the whole experience.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-2xl">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b7d7ff]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Protected Access
                  </div>
                  <p className="mt-2 text-sm text-white/78">
                    Accounts stay tied into admin, vendor, courier, and customer flows without a separate login system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-[30rem] lg:flex-shrink-0">
          <div className="theme-panel-strong rounded-[2rem] p-5 shadow-[0_28px_70px_-36px_rgba(15,23,34,0.45)] sm:p-7">
            {children}
            <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-slate-600">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
