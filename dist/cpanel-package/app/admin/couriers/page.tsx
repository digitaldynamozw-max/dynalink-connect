import Link from 'next/link'
import { Clock3, Route, Truck, Wallet } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminCourierDispatchBoard } from '@/components/admin-courier-dispatch-board'
import { AdminCouriersManager } from '@/components/admin-couriers-manager'
import { AdminBadge, AdminPageHeader, AdminSectionCard, AdminStatCard } from '@/components/admin-ui'
import { AdminRiderLiveMap } from '@/components/admin-rider-live-map'
import { AdminRiderPerformance } from '@/components/admin-rider-performance'
import { getCourierOperationsSnapshot, type CourierRow } from '@/lib/admin/courier-operations'

function itemTone(status: string): 'blue' | 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'courier_on_the_way') return 'blue'
  if (status === 'completed') return 'green'
  if (status === 'accepted') return 'amber'
  if (status === 'declined' || status === 'cancelled') return 'red'
  return 'neutral'
}

function formatStatus(status: string) {
  return status === 'courier_on_the_way' ? 'Courier On The Way' : status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function AdminCouriersPage() {
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
          title="Courier"
          description="Rider dispatch, live map visibility, delivery destinations, and performance movement."
          action={
            <Link
              href="/admin/couriers/live-map"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Open Live Map Screen
            </Link>
          }
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Courier Accounts" value={snapshot.metrics.courierAccounts} helper={`${snapshot.metrics.activeCouriers} active courier logins`} icon={Route} />
            <AdminStatCard label="Active Riders" value={snapshot.metrics.activeTrips} helper="Trips currently in rider transit" icon={Truck} />
            <AdminStatCard label="Dispatch Queue" value={snapshot.metrics.dispatchQueue} helper="Pending and accepted items awaiting movement" icon={Clock3} />
            <AdminStatCard label="Assigned Deliveries" value={snapshot.metrics.assignedDeliveries} helper="Items already routed to couriers" icon={Route} />
            <AdminStatCard label="Completed Trips" value={snapshot.metrics.delivered} helper="Completed delivery items in current view" icon={Route} />
            <AdminStatCard label="Overdue Items" value={snapshot.metrics.overdueDeliveries} helper="Deliveries currently beyond ETA" icon={Clock3} />
            <AdminStatCard label="Open Exceptions" value={snapshot.metrics.openExceptions} helper="Active delivery issues awaiting resolution" icon={Truck} />
            <AdminStatCard label="Avg Utilization" value={snapshot.metrics.averageCourierUtilization} helper="Average active assignments per courier" icon={Route} />
            <AdminStatCard label="Outbound Logs" value={snapshot.metrics.outboundUpdateLogs} helper="Recorded external customer update handoffs" icon={Wallet} />
            <AdminStatCard label="Delivery Fees" value={`$${snapshot.metrics.totalDeliveryFees.toFixed(2)}`} helper="Delivery revenue tracked on orders" icon={Wallet} />
          </div>

          <AdminCouriersManager initialCouriers={snapshot.couriers as CourierRow[]} />

          <div className="grid grid-cols-1 gap-4">
            <AdminRiderLiveMap couriers={liveMapCouriers} description="Dispatch can monitor rider pings, locations, and active delivery load in real time." />

            <AdminCourierDispatchBoard
              initialItems={snapshot.dispatchRows}
              couriers={snapshot.couriers.map((courier) => ({
                id: courier.id,
                email: courier.email,
                name: courier.name,
                isActive: courier.isActive,
              }))}
            />

            <AdminRiderPerformance rows={snapshot.performanceRows} />

            <AdminSectionCard title="Rider Destinations" description="Latest order destinations for rider coordination.">
              <div className="space-y-3">
                {snapshot.orders.map((order) => {
                  const customerName =
                    [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
                    order.user.name ||
                    order.user.email

                  return (
                    <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{customerName}</p>
                          <p className="mt-1 text-sm text-slate-500">{order.deliveryAddress || 'No address saved'}</p>
                        </div>
                        <AdminBadge label={formatStatus(order.status)} tone={itemTone(order.status)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
