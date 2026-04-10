import { CheckCircle2, PackageOpen, RotateCcw, ShieldAlert } from 'lucide-react'
import { SupportPageShell } from '@/components/support-page-shell'

export default function ReturnsPage() {
  return (
    <SupportPageShell
      eyebrow="Returns & Refunds"
      title="Returns"
      description="Review the return conditions, refund timing, and the best way to contact support if an order arrives damaged, incomplete, or incorrect."
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Return eligibility</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
            <PackageOpen className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Eligible issues</h3>
            <p className="mt-2 text-sm text-gray-700">
              Wrong items, missing items, damaged products, and items that do not match the listing may qualify for a return or refund review.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Report quickly</h3>
            <p className="mt-2 text-sm text-gray-700">
              For the fastest handling, contact support within 48 hours of delivery and include your order number plus clear details about the issue.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <RotateCcw className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Refund timing</h3>
            <p className="mt-2 text-sm text-gray-700">
              Approved refunds are usually processed within 5 to 7 business days, depending on the payment method and issuing provider.
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-100">
            <ShieldAlert className="h-6 w-6 text-rose-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Non-returnable cases</h3>
            <p className="mt-2 text-sm text-gray-700">
              Used, altered, or customer-damaged items may not qualify unless there was a marketplace or fulfillment issue.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">How to request a return</h2>
        <ol className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
          <li>1. Open your order history and note the affected order number.</li>
          <li>2. Contact support through the Contact Us page or your support channel.</li>
          <li>3. Explain the issue clearly and include photos if an item was damaged or incorrect.</li>
          <li>4. Wait for review instructions from support before returning or disposing of the item.</li>
          <li>5. Once approved, we will guide you through the next step and refund timeline.</li>
        </ol>
      </section>
    </SupportPageShell>
  )
}
