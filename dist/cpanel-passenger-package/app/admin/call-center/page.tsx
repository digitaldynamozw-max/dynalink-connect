import { Clock3, Headphones, PackageCheck, PhoneCall } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminBadge, AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'
import { AdminExceptionQueue } from '@/components/admin-exception-queue'
import { DELIVERY_EXCEPTION_AUDIENCE, parseNotificationPayload, type DeliveryExceptionPayload } from '@/lib/courier-tracking'

function badgeTone(status: string): 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'resolved' || status === 'closed') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'urgent') return 'red'
  return 'neutral'
}

export default async function AdminCallCenterPage() {
  await requireAdmin()

  const [orders, orderItems, assignments, exceptions] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ['pending', 'accepted', 'courier_on_the_way'] },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 18,
    }),
    prisma.orderItem.findMany({
      include: {
        order: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
        vendor: {
          select: {
            vendorName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.notification.findMany({
      where: {
        audience: 'courier_assignment',
        orderItemId: { not: null },
      },
      select: {
        orderItemId: true,
        recipient: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: {
        audience: DELIVERY_EXCEPTION_AUDIENCE,
        recipientId: null,
        orderItemId: { not: null },
      },
      select: {
        orderId: true,
        orderItemId: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const assignmentMap = new Map(
    assignments.map((assignment) => [
      assignment.orderItemId,
      assignment.recipient ? assignment.recipient.name || assignment.recipient.email : null,
    ])
  )
  const orderAssignmentMap = new Map<string, string>()

  for (const item of orderItems) {
    const currentCourier = assignmentMap.get(item.id)
    if (currentCourier && !orderAssignmentMap.has(item.order.id)) {
      orderAssignmentMap.set(item.order.id, currentCourier)
    }
  }

  const pendingOrders = orders.filter((order) => order.status === 'pending').length
  const acceptedOrders = orders.filter((order) => order.status === 'accepted').length
  const riderOrders = orders.filter((order) => order.status === 'courier_on_the_way').length
  const reachableCustomers = orders.filter((order) => order.user.mobileNumber).length
  const exceptionRows = exceptions
    .map((exception) => ({
      orderId: exception.orderId,
      orderItemId: exception.orderItemId,
      createdAt: exception.createdAt,
      payload: parseNotificationPayload<DeliveryExceptionPayload>(exception.message),
    }))
    .filter((exception): exception is { orderId: string | null; orderItemId: string | null; createdAt: Date; payload: DeliveryExceptionPayload } => Boolean(exception.payload))

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Call Center"
          description="Order control for customer-facing follow-up, service escalation, and live fulfillment visibility."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Pending Orders" value={pendingOrders} helper="Orders still waiting for acceptance" icon={Clock3} />
            <AdminStatCard label="Accepted Orders" value={acceptedOrders} helper="Orders in preparation or dispatch queue" icon={Headphones} />
            <AdminStatCard label="Rider Orders" value={riderOrders} helper="Orders currently out for delivery" icon={PackageCheck} />
            <AdminStatCard label="Reachable Customers" value={reachableCustomers} helper="Orders with a phone contact available" icon={PhoneCall} />
            <AdminStatCard label="Exceptions" value={exceptionRows.length} helper="Delivery issues awaiting follow-up" icon={Headphones} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title="Order Control Board" description="Recent active orders that may require call-center follow-up.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Customer</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Courier</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const name =
                        [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
                        order.user.name ||
                        order.user.email

                      return (
                        <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900">{name}</p>
                            <p className="text-xs text-slate-500">{order.user.mobileNumber || order.user.email}</p>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">#{order.id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{orderAssignmentMap.get(order.id) || 'Unassigned'}</td>
                          <td className="px-3 py-2">
                            <AdminBadge label={order.status} tone={badgeTone(order.status)} />
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">{order.deliveryAddress || 'No address saved'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Active Order Items" description="Latest item-level fulfillment states used by the call center for follow-up context.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Vendor</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Courier</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs text-slate-700">#{item.order.id.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{item.vendor?.vendorName || 'Admin Store'}</td>
                        <td className="px-3 py-2 text-xs text-slate-900">{item.product.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{assignmentMap.get(item.id) || 'Unassigned'}</td>
                        <td className="px-3 py-2">
                          <AdminBadge label={item.status} tone={badgeTone(item.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Delivery Exception Queue" description="Courier and admin-reported issues that may need a customer call.">
              <AdminExceptionQueue
                initialRows={exceptionRows.map((exception) => ({
                  orderId: exception.orderId,
                  orderItemId: exception.orderItemId,
                  createdAt: exception.createdAt.toISOString(),
                  payload: {
                    type: exception.payload.type,
                    note: exception.payload.note,
                    actorName: exception.payload.actorName,
                    resolutionStatus: exception.payload.resolutionStatus,
                  },
                }))}
              />
            </AdminSectionCard>
          </div>

          <AdminSectionCard title="Customer Follow-Up Queue" description="Recent active orders with direct contact information for service calls.">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
              {orders.map((order) => {
                const customerName =
                  [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
                  order.user.name ||
                  order.user.email

                return (
                  <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{customerName}</p>
                    <p className="mt-1 text-sm text-slate-500">{order.user.mobileNumber || 'No phone number saved'}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Order #{order.id.slice(0, 8)} | {order.status}
                    </p>
                  </div>
                )
              })}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
