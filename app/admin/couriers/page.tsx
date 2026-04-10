import Link from 'next/link'
import { Clock3, Route, ShieldAlert, Truck, Wallet } from 'lucide-react'
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

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <AdminSectionCard title="Dispatch Pulse" description="The first operational signals dispatch usually needs before moving into rider tools.">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live movement</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Active trips</span>
                      <span className="font-semibold text-slate-900">{snapshot.metrics.activeTrips}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Assigned deliveries</span>
                      <span className="font-semibold text-slate-900">{snapshot.metrics.assignedDeliveries}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Overdue items</span>
                      <span className="font-semibold text-slate-900">{snapshot.metrics.overdueDeliveries}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Courier coverage</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {snapshot.metrics.activeCouriers} courier accounts are active, supporting an average utilization of {snapshot.metrics.averageCourierUtilization}.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <ShieldAlert className="h-4 w-4" />
                    <p className="text-sm font-semibold">Exception watch</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {snapshot.metrics.openExceptions} open delivery exceptions and {snapshot.metrics.dispatchQueue} queued dispatch items still need routing attention.
                  </p>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Destination Queue" description="Five recent stops that matter most for rider coordination right now.">
              <div className="grid gap-3">
                {snapshot.orders.slice(0, 5).map((order) => {
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
          </div>
        </div>
      </div>
    </div>
  )
}
