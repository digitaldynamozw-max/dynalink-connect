import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { SupportPageShell } from '@/components/support-page-shell'

export default function ContactUsPage() {
  return (
    <SupportPageShell
      eyebrow="Customer Support"
      title="Contact Us"
      description="Reach DynaLink Connect support for order help, delivery questions, account support, and general marketplace assistance."
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Support channels</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
            <Mail className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Email support</h3>
            <p className="mt-2 text-sm text-gray-700">
              Best for order issues, vendor questions, and account support.
            </p>
            <p className="mt-3 font-semibold text-blue-700">support@dynalinkconnect.co.zw</p>
            <p className="mt-1 text-xs text-gray-600">Average response time: within 24 hours</p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <Phone className="h-6 w-6 text-emerald-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Phone support</h3>
            <p className="mt-2 text-sm text-gray-700">
              Best for urgent delivery or checkout questions.
            </p>
            <p className="mt-3 font-semibold text-emerald-700">+263719968771</p>
            <p className="mt-1 text-xs text-gray-600">Available Monday to Friday, 9:00 AM to 6:00 PM</p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-5 ring-1 ring-purple-100">
            <MessageSquare className="h-6 w-6 text-purple-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Live chat</h3>
            <p className="mt-2 text-sm text-gray-700">
              Great for quick pre-order questions and marketplace guidance.
            </p>
            <p className="mt-3 text-sm font-semibold text-purple-700">
              Chat window available during support hours
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <MapPin className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Business address</h3>
            <p className="mt-2 text-sm text-gray-700">
              For formal correspondence and business inquiries.
            </p>
            <p className="mt-3 text-sm font-semibold text-amber-800">
              2 Giraffe Cres, Borrowdale West
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Before you contact us</h2>
        <ul className="mt-6 space-y-3 text-sm leading-6 text-gray-700">
          <li>Include your order number when asking about delivery, payment, or missing items.</li>
          <li>For delivery concerns, share the address used at checkout and the latest order status you can see.</li>
          <li>For account issues, tell us whether you are a customer, vendor, or administrator.</li>
          <li>For refunds or returns, review the Returns page first so we can handle your request faster.</li>
        </ul>
      </section>
    </SupportPageShell>
  )
}
