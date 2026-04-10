import { type LucideIcon } from 'lucide-react'

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:px-4">
      <div>
        <h1 className="text-[1.45rem] font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className = '',
  contentClassName = 'p-3.5 sm:p-4',
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={`theme-panel overflow-hidden rounded-[1.35rem] ${className}`.trim()}>
      {title || description || action ? (
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-3 sm:px-4">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p> : null}
          </div>
          {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  )
}

export function AdminStatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string | number
  helper?: string
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-[0.9rem] border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-2.5 shadow-[0_10px_24px_-24px_rgba(24,34,43,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-medium uppercase tracking-[0.11em] text-[var(--muted)]">{label}</p>
          <p className="mt-1 truncate text-[0.95rem] font-semibold leading-none text-slate-950 sm:text-[1.05rem]">{value}</p>
          {helper ? <p className="mt-1.5 truncate text-[11px] text-slate-600">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="theme-icon-chip inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AdminInsightCard({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <AdminSectionCard title={title}>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl bg-[var(--brand-accent-soft)] px-3 py-2 text-sm text-slate-700">
            {item}
          </p>
        ))}
      </div>
    </AdminSectionCard>
  )
}

export function AdminQuickLinkCard({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="theme-panel rounded-[1.2rem] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="theme-icon-chip inline-flex h-9 w-9 items-center justify-center rounded-xl">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="mt-2.5 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-[13px] text-slate-600">{description}</p>
    </div>
  )
}

export function AdminBadge({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    blue: 'theme-highlight-chip',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'theme-accent-chip',
    red: 'bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  )
}

export function AdminTableWrap({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`overflow-x-auto ${className}`.trim()}>{children}</div>
}

export function AdminEmptyState({
  message,
}: {
  message: string
}) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>
}
