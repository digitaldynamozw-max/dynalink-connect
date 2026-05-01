import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDeliveryQuote } from '@/lib/delivery'
import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { generateUniqueOrderNumber, getStoreKey } from '@/lib/orders'
import {
  getResolvedProductOptionGroups,
  serializeSelectedOptionsForStorage,
  type SelectedProductOption,
  validateAndResolveSelectedOptions,
} from '@/lib/product-options'
import { calculateVendorSettlement, roundCurrency } from '@/lib/vendor-ledger'
import { applyMarketplaceMarkup, extractMarketplaceMarkup } from '@/lib/marketplace-pricing'
import { sendOrderReceipt } from '@/lib/order-receipts'
import { normalizePromoCode, validatePromoCodeForUser } from '@/lib/promo-codes'
import { validateVendorOrderLimit } from '@/lib/vendor-order-limits'
import { createRequestDebugId, getSessionDebug, logRequestDebug, logRequestError } from '@/lib/request-debug'
import { hasPaynowConfig, initiatePaynowExpressTransaction, initiatePaynowTransaction, type PaynowExpressMethod } from '@/lib/paynow'
import { buildPayNowReturnUrl } from '@/lib/payment-links'
import { sendPushToCouriers } from '@/lib/push-notifications'

interface CheckoutItem {
  productId: string
  quantity: number
  price: number
  name?: string
  selectedOptions?: SelectedProductOption[]
  selectedOptionsSummary?: string | null
}

type CheckoutPaymentMethod = 'pay_on_delivery' | 'paynow' | 'ecocash' | 'onemoney'

function resolvePaymentMethod(value: unknown): CheckoutPaymentMethod {
  return value === 'paynow' || value === 'ecocash' || value === 'onemoney' ? value : 'pay_on_delivery'
}

function isGatewayPaymentMethod(method: CheckoutPaymentMethod) {
  return method === 'paynow' || method === 'ecocash' || method === 'onemoney'
}

function formatPaymentMethod(method: CheckoutPaymentMethod) {
  if (method === 'paynow') return 'PayNow card payment'
  if (method === 'ecocash') return 'EcoCash payment'
  if (method === 'onemoney') return 'OneMoney payment'
  return 'pay on handoff'
}

function buildCheckoutPaymentReturnUrl(args: {
  orderId: string
  payNowRef: string
  method: CheckoutPaymentMethod
  phone?: string
}) {
  const url = new URL(buildPayNowReturnUrl(args.orderId, args.payNowRef))
  url.searchParams.set('method', args.method)
  if (args.phone) {
    url.searchParams.set('phone', args.phone)
  }

  return url.toString()
}

function normalizeCheckoutAddress(address?: string | null) {
  return address?.trim().replace(/\s+/g, ' ').toLowerCase() || ''
}

function buildCheckoutFingerprint(args: {
  items: Array<{ productId: string; quantity: number; selectedOptionsSummary?: string | null }>
  customerAddress?: string | null
  fulfillmentMethod: 'delivery' | 'pickup'
  paymentFlow: CheckoutPaymentMethod
  promoCode?: string | null
}) {
  return JSON.stringify({
    fulfillmentMethod: args.fulfillmentMethod,
    paymentFlow: args.paymentFlow,
    promoCode: normalizePromoCode(args.promoCode),
    customerAddress: normalizeCheckoutAddress(args.customerAddress),
    items: [...args.items]
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedOptionsSummary: item.selectedOptionsSummary || '',
      }))
      .sort((left, right) =>
        `${left.productId}:${left.selectedOptionsSummary}`.localeCompare(`${right.productId}:${right.selectedOptionsSummary}`)
      ),
  })
}

