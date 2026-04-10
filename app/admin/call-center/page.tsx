import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Headphones,
  MapPinned,
  PackageCheck,
  PhoneCall,
  Route,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
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
import { AdminExceptionQueue } from '@/components/admin-exception-queue'
import { DELIVERY_EXCEPTION_AUDIENCE, parseNotificationPayload, type DeliveryExceptionPayload } from '@/lib/courier-tracking'

const ACTIVE_ORDER_STATUSES = ['pending', 'paid', 'accepted', 'courier_on_the_way'] as const
const ACTIVE_ORDER_ITEM_STATUSES = ['pending', 'accepted', 'courier_on_the_way'] as const

function badgeTone(status: string): 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'resolved' || status === 'closed' || status === 'delivered') return 'green'
  if (status === 'pending' || status === 'paid' || status === 'accepted') return 'amber'
  if (status === 'urgent' || status === 'delivery_issue' || status === 'failed') return 'red'
  return 'neutral'
}

function formatElapsedLabel(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m ago` : `${hours}h ago`
}

function formatPercent(value: number, total: number) {
  if (total <= 0) {
    return '0%'
  }

  return `${Math.round((value / total) * 100)}%`
}

export default async function AdminCallCenterPage() {
  await requireAdmin()

  const [activeItemIds, orderItems, assignments, exceptions, openSupportTickets] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        status: { in: [...ACTIVE_ORDER_ITEM_STATUSES] },
      },
      select: {
        orderId: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            createdAt: true,
            deliveryAddress: true,
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
      take: 24,
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'pending'] },
      },
    }),
  ])

  const activeOrderIds = [...new Set(activeItemIds.map((item) => item.orderId))]
  const activeOrderFilters: Array<{ status?: { in: string[] }; id?: { in: string[] } }> = [
    { status: { in: [...ACTIVE_ORDER_STATUSES] } },
  ]

  if (activeOrderIds.length) {
    activeOrderFilters.push({ id: { in: activeOrderIds } })
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: activeOrderFilters,
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
  })

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
  const paidOrders = orders.filter((order) => order.status === 'paid').length
  const acceptedOrders = orders.filter((order) => order.status === 'accepted').length
  const riderOrders = orders.filter((order) => order.status === 'courier_on_the_way').length
  const reachableCustomers = orders.filter((order) => order.user.mobileNumber?.trim()).length
  const staleOrders = orders.filter((order) => Date.now() - order.createdAt.getTime() >= 45 * 60 * 1000)
  const assignedItems = orderItems.filter((item) => assignmentMap.get(item.id)).length
  const delayedItems = orderItems.filter((item) => item.additionalDelayMinutes > 0 || item.preparationMinutes > 45)
  const noAddressOrders = orders.filter((order) => !order.deliveryAddress?.trim())

  const exceptionRows = exceptions
    .map((exception) => ({
      orderId: exception.orderId,
      orderItemId: exception.orderItemId,
      createdAt: exception.createdAt,
      payload: parseNotificationPayload<DeliveryExceptionPayload>(exception.message),
    }))
    .filter(
      (
        exception
      ): exception is { orderId: string | null; orderItemId: string | null; createdAt: Date; payload: DeliveryExceptionPayload } =>
        Boolean(exception.payload)
    )

  const exceptionMix = Array.from(
    exceptionRows.reduce((map, row) => {
      const label = row.payload.type.replaceAll('_', ' ')
      map.set(label, (map.get(label) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  const followUpQueue = orders
    .map((order) => {
      const customerName =
        [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
        order.user.name ||
        order.user.email

      return {
        id: order.id,
        customerName,
        contact: order.user.mobileNumber || order.user.email,
        hasPhone: Boolean(order.user.mobileNumber?.trim()),
        status: order.status,
        ageLabel: formatElapsedLabel(order.createdAt),
        courier: orderAssignmentMap.get(order.id) || 'Unassigned',
      }
    })
    .sort((left, right) => Number(left.hasPhone) - Number(right.hasPhone) || left.status.localeCompare(right.status))
    .slice(0, 5)

  const fulfillmentHotspots = orderItems
    .map((item) => ({
      id: item.id,
      orderId: item.order.id,
      productName: item.product.name,
      vendorName: item.vendor?.vendorName || 'Admin Store',
      status: item.status,
      courier: assignmentMap.get(item.id) || 'Unassigned',
      ageLabel: formatElapsedLabel(item.order.createdAt),
      needsAttention: item.additionalDelayMinutes > 0 || !assignmentMap.get(item.id),
    }))
    .sort((left, right) => Number(right.needsAttention) - Number(left.needsAttention))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Call Center"
          description="Live service visibility for customer callbacks, dispatch gaps, and fulfillment exceptions."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Active Orders" value={orders.length} helper="Customer orders in the live service queue" icon={Headphones} />
            <AdminStatCard label="Reachable" value={reachableCustomers} helper={`${formatPercent(reachableCustomers, orders.length)} with direct phone contact`} icon={PhoneCall} />
            <AdminStatCard label="Courier Coverage" value={formatPercent(assignedItems, orderItems.length)} helper={`${assignedItems} of ${orderItems.length} item lines assigned`} icon={Route} />
            <AdminStatCard label="Stale Queue" value={staleOrders.length} helper="Orders older than 45 minutes" icon={Clock3} />
            <AdminStatCard label="Exceptions" value={exceptionRows.length} helper="Courier or delivery issues awaiting follow-up" icon={AlertTriangle} />
            <AdminStatCard label="Open Tickets" value={openSupportTickets} helper="Customer support items still unresolved" icon={ShieldAlert} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <AdminSectionCard title="Order Control Board" description="The current live queue, with the first customers your team can immediately reach.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Customer</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Order</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Courier</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((order) => {
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
                            <AdminBadge label={order.status.replaceAll('_', ' ')} tone={badgeTone(order.status)} />
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span>{formatElapsedLabel(order.createdAt)}</span>
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                              >
                                Open
                                <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Service Readiness" description="The most useful queue signals for the current shift.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Queue mix</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Pending</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{pendingOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Paid</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{paidOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Accepted</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{acceptedOrders}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Out now</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{riderOrders}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Dispatch watchlist</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Delayed item lines</span>
                      <span className="font-semibold text-slate-900">{delayedItems.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Orders missing address</span>
                      <span className="font-semibold text-slate-900">{noAddressOrders.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Unassigned item lines</span>
                      <span className="font-semibold text-slate-900">{Math.max(orderItems.length - assignedItems, 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Exception pattern</p>
                  <div className="mt-3 space-y-2">
                    {exceptionMix.length === 0 ? (
                      <p className="text-sm text-slate-500">No unresolved delivery exceptions right now.</p>
                    ) : (
                      exceptionMix.map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                          <span className="capitalize text-slate-600">{label}</span>
                          <span className="font-semibold text-slate-900">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </AdminSectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard title="Fulfillment Hotspots" description="Five item lines that need the most operational attention first.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {fulfillmentHotspots.length === 0 ? (
                  <AdminEmptyState message="No active fulfillment lines need attention right now." />
                ) : (
                  fulfillmentHotspots.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.vendorName}</p>
                        </div>
                        <AdminBadge label={item.status.replaceAll('_', ' ')} tone={badgeTone(item.status)} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">Order #{item.orderId.slice(0, 8)}</div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">{item.courier}</div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">{item.ageLabel}</div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <Link
                            href={`/admin/orders/${item.orderId}`}
                            className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700"
                          >
                            View receipt
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Customer Callback Queue" description="A compact list of customers to contact first, prioritizing missing phone coverage and pending states.">
              <div className="grid gap-3">
                {followUpQueue.length === 0 ? (
                  <AdminEmptyState message="There are no active customer callbacks queued right now." />
                ) : (
                  followUpQueue.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{order.customerName}</p>
                          <p className="mt-1 text-sm text-slate-500">{order.contact}</p>
                        </div>
                        <AdminBadge label={order.status.replaceAll('_', ' ')} tone={badgeTone(order.status)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">#{order.id.slice(0, 8)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{order.courier}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{order.ageLabel}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{order.hasPhone ? 'Phone ready' : 'Email only'}</span>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Open receipt
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>
          </div>

          <AdminSectionCard title="Delivery Exception Queue" description="Courier and admin-reported issues that may need a customer call or routing decision.">
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

          <AdminSectionCard title="Coverage Notes" description="Fast context for operators before they move into manual customer handling.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <PhoneCall className="h-4 w-4" />
                  <p className="font-medium">Contact readiness</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {reachableCustomers} active customers have a direct number saved. That is {formatPercent(reachableCustomers, orders.length)} of the live queue.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <PackageCheck className="h-4 w-4" />
                  <p className="font-medium">Fulfillment pressure</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {delayedItems.length} item lines already show added delay or long prep time, which is where the next customer dissatisfaction usually begins.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <MapPinned className="h-4 w-4" />
                  <p className="font-medium">Routing hygiene</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {noAddressOrders.length} active orders still need a reliable delivery address confirmed before dispatch is fully safe.
                </p>
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  )
}
