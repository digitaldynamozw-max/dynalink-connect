import { CircleHelp, Clock3, CreditCard, PackageCheck, ShieldCheck } from 'lucide-react'
import { SupportPageShell } from '@/components/support-page-shell'

const faqs = [
  {
    question: 'Placing an order',
    answer:
      'Browse products, add items to your cart, choose your delivery address, and complete checkout. Delivery fees are calculated per vendor based on the route from each store to your address.',
  },
  {
    question: 'Tracking an order',
    answer:
      'Go to your Orders page after checkout. You will see status updates like pending, accepted, courier on the way, completed, or declined when a vendor cannot fulfill an item.',
  },
  {
    question: 'Delivery time estimates',
    answer:
      'Estimated delivery time combines store preparation time with delivery travel time. Vendors can also add delay updates if an order needs more time before dispatch.',
  },
  {
    question: 'Can I order from more than one vendor at once?',
    answer:
      'Yes. The platform supports multi-vendor carts. Delivery charges are shown per vendor so you can see how each store contributes to the total.',
  },
]

export default function HelpCenterPage() {
  return (
    <SupportPageShell
      eyebrow="Customer Support"
      title="Help Center"
      description="Answers to the most common shopping, delivery, account, and payment questions on DynaLink Connect."
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Popular topics</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
            <PackageCheck className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Orders and delivery</h3>
            <p className="mt-2 text-sm text-gray-700">
              Understand delivery timing, order status updates, and how multi-vendor orders work.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <CreditCard className="h-6 w-6 text-emerald-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Payments and checkout</h3>
            <p className="mt-2 text-sm text-gray-700">
              Learn what happens after payment, where to review totals, and how fees are shown.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <Clock3 className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Timing and support</h3>
            <p className="mt-2 text-sm text-gray-700">
              Get help when an order is delayed, an item is unavailable, or you need assistance quickly.
            </p>
          </div>
          <div className="rounded-2xl bg-purple-50 p-5 ring-1 ring-purple-100">
            <ShieldCheck className="h-6 w-6 text-purple-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Account and trust</h3>
            <p className="mt-2 text-sm text-gray-700">
              Shop with verified vendors, protected checkout flows, and clear communication on every order.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-3">
          <CircleHelp className="h-6 w-6 text-blue-700" />
          <h2 className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
        </div>
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </SupportPageShell>
  )
}