export async function POST(request: NextRequest) {
  const requestId = createRequestDebugId('checkout')
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, customerAddress, requestedDeliveryAt, fulfillmentMethod, promoCode } = body as {
      paymentMethod?: CheckoutPaymentMethod
      paymentCurrency?: string
      paymentPhone?: string | null
      items: CheckoutItem[]
      customerAddress?: string
      requestedDeliveryAt?: string | null
      fulfillmentMethod?: 'delivery' | 'pickup'
      promoCode?: string | null
    }
    const paymentCurrency =
      typeof body.paymentCurrency === 'string' && body.paymentCurrency.trim()
        ? body.paymentCurrency.trim().toUpperCase()
        : 'USD'
    const paymentMethod = resolvePaymentMethod(body.paymentMethod)
    const paymentPhone = typeof body.paymentPhone === 'string' ? body.paymentPhone.trim() : ''

    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logRequestDebug('checkout:start', requestId, {
      itemCount: Array.isArray(items) ? items.length : 0,
      fulfillmentMethod,
      paymentMethod,
      paymentCurrency,
      hasCustomerAddress: Boolean(customerAddress),
      ...getSessionDebug(session),
    })

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item before checking out.' }, { status: 400 })
    }

    const invalidItem = items.find(
      (item) =>
        !item?.productId ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
    )

    if (invalidItem) {
      return NextResponse.json({ error: 'One or more cart items are invalid.' }, { status: 400 })
    }

    const settings = await ensureSiteSettings()
    const selectedFulfillmentMethod = fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery'

    if (settings.platformOrdersPaused) {
      return NextResponse.json({ error: 'The marketplace is not accepting orders right now.' }, { status: 400 })
    }

    if (settings.allStoresTemporarilyClosed) {
      return NextResponse.json({ error: 'All stores are temporarily closed right now.' }, { status: 400 })
    }

    if (selectedFulfillmentMethod === 'pickup' && !settings.pickupEnabled) {
      return NextResponse.json({ error: 'Collection is not available right now.' }, { status: 400 })
    }

    if (paymentMethod === 'pay_on_delivery' && !settings.payOnDeliveryEnabled) {
      return NextResponse.json({ error: 'Pay on delivery is not available right now.' }, { status: 400 })
    }

    if (paymentMethod !== 'pay_on_delivery' && paymentCurrency !== 'USD') {
      return NextResponse.json({ error: 'Online payments are only available in USD right now.' }, { status: 400 })
    }

    if (paymentMethod === 'paynow' && !settings.paynowGatewayEnabled) {
      return NextResponse.json({ error: 'PayNow payments are not available right now.' }, { status: 400 })
    }

    if (paymentMethod === 'ecocash' && (!settings.paynowGatewayEnabled || !settings.ecocashGatewayEnabled)) {
      return NextResponse.json({ error: 'EcoCash payments are not available right now.' }, { status: 400 })
    }

    if (paymentMethod === 'onemoney' && (!settings.paynowGatewayEnabled || !settings.onemoneyGatewayEnabled)) {
      return NextResponse.json({ error: 'OneMoney payments are not available right now.' }, { status: 400 })
    }

    if (isGatewayPaymentMethod(paymentMethod) && !hasPaynowConfig()) {
      return NextResponse.json({ error: 'PayNow credentials are not configured.' }, { status: 503 })
    }

    if ((paymentMethod === 'ecocash' || paymentMethod === 'onemoney') && !paymentPhone) {
      return NextResponse.json({ error: 'Mobile money phone number is required.' }, { status: 400 })
    }

    if (selectedFulfillmentMethod === 'delivery' && !customerAddress) {
      return NextResponse.json({ error: 'Customer address is required' }, { status: 400 })
    }

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

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        accountBalance: true,
      },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        category: true,
        price: true,
        salePrice: true,
        onSale: true,
        stock: true,
        preparationTimeMinutes: true,
        optionGroupsJson: true,
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
            commissionRate: true,
            storeAddress: true,
            storeCity: true,
            storeState: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    const productMap = new Map(products.map((product) => [product.id, product]))

    const itemsWithVendors: Array<
      CheckoutItem & {
        vendorId: string | null
        finalUnitPrice: number
        preparationTimeMinutes: number
        selectedOptionsJson: string | null
        selectedOptionsSummary: string | null
      }
    > = []
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }
      if (product.vendorId) {
        const vendor = await prisma.user.findUnique({
          where: { id: product.vendorId }
        })
        if (!vendor) {
          return NextResponse.json(
            { error: `Vendor for product ${item.productId} not found` },
            { status: 404 }
          )
        }
        if (vendor.temporarilyClosed) {
          return NextResponse.json(
            { error: `${vendor.vendorName || 'This store'} is temporarily closed.` },
            { status: 400 }
          )
        }
      }

      if (product.stock <= 0) {
        return NextResponse.json(
          { error: `${product.name} is currently out of stock.` },
          { status: 400 }
        )
      }

      if (item.quantity > product.stock) {
        return NextResponse.json(
          { error: `Only ${product.stock} unit(s) of ${product.name} are available right now.` },
          { status: 400 }
        )
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
        return NextResponse.json(
          { error: `${item.name || 'Product'}: ${resolvedOptions.error}` },
          { status: 400 }
        )
      }
      const baseUnitPrice = product.onSale && product.salePrice ? product.salePrice : product.price
      const customerUnitPrice = applyMarketplaceMarkup(
        baseUnitPrice + resolvedOptions.optionsTotal,
        product.vendor?.commissionRate
      )
      
      itemsWithVendors.push({
        ...item,
        vendorId: product.vendorId,
        finalUnitPrice: customerUnitPrice,
        preparationTimeMinutes: Math.max(0, Math.round(product.preparationTimeMinutes || 0)),
        selectedOptionsJson: serializeSelectedOptionsForStorage(resolvedOptions.selectedOptions),
        selectedOptionsSummary: resolvedOptions.selectedSummary || null,
      })
    }

    const checkoutFingerprint = buildCheckoutFingerprint({
      items: itemsWithVendors.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedOptionsSummary: item.selectedOptionsSummary,
      })),
      customerAddress,
      fulfillmentMethod: selectedFulfillmentMethod,
      paymentFlow: paymentMethod,
      promoCode,
    })

    const vendorValidation = validateVendorOrderLimit(
      Array.from(
        new Map(
          itemsWithVendors.map((item) => {
            const product = productMap.get(item.productId)
            return [
              getStoreKey(item.vendorId),
              {
                vendorId: getStoreKey(item.vendorId),
                vendorName: product?.vendor?.vendorName || 'Admin Store',
                latitude: product?.vendor?.latitude ?? null,
                longitude: product?.vendor?.longitude ?? null,
              },
            ]
          })
        ).values()
      ),
      { allowMultiVendorWithinRadius: settings.allowMultiVendorWithinRadius }
    )

    if (!vendorValidation.ok) {
      return NextResponse.json(
        { error: vendorValidation.error },
        { status: 400 }
      )
    }

    const pickupVendor = products[0]?.vendor
    const pickupAddress = [pickupVendor?.storeAddress, pickupVendor?.storeCity, pickupVendor?.storeState]
      .filter(Boolean)
      .join(', ')

    const deliveryData =
      selectedFulfillmentMethod === 'delivery'
        ? await calculateDeliveryQuote(
            items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            customerAddress || ''
          )
        : {
            customerAddress: pickupAddress || settings.platformStoreAddress || 'Collection from vendor shop',
            vendorFees: [],
            totalDeliveryFee: 0,
          }

    const unavailableVendors = deliveryData.vendorFees.filter((fee) => fee.available === false)
    if (unavailableVendors.length > 0) {
      const message = unavailableVendors
        .map((vendor) => `${vendor.vendorName}: ${vendor.availabilityMessage || 'Delivery unavailable right now.'}`)
        .join(' ')

      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    const vendorFeeMap = new Map<string, { fee: number; durationMinutes: number | null }>()
    for (const fee of deliveryData.vendorFees) {
      vendorFeeMap.set(fee.vendorId, {
        fee: fee.fee,
        durationMinutes: fee.durationMinutes ?? null,
      })
    }

    const subtotal = itemsWithVendors.reduce((sum, item) => sum + item.finalUnitPrice * item.quantity, 0)
    const deliveryFee = deliveryData.totalDeliveryFee
    const appliedPromo = normalizePromoCode(promoCode)
      ? await validatePromoCodeForUser({
          code: promoCode,
          userId,
          subtotal,
          deliveryFee,
        })
      : null
    const promoDiscount = appliedPromo?.discountAmount || 0
    const vendorCommissionTotal = roundCurrency(
      itemsWithVendors.reduce((sum, item) => {
        const product = productMap.get(item.productId)
        const commissionRate = product?.vendor?.commissionRate ?? 0
        return sum + extractMarketplaceMarkup(item.finalUnitPrice * item.quantity, commissionRate)
      }, 0)
    )
    const platformFee = roundCurrency(Number(settings.platformFeePerOrder || 0))
    const total = roundCurrency(Math.max(subtotal + deliveryFee - promoDiscount, 0) + platformFee)

    const recentOrders = paymentMethod === 'pay_on_delivery'
      ? await prisma.order.findMany({
        where: {
          userId,
          status: { in: ['pending', 'paid'] },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
              selectedOptionsSummary: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      : []

    const duplicateOrder = recentOrders.find((candidate) => {
      const candidateFingerprint = buildCheckoutFingerprint({
        items: candidate.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptionsSummary: item.selectedOptionsSummary,
        })),
        customerAddress: candidate.deliveryAddress,
        fulfillmentMethod:
          candidate.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery',
        paymentFlow: paymentMethod,
        promoCode: candidate.promoCode,
      })

      return candidateFingerprint === checkoutFingerprint
    })

    if (duplicateOrder) {
      logRequestDebug('checkout:duplicate-order-reused', requestId, {
        orderId: duplicateOrder.id,
        orderNumber: duplicateOrder.orderNumber,
        status: duplicateOrder.status,
      })

      return NextResponse.json({
        orderId: duplicateOrder.id,
        orderNumber: duplicateOrder.orderNumber,
        payOnDeliveryRequired: true,
        paymentMethod,
        paymentCurrency,
        supportWhatsappNumber: settings.whatsappNumber || null,
        amount: duplicateOrder.total,
        subtotal,
        deliveryFee: duplicateOrder.deliveryFee,
        promoCode: duplicateOrder.promoCode,
        promoDiscount: duplicateOrder.promoDiscount,
        serviceFee: duplicateOrder.platformFee,
        vendorCommissionTotal,
        fulfillmentMethod: duplicateOrder.fulfillmentMethod,
        requestedDeliveryAt: duplicateOrder.requestedDeliveryAt,
        vendorFees: deliveryData.vendorFees,
        successUrl: `${process.env.NEXTAUTH_URL}/payments/offline?orderId=${duplicateOrder.id}`,
      })
    }

    const orderNumber = await generateUniqueOrderNumber()

    // Create order with per-vendor delivery fees
    const order = await prisma.$transaction(async (tx) => {
      if (appliedPromo) {
        if (appliedPromo.maxUses > 0) {
          const promoUsage = await tx.promoCode.updateMany({
            where: {
              id: appliedPromo.id,
              currentUses: { lt: appliedPromo.maxUses },
              expiryDate: { gt: new Date() },
            },
            data: {
              currentUses: {
                increment: 1,
              },
            },
          })

          if (promoUsage.count === 0) {
            throw new Error('This promo code is no longer available.')
          }
        } else {
          await tx.promoCode.update({
            where: { id: appliedPromo.id },
            data: {
              currentUses: {
                increment: 1,
              },
            },
          })
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          userId,
          total,
          deliveryFee,
          platformFee,
          promoCode: appliedPromo?.code || null,
          promoDiscount,
          fulfillmentMethod: selectedFulfillmentMethod,
          deliveryAddress:
            selectedFulfillmentMethod === 'pickup'
              ? pickupAddress || settings.platformStoreAddress || null
              : customerAddress || null,
          requestedDeliveryAt: scheduledDeliveryAt,
          status: 'pending',
          items: {
            create: itemsWithVendors.map((item) => {
              const vendorDelivery = vendorFeeMap.get(item.vendorId || 'admin') || {
                fee: 0,
                durationMinutes: null,
              }
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: item.finalUnitPrice,
                vendorId: item.vendorId || null,
                selectedOptionsJson: item.selectedOptionsJson,
                selectedOptionsSummary: item.selectedOptionsSummary,
                preparationMinutes: item.preparationTimeMinutes,
                additionalDelayMinutes: 0,
                deliveryFee: vendorDelivery.fee,
                estimatedDeliveryMinutes:
                  selectedFulfillmentMethod === 'pickup' ? 0 : settings.globalDeliveryEtaMinutes,
                vendorEarnings: calculateVendorSettlement(
                  roundCurrency(item.finalUnitPrice * item.quantity - extractMarketplaceMarkup(
                    item.finalUnitPrice * item.quantity,
                    productMap.get(item.productId)?.vendor?.commissionRate
                  )),
                  vendorDelivery.fee
                ),
              }
            })
          }
        }
      })
    })

    const customerName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.name ||
      user.email
    const handoffLabel = selectedFulfillmentMethod === 'pickup' ? 'collection' : 'delivery'
    const orderLabel = order.orderNumber || orderNumber || order.id.slice(0, 8)

    if (isGatewayPaymentMethod(paymentMethod)) {
      const payNowRef = `DLC-${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32)}`
      const paymentReturnUrl = buildCheckoutPaymentReturnUrl({
        orderId: order.id,
        payNowRef,
        method: paymentMethod,
        phone: paymentPhone,
      })
      const payNowArgs = {
        reference: payNowRef,
        amount: total,
        additionalInfo: `DynaLink Connect order ${orderLabel}`,
        orderId: order.id,
        returnUrl: paymentReturnUrl,
        authEmail: user.email,
        authPhone: user.mobileNumber || paymentPhone || undefined,
        authName: customerName,
      }
      const payNowResult =
        paymentMethod === 'paynow'
          ? await initiatePaynowTransaction(payNowArgs)
          : await initiatePaynowExpressTransaction({
              ...payNowArgs,
              method: paymentMethod as PaynowExpressMethod,
              phone: paymentPhone,
            })

      await prisma.order.update({
        where: { id: order.id },
        data: {
          payNowRef,
          payNowPollUrl: payNowResult.pollUrl || null,
          payNowBrowserUrl: payNowResult.browserUrl || null,
          payNowExternalReference: payNowResult.paynowReference || null,
        },
      })

      if (!payNowResult.success) {
        logRequestDebug('checkout:paynow-init-failed', requestId, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMethod,
          providerStatus: payNowResult.status,
          hasPollUrl: Boolean(payNowResult.pollUrl),
          hasBrowserUrl: Boolean(payNowResult.browserUrl),
        })

        return NextResponse.json(
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod,
            paymentCurrency,
            error: payNowResult.error || 'Payment initiation failed.',
          },
          { status: 400 }
        )
      }

      await prisma.notification.createMany({
        data: [
          {
            recipientId: userId,
            audience: 'user',
            channel: 'in_app',
            title: `Order ${orderLabel} awaiting payment`,
            message:
              paymentMethod === 'paynow'
                ? `Your order ${orderLabel} was created. Complete PayNow checkout to confirm fulfilment.`
                : `Your order ${orderLabel} was created. Approve the ${paymentMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'} prompt to complete payment.`,
            orderId: order.id,
            deliveryStatus: 'sent',
            sentAt: new Date(),
          },
          {
            recipientId: null,
            audience: 'admin',
            channel: 'in_app',
            title: `Online payment started for order ${orderLabel}`,
            message: `${customerName} started ${formatPaymentMethod(paymentMethod)} for order ${orderLabel}.`,
            orderId: order.id,
            deliveryStatus: 'sent',
            sentAt: new Date(),
          },
        ],
      })

      await sendOrderReceipt(order.id)
      logRequestDebug('checkout:paynow-created', requestId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total,
        paymentMethod,
        paymentCurrency,
        hasPollUrl: Boolean(payNowResult.pollUrl),
        hasBrowserUrl: Boolean(payNowResult.browserUrl),
      })

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: total,
        subtotal,
        deliveryFee,
        promoCode: appliedPromo?.code || null,
        promoDiscount,
        serviceFee: platformFee,
        vendorCommissionTotal,
        fulfillmentMethod: selectedFulfillmentMethod,
        requestedDeliveryAt: order.requestedDeliveryAt,
        vendorFees: deliveryData.vendorFees,
        payOnDeliveryRequired: false,
        paymentMethod,
        paymentCurrency,
        payNowRef,
        paymentUrl: payNowResult.browserUrl || null,
        paymentBrowserUrl: payNowResult.browserUrl || null,
        paymentInstructions: payNowResult.instructions || null,
        paymentPollUrl: payNowResult.pollUrl || null,
        paymentProviderStatus: payNowResult.status,
        successUrl: paymentReturnUrl,
        supportWhatsappNumber: settings.whatsappNumber || null,
      })
    }

    await prisma.notification.createMany({
      data: [
        {
          recipientId: userId,
          audience: 'user',
          channel: 'in_app',
          title: `Order ${orderLabel} placed for pay on ${handoffLabel}`,
          message:
            selectedFulfillmentMethod === 'pickup'
              ? `Your order ${orderLabel} was placed successfully. Payment will be collected when you pick it up.`
              : `Your order ${orderLabel} was placed successfully. Payment will be collected on delivery.`,
          orderId: order.id,
          deliveryStatus: 'sent',
          sentAt: new Date(),
        },
        {
          recipientId: null,
          audience: 'admin',
          channel: 'in_app',
          title: `Pay on ${handoffLabel} order ${orderLabel}`,
          message: `${customerName} placed order ${orderLabel} with pay on ${handoffLabel}. Collect ${paymentCurrency} settlement on handoff.`,
          orderId: order.id,
          deliveryStatus: 'sent',
          sentAt: new Date(),
        },
      ],
    })

    await sendOrderReceipt(order.id)

    if (selectedFulfillmentMethod === 'delivery') {
      await sendPushToCouriers({
        title: 'New delivery order',
        body: `Order ${orderLabel} is waiting for a nearby driver.`,
        url: '/mobile?role=driver&view=orders',
        tag: `driver-order-${order.id}`,
        sound: 'default',
        priority: 'high',
        channelId: 'orders',
        data: {
          event: 'new_delivery_order',
          orderId: order.id,
          orderNumber: orderLabel,
        },
      })
    }

    logRequestDebug('checkout:created', requestId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total,
      paymentMethod,
      paymentCurrency,
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: total,
      subtotal,
      deliveryFee,
      promoCode: appliedPromo?.code || null,
      promoDiscount,
      serviceFee: platformFee,
      vendorCommissionTotal,
      fulfillmentMethod: selectedFulfillmentMethod,
      requestedDeliveryAt: order.requestedDeliveryAt,
      vendorFees: deliveryData.vendorFees,
      payOnDeliveryRequired: true,
      successUrl: `${process.env.NEXTAUTH_URL}/payments/offline?orderId=${order.id}`,
      supportWhatsappNumber: settings.whatsappNumber || null,
      paymentMethod,
      paymentCurrency,
    })
  } catch (error) {
    logRequestError('checkout:error', requestId, error, {})
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
