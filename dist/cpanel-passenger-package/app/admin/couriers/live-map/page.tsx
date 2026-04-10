import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminPageHeader } from '@/components/admin-ui'
import { AdminRiderLiveMap } from '@/components/admin-rider-live-map'
import { AdminRiderPerformance } from '@/components/admin-rider-performance'
import { getCourierOperationsSnapshot } from '@/lib/admin/courier-operations'

export default async function AdminCourierLiveMapPage() {
  await requireAdmin()

  const snapshot = await getCourierOperationsSnapshot()
  const liveMapCouriers = snapshot.liveCouriers.map((courier) => ({
    id: courier.id,
    email: courier.email,
    name: courier.name,
    mobileNumber: courier.mobileNumber,
    isActive: courier.isActive,
    activeAssignments: courier.activeAssignments,
    completedDeliveries: courier.completedDeliveries,
    totalDeliveryFees: courier.totalDeliveryFees,
    latestDestinations: courier.latestDestinations,
    tracking: courier.tracking,
    activeRouteReplay: courier.activeRouteReplay,
  }))

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Courier Live Map"
          description="Full-screen rider tracking, dispatch load, and courier performance analytics."
          action={
            <Link
              href="/admin/couriers"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back To Courier Ops
            </Link>
          }
        />
        <div className="space-y-4 p-3.5 sm:p-4">
          <AdminRiderLiveMap
            couriers={liveMapCouriers}
            title="Admin Live Map Screen"
            description="Full-width dispatch tracking for rider location, active jobs, and latest destinations."
          />
          <AdminRiderPerformance rows={snapshot.performanceRows} />
        </div>
      </div>
    </div>
  )
}
