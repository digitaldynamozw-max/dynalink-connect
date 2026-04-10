import { Clock3, MapPinned, ShieldCheck, Truck } from 'lucide-react'
import { SupportPageShell } from '@/components/support-page-shell'

export default function ShippingInfoPage() {
  return (
    <SupportPageShell
      eyebrow="Delivery Guidance"
      title="Shipping Info"
      description="Understand how delivery works on DynaLink Connect, including multi-vendor orders, route-based fees, and estimated timing."
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">How delivery works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
            <Truck className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Per-vendor delivery</h3>
            <p className="mt-2 text-sm text-gray-700">
              If your cart includes items from multiple vendors, delivery is calculated separately for each vendor and then added to your order total.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <MapPinned className="h-6 w-6 text-emerald-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Distance-based pricing</h3>
            <p className="mt-2 text-sm text-gray-700">
              Delivery fees are based on the route from the vendor&apos;s store address to your delivery address, using map-based distance.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <Clock3 className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Estimated timing</h3>
            <p className="mt-2 text-sm text-gray-700">
              Estimated delivery times include store preparation time and travel time. Vendors can update preparation time if an order needs more time.
            </p>
          </div>
          <div className="rounded-2xl bg-purple-50 p-5 ring-1 ring-purple-100">
            <ShieldCheck className="h-6 w-6 text-purple-700" />
            <h3 className="mt-3 font-semibold text-gray-900">Verified vendors</h3>
            <p className="mt-2 text-sm text-gray-700">
              Orders are fulfilled by verified vendors on the platform, with delivery status updates shown in your order history.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Important notes</h2>
        <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
          <p>Delivery coverage depends on the vendor&apos;s active store location and the address you provide at checkout.</p>
          <p>Incorrect or incomplete delivery details can delay fulfillment or affect the delivery quote shown before payment.</p>
          <p>Busy periods, traffic, weather, and store preparation adjustments may affect the final delivery time.</p>
          <p>If a vendor cannot fulfill an item, the item status may be marked as declined and support can help you with the next step.</p>
        </div>
      </section>
    </SupportPageShell>
  )
}
