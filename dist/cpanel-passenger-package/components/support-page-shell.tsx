import Link from 'next/link'

export function SupportPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 py-14 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-8 py-10 text-white shadow-xl dark:from-slate-900 dark:via-blue-950 dark:to-cyan-950">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100 dark:text-slate-200">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold">{title}</h1>
          <p className="mt-3 max-w-3xl text-base text-blue-50 dark:text-slate-300">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact-us"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Contact support
            </Link>
            <Link
              href="/products"
              className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">{children}</div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Support quick links</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Link href="/help-center" className="block font-medium text-blue-700 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Help Center
                </Link>
                <Link href="/contact-us" className="block font-medium text-blue-700 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Contact Us
                </Link>
                <Link href="/shipping-info" className="block font-medium text-blue-700 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Shipping Info
                </Link>
                <Link href="/returns" className="block font-medium text-blue-700 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Returns
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Need help fast?</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>Email: <span className="font-semibold text-gray-900">support@dynalinkconnect.co.zw</span></p>
                <p>Phone: <span className="font-semibold text-gray-900">+263719968771</span></p>
                <p>Address: <span className="font-semibold text-gray-900">2 Giraffe Cres, Borrowdale West</span></p>
                <p>Hours: <span className="font-semibold text-gray-900">Mon-Fri, 9am-6pm</span></p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
