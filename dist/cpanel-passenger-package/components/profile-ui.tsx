'use client'

import type { ReactNode } from 'react'

export function ProfilePageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#fef3c7)] p-4 shadow-[0_20px_60px_-45px_rgba(245,158,11,0.45)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </section>

      {children}
    </div>
  )
}

export function ProfilePanel({
  title,
  description,
  children,
  className = '',
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-4.5 ${className}`}>
      {title ? <h2 className="text-base font-bold text-slate-950">{title}</h2> : null}
      {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}

export function ProfileStatCard({
  label,
  value,
  helper,
  accent = 'orange',
  icon,
}: {
  label: string
  value: ReactNode
  helper?: string
  accent?: 'orange' | 'blue' | 'emerald' | 'violet' | 'rose'
  icon?: ReactNode
}) {
  const accentClass = {
    orange: 'from-orange-50 to-amber-100 text-orange-700 border-orange-200',
    blue: 'from-sky-50 to-blue-100 text-blue-700 border-blue-200',
    emerald: 'from-emerald-50 to-green-100 text-emerald-700 border-emerald-200',
    violet: 'from-violet-50 to-purple-100 text-violet-700 border-violet-200',
    rose: 'from-rose-50 to-pink-100 text-rose-700 border-rose-200',
  }[accent]

  return (
    <div className={`rounded-[1.2rem] border bg-gradient-to-br p-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div>
          {helper ? <p className="mt-1.5 text-xs leading-5 text-slate-600">{helper}</p> : null}
        </div>
        {icon ? <div className="rounded-xl bg-white/80 p-2.5 text-slate-900 shadow-sm">{icon}</div> : null}
      </div>
    </div>
  )
}

export function ProfileEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  )
}

export function ProfileMessage({
  type,
  text,
}: {
  type: 'success' | 'error'
  text: string
}) {
  return (
    <div
      className={`rounded-[1.1rem] border px-3.5 py-2.5 text-sm font-medium ${
        type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {text}
    </div>
  )
}
