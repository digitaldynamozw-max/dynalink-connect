import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { formatOrderReceiptNumber, generateUniqueOrderNumber, getStoreKey } from '@/lib/orders'
import { sendOrderReceipt } from '@/lib/order-receipts'
import {
  getResolvedProductOptionGroups,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'
import {
  DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
  DELIVERY_EXCEPTION_AUDIENCE,
  DELIVERY_PROOF_AUDIENCE,
  DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
  DELIVERY_TIMELINE_AUDIENCE,
  RIDER_TRACKING_AUDIENCE,
  computeDeliveryRouteHealth,
  computeLateDeliveryState,
  parseNotificationPayload,
  type DeliveryCustomerUpdatePayload,
  type DeliveryExceptionPayload,
  type DeliveryProofPayload,
  type DeliveryRouteSnapshotPayload,
  type DeliveryTimelinePayload,
  type RiderTrackingPayload,
} from '@/lib/courier-tracking'

interface SessionUser {
  id?: string
}

interface CreateOrderItemInput {
  productId: string
  quantity: number
  price: number
  selectedOptions?: SelectedProductOption[]
  selectedOptionsSummary?: string
}

interface CreateOrderRequest {
  items: CreateOrderItemInput[]
  total: number | string
  fulfillmentMethod?: 'delivery' | 'pickup'
  requestedDeliveryAt?: string | null
}

export async function GET() {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { userId },
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
        items: {
          include: {
            product: true,
            vendor: {
              select: {
                id: true,
                vendorName: true,
                vendorPhoneNumber: true,
                storeAddress: true,
                storeCity: true,
                storeState: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const orderItemIds = orders.flatMap((order) => order.items.map((item) => item.id))

    const [assignments, riderTracking, timelines, proofs, routeSnapshots, exceptions, customerUpdates] = orderItemIds.length
      ? await Promise.all([
          prisma.notification.findMany({
            where: {
              audience: 'courier_assignment',
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              recipientId: true,
              recipient: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  mobileNumber: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: RIDER_TRACKING_AUDIENCE,
            },
            select: {
              recipientId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_TIMELINE_AUDIENCE,
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_PROOF_AUDIENCE,
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_ROUTE_SNAPSHOT_AUDIENCE,
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_EXCEPTION_AUDIENCE,
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.notification.findMany({
            where: {
              audience: DELIVERY_CUSTOMER_UPDATE_AUDIENCE,
              recipientId: userId,
              orderItemId: { in: orderItemIds },
            },
            select: {
              orderItemId: true,
              message: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
        ])
      : [[], [], [], [], [], [], []]

    const assignmentMap = new Map(
      assignments.map((assignment) => [assignment.orderItemId, assignment])
    )
    const trackingMap = new Map<string, RiderTrackingPayload>()
    for (const tracking of riderTracking) {
      const payload = parseNotificationPayload<RiderTrackingPayload>(tracking.message)
      if (!payload || !tracking.recipientId || trackingMap.has(tracking.recipientId)) continue
      trackingMap.set(tracking.recipientId, payload)
    }
    const timelineMap = new Map<string, DeliveryTimelinePayload[]>()
    for (const timeline of timelines) {
      const payload = parseNotificationPayload<DeliveryTimelinePayload>(timeline.message)
      if (!payload || !timeline.orderItemId) continue
      const current = timelineMap.get(timeline.orderItemId) || []
      current.push(payload)
      timelineMap.set(timeline.orderItemId, current)
    }
    const proofMap = new Map<string, DeliveryProofPayload>()
    for (const proof of proofs) {
      const payload = parseNotificationPayload<DeliveryProofPayload>(proof.message)
      if (!payload || !proof.orderItemId || proofMap.has(proof.orderItemId)) continue
      proofMap.set(proof.orderItemId, payload)
    }
    const routeSnapshotMap = new Map<string, DeliveryRouteSnapshotPayload[]>()
    for (const snapshot of routeSnapshots) {
      const payload = parseNotificationPayload<DeliveryRouteSnapshotPayload>(snapshot.message)
      if (!payload || !snapshot.orderItemId) continue
      const current = routeSnapshotMap.get(snapshot.orderItemId) || []
      current.push(payload)
      routeSnapshotMap.set(snapshot.orderItemId, current)
    }
    const exceptionMap = new Map<string, DeliveryExceptionPayload[]>()
    for (const exception of exceptions) {
      const payload = parseNotificationPayload<DeliveryExceptionPayload>(exception.message)
      if (!payload || !exception.orderItemId) continue
      const current = exceptionMap.get(exception.orderItemId) || []
      current.push(payload)
      exceptionMap.set(exception.orderItemId, current)
    }
    const customerUpdateMap = new Map<string, DeliveryCustomerUpdatePayload[]>()
    for (const update of customerUpdates) {
      const payload = parseNotificationPayload<DeliveryCustomerUpdatePayload>(update.message)
      if (!payload || !update.orderItemId) continue
      const current = customerUpdateMap.get(update.orderItemId) || []
      current.push(payload)
      customerUpdateMap.set(update.orderItemId, current)
    }

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        receiptNumber: formatOrderReceiptNumber(order.orderNumber, order.id),
        items: order.items.map((item) => {
          const assignment = assignmentMap.get(item.id)
          const assignedCourier = assignment?.recipient
            ? {
                id: assignment.recipient.id,
                name: assignment.recipient.name || assignment.recipient.email,
                phone: assignment.recipient.mobileNumber || null,
                tracking: trackingMap.get(assignment.recipient.id) || null,
              }
            : null

          const routeReplay = routeSnapshotMap.get(item.id) || []
          const lateDelivery = computeLateDeliveryState({
            status: item.status,
            estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
            createdAt: order.createdAt,
            timeline: timelineMap.get(item.id) || [],
          })

          return {
            ...item,
            assignedCourier,
            timeline: timelineMap.get(item.id) || [],
            proof: proofMap.get(item.id) || null,
            routeReplay,
            exceptions: exceptionMap.get(item.id) || [],
            customerUpdates: customerUpdateMap.get(item.id) || [],
            lateDelivery,
            routeHealth: computeDeliveryRouteHealth({
              status: item.status,
              estimatedDeliveryMinutes: item.estimatedDeliveryMinutes,
              routeReplay,
              lateDelivery,
            }),
          }
        }),
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CreateOrderRequest
    const { items, requestedDeliveryAt, fulfillmentMethod } = body // items: [{ productId, quantity, price }]

    const scheduledDeliveryAt = requestedDeliveryAt
      ? new Date(requestedDeliveryAt)
      : null

    if (scheduledDeliveryAt && Number.isNaN(scheduledDeliveryAt.getTime())) {
      return NextResponse.json({ error: 'Invalid requested delivery time' }, { status: 400 })
    }

    if (scheduledDeliveryAt && scheduledDeliveryAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Requested delivery time must be in the future' },
        { status: 400 }
      )
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
      },
      select: {
        id: true,
        vendorId: true,
        category: true,
        price: true,
        salePrice: true,
        onSale: true,
        optionGroupsJson: true,
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
            storeAddress: true,
            storeCity: true,
            storeState: true,
          },
        },
      },
    })
    const productMap = new Map(products.map((product) => [product.id, product]))
    const vendorKeys = [...new Set(products.map((product) => getStoreKey(product.vendorId)))]
    if (vendorKeys.length > 1) {
      return NextResponse.json(
        { error: 'Customers can only place an order from one store at a time.' },
        { status: 400 }
      )
    }
    const pickupVendor = products[0]?.vendor
    const pickupAddress = [pickupVendor?.storeAddress, pickupVendor?.storeCity, pickupVendor?.storeState]
      .filter(Boolean)
      .join(', ')

    const orderNumber = await generateUniqueOrderNumber()
    const selectedFulfillmentMethod = fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery'
    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      const optionGroups = getResolvedProductOptionGroups({
        optionGroupsJson: product.optionGroupsJson,
        category: product.category,
        vendorCategory: product.vendor?.vendorCategory,
        vendorName: product.vendor?.vendorName,
      })
      const resolvedOptions = validateAndResolveSelectedOptions(
        optionGroups,
        Object.fromEntries((item.selectedOptions || []).map((option) => [option.groupId, option.valueId]))
      )

      if (!resolvedOptions.ok) {
        throw new Error(resolvedOptions.error)
      }

      const baseUnitPrice = product.onSale && product.salePrice ? product.salePrice : product.price

      return {
        ...item,
        product,
        finalPrice: baseUnitPrice + resolvedOptions.optionsTotal,
        selectedOptionsJson: resolvedOptions.selectedOptions.length
          ? JSON.stringify(resolvedOptions.selectedOptions)
          : null,
        selectedOptionsSummary: resolvedOptions.selectedSummary || null,
      }
    })
    const normalizedTotal = normalizedItems.reduce(
      (sum, item) => sum + item.finalPrice * item.quantity,
      0
    )

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        total: normalizedTotal,
        platformFee: 0,
        fulfillmentMethod: selectedFulfillmentMethod,
        deliveryAddress: selectedFulfillmentMethod === 'pickup' ? pickupAddress || null : null,
        requestedDeliveryAt: scheduledDeliveryAt,
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.finalPrice,
            vendorId: item.product.vendorId || null,
            selectedOptionsJson: item.selectedOptionsJson,
            selectedOptionsSummary: item.selectedOptionsSummary,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    await sendOrderReceipt(order.id)

    return NextResponse.json(order, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
