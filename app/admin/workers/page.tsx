import { BriefcaseBusiness, Route, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { requireAdmin } from '@/lib/admin/require-admin'
import {
  AdminBadge,
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminTableWrap,
} from '@/components/admin-ui'
import { AdminWorkersManager, type WorkerRow } from '@/components/admin-workers-manager'

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(value)
}

export default async function AdminWorkersPage() {
  await requireAdmin()

  const [staffUsers, pendingVendors, activeStaffOrders, openSupportTickets] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ role: 'admin' }, { role: 'vendor' }, { role: 'courier' }],
      },
      include: {
        _count: {
          select: {
            orders: true,
            supportTickets: true,
            products: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.user.findMany({
      where: {
        isVendor: true,
        vendorVerified: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ['pending', 'accepted'] },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'pending'] },
      },
    }),
  ])

  const adminStaff = staffUsers.filter((user) => user.role === 'admin')
  const vendorStaff = staffUsers.filter((user) => user.role === 'vendor')
  const courierStaff = staffUsers.filter((user) => user.role === 'courier')
  const activeWorkers = staffUsers.filter((user) => user.isActive)
  const inactiveWorkers = staffUsers.filter((user) => !user.isActive)
  const normalizedWorkers: WorkerRow[] = staffUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    vendorName: user.vendorName,
    role: user.role,
    isActive: user.isActive,
    isVendor: user.isVendor,
    updatedAt: user.updatedAt,
    _count: user._count,
  }))

  const workloadLeaders = [...staffUsers]
    .sort((left, right) => {
      const leftLoad = left._count.orders + left._count.products + left._count.supportTickets
      const rightLoad = right._count.orders + right._count.products + right._count.supportTickets
      return rightLoad - leftLoad
    })
    .slice(0, 5)

  const accessReview = [...inactiveWorkers, ...staffUsers.filter((worker) => worker.role === 'admin')]
    .filter((worker, index, list) => list.findIndex((entry) => entry.id === worker.id) === index)
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Workers"
          description="Staff coverage, access control, and operational workload across admin, vendors, and couriers."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Admin Staff" value={adminStaff.length} helper="Internal operators and managers" icon={UsersRound} />
            <AdminStatCard label="Vendor Staff" value={vendorStaff.length} helper="Store operators using vendor access" icon={BriefcaseBusiness} />
            <AdminStatCard label="Courier Staff" value={courierStaff.length} helper="Rider and dispatch-facing accounts" icon={Route} />
            <AdminStatCard label="Active Accounts" value={activeWorkers.length} helper={`${inactiveWorkers.length} worker accounts currently inactive`} icon={ShieldCheck} />
            <AdminStatCard label="Pending Approvals" value={pendingVendors.length} helper="Vendor roles still waiting for verification" icon={UserCog} />
            <AdminStatCard label="Support Pressure" value={openSupportTickets} helper="Open or pending tickets tied to the wider team" icon={ShieldCheck} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <AdminSectionCard title="Workforce Pulse" description="A compact read on whether the current staff setup is healthy.">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role mix</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Admins</span>
                      <span className="font-semibold text-slate-900">{adminStaff.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Vendors</span>
                      <span className="font-semibold text-slate-900">{vendorStaff.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span className="text-slate-600">Couriers</span>
                      <span className="font-semibold text-slate-900">{courierStaff.length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Access health</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Active workers</span>
                      <span className="font-semibold text-slate-900">{activeWorkers.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Inactive workers</span>
                      <span className="font-semibold text-slate-900">{inactiveWorkers.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Pending vendor approvals</span>
                      <span className="font-semibold text-slate-900">{pendingVendors.length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Operational pressure</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Orders in queue</span>
                      <span className="font-semibold text-slate-900">{activeStaffOrders.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Open support tickets</span>
                      <span className="font-semibold text-slate-900">{openSupportTickets}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">Workers with live load</span>
                      <span className="font-semibold text-slate-900">{workloadLeaders.filter((worker) => worker._count.orders + worker._count.products + worker._count.supportTickets > 0).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Approval And Follow-Up" description="Five compact listings for the staffing work that needs attention first.">
              <div className="grid gap-3">
                {pendingVendors.length === 0 && activeStaffOrders.length === 0 ? (
                  <AdminEmptyState message="There are no pending worker approvals or urgent worker-linked orders right now." />
                ) : (
                  <>
                    {pendingVendors.map((vendor) => (
                      <div key={vendor.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{vendor.vendorName || vendor.email}</p>
                            <p className="mt-1 text-sm text-slate-500">Pending vendor verification and role activation</p>
                          </div>
                          <AdminBadge label="Approval needed" tone="amber" />
                        </div>
                      </div>
                    ))}
                    {activeStaffOrders.slice(0, Math.max(0, 5 - pendingVendors.length)).map((order) => (
                      <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{order.user.name || order.user.email}</p>
                            <p className="mt-1 text-sm text-slate-500">Order #{order.id.slice(0, 8)} is still waiting for staff oversight</p>
                          </div>
                          <AdminBadge label={order.status} tone="amber" />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </AdminSectionCard>
          </div>

          <AdminWorkersManager initialWorkers={normalizedWorkers} />

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard title="Load Leaders" description="The five worker accounts carrying the biggest visible system load right now.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Worker</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Role</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Load</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workloadLeaders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8">
                          <AdminEmptyState message="No worker activity is visible in the current dataset." />
                        </td>
                      </tr>
                    ) : (
                      workloadLeaders.map((user) => {
                        const totalLoad = user._count.orders + user._count.products + user._count.supportTickets

                        return (
                          <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 text-xs font-medium text-slate-900">{user.vendorName || user.name || user.email}</td>
                            <td className="px-3 py-2">
                              <AdminBadge label={user.role} tone={user.role === 'admin' ? 'blue' : user.role === 'vendor' ? 'green' : 'neutral'} />
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-700">{totalLoad}</td>
                            <td className="px-3 py-2 text-xs text-slate-700">{formatDate(user.updatedAt)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Access Review" description="A tighter five-row view of worker accounts you may want to review manually.">
              <div className="grid gap-3">
                {accessReview.length === 0 ? (
                  <AdminEmptyState message="No worker accounts currently need a manual access review." />
                ) : (
                  accessReview.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{user.vendorName || user.name || user.email}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {user.isActive ? 'Active access' : 'Inactive access'} with {user._count.products} products, {user._count.orders} orders, and {user._count.supportTickets} tickets linked
                          </p>
                        </div>
                        <AdminBadge label={user.isActive ? 'Active' : 'Inactive'} tone={user.isActive ? 'green' : 'amber'} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
