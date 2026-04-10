import { AlertCircle } from 'lucide-react'
import { SupportPageShell } from '@/components/support-page-shell'

export default function ShippingInfoPage() {
  return (
    <SupportPageShell
      eyebrow="Delivery Guidance"
      title="Shipping Info"
      description="Delivery coverage, timing, and order notes for DynaLink Connect."
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Important notes</h2>
        <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
            <p>Delivery coverage depends on the vendor&apos;s active store location and the address you provide at checkout.</p>
          </div>
          <p>Incorrect or incomplete delivery details can delay fulfillment or affect the delivery quote shown before payment.</p>
          <p>Busy periods, traffic, weather, and store preparation adjustments may affect the final delivery time.</p>
          <p>If a vendor cannot fulfill an item, the item status may be marked as declined and support can help you with the next step.</p>
        </div>
      </section>
    </SupportPageShell>
  )
}
