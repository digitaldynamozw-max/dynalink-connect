import { BriefcaseBusiness, Route, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'
import { AdminWorkersManager, type WorkerRow } from '@/components/admin-workers-manager'

export default async function AdminWorkersPage() {
  await requireAdmin()

  const [staffUsers, pendingVendors, activeStaffOrders] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
          { role: 'vendor' },
          { role: 'courier' },
        ],
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
      take: 18,
    }),
    prisma.user.findMany({
      where: {
        isVendor: true,
        vendorVerified: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
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
      take: 12,
    }),
  ])

  const adminStaff = staffUsers.filter((user) => user.role === 'admin')
  const vendorStaff = staffUsers.filter((user) => user.role === 'vendor')
  const courierStaff = staffUsers.filter((user) => user.role === 'courier')
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

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Workers"
          description="Our staff and role visibility across admin operations, vendor management, and internal workload."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Admin Staff" value={adminStaff.length} helper="Internal admin users and managers" icon={UsersRound} />
            <AdminStatCard label="Vendor Staff" value={vendorStaff.length} helper="Vendor-side operational accounts" icon={BriefcaseBusiness} />
            <AdminStatCard label="Courier Staff" value={courierStaff.length} helper="Rider and courier login accounts" icon={Route} />
            <AdminStatCard label="Pending Vendor Roles" value={pendingVendors.length} helper="Vendors waiting for verification or activation" icon={ShieldCheck} />
            <AdminStatCard label="Orders In Staff Flow" value={activeStaffOrders.length} helper="Orders still requiring worker oversight" icon={UserCog} />
          </div>

          <AdminWorkersManager initialWorkers={normalizedWorkers} />

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title="Staff Overview" description="Current internal and vendor-side roles visible in the system.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Name</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Role</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Products</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{user.vendorName || user.name || user.email}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{user.role}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{user._count.products}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{new Date(user.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Pending Worker Assignments" description="Recent role-related work that still needs internal attention.">
              <div className="space-y-3">
                {pendingVendors.map((vendor) => (
                  <div key={vendor.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{vendor.vendorName || vendor.email}</p>
                    <p className="mt-1 text-sm text-slate-500">Pending vendor verification and role activation</p>
                  </div>
                ))}

                {activeStaffOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{order.user.name || order.user.email}</p>
                    <p className="mt-1 text-sm text-slate-500">Order #{order.id.slice(0, 8)} still requires worker oversight</p>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
