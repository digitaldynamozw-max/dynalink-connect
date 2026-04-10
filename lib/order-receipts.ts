import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { formatOrderReceiptNumber } from '@/lib/orders'

export const ORDER_RECEIPT_AUDIENCE = 'order_receipt'

type OrderReceiptPayload = {
  type: 'order_receipt'
  receiptNumber: string
  orderId: string
  total: number
  message: string
  createdAt: string
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  )
}

function buildReceiptEmail(args: {
  customerName: string
  receiptNumber: string
  orderId: string
  createdAt: Date
  total: number
  deliveryFee: number
  platformFee: number
  fulfillmentMethod: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    selectedOptionsSummary: string | null
    vendorName: string
  }>
}) {
  const subtotal = args.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const itemRows = args.items
    .map((item) => {
      const optionsLine = item.selectedOptionsSummary ? `<div style="color:#64748b;font-size:12px;margin-top:4px;">${item.selectedOptionsSummary}</div>` : ''
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:600;color:#0f172a;">${item.name}</div>
            <div style="color:#475569;font-size:12px;">${item.vendorName}</div>
            ${optionsLine}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;">${money(item.unitPrice)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${money(item.unitPrice * item.quantity)}</td>
        </tr>
      `
    })
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">DynaLink Connect</div>
          <h1 style="margin:10px 0 0;font-size:24px;">Your Order Receipt</h1>
          <p style="margin:8px 0 0;color:#475569;">Receipt #${args.receiptNumber}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 14px;">Hi ${args.customerName},</p>
          <p style="margin:0 0 18px;color:#475569;">Thanks for your order. Here is your receipt for order <strong>#${args.receiptNumber}</strong> placed on ${args.createdAt.toLocaleString()}.</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="text-align:left;color:#64748b;font-size:12px;">
                <th style="padding-bottom:10px;">Item</th>
                <th style="padding-bottom:10px;">Qty</th>
                <th style="padding-bottom:10px;">Unit</th>
                <th style="padding-bottom:10px;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#475569;"><span>Subtotal</span><strong style="color:#0f172a;">${money(subtotal)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#475569;"><span>Delivery fee</span><strong style="color:#0f172a;">${money(args.deliveryFee)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#475569;"><span>Platform fee</span><strong style="color:#0f172a;">${money(args.platformFee)}</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;"><span>Total</span><span>${money(args.total)}</span></div>
          </div>
          <div style="margin-top:18px;color:#64748b;font-size:12px;">
            Fulfillment: ${args.fulfillmentMethod === 'pickup' ? 'Collection / Pickup' : 'Delivery'}<br />
            Order reference: ${args.orderId}
          </div>
        </div>
      </div>
    </div>
  `

  const textLines = [
    `DynaLink Connect receipt #${args.receiptNumber}`,
    `Order placed: ${args.createdAt.toLocaleString()}`,
    `Fulfillment: ${args.fulfillmentMethod === 'pickup' ? 'Collection / Pickup' : 'Delivery'}`,
    '',
    ...args.items.flatMap((item) => [
      `${item.quantity} x ${item.name} (${item.vendorName}) - ${money(item.unitPrice * item.quantity)}`,
      item.selectedOptionsSummary ? `  Options: ${item.selectedOptionsSummary}` : '',
    ].filter(Boolean)),
    '',
    `Subtotal: ${money(subtotal)}`,
    `Delivery fee: ${money(args.deliveryFee)}`,
    `Platform fee: ${money(args.platformFee)}`,
    `Total: ${money(args.total)}`,
  ]

  return {
    subject: `Your DynaLink receipt #${args.receiptNumber}`,
    html,
    text: textLines.join('\n'),
  }
}

export async function sendOrderReceipt(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      items: {
        include: {
          product: {
            select: { name: true },
          },
          vendor: {
            select: { vendorName: true, email: true },
          },
        },
      },
    },
  })

  if (!order?.user?.id) {
    return
  }

  const receiptNumber = formatOrderReceiptNumber(order.orderNumber, order.id)
  const customerName =
    [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
    order.user.name ||
    order.user.email
  const payload: OrderReceiptPayload = {
    type: 'order_receipt',
    receiptNumber,
    orderId: order.id,
    total: order.total,
    message: `Receipt #${receiptNumber} for ${money(order.total)} is ready for your order.`,
    createdAt: order.createdAt.toISOString(),
  }

  const existingInAppReceipt = await prisma.notification.findFirst({
    where: {
      recipientId: order.user.id,
      orderId: order.id,
      audience: ORDER_RECEIPT_AUDIENCE,
      channel: 'in_app',
    },
    select: { id: true },
  })

  if (!existingInAppReceipt) {
    await prisma.notification.create({
      data: {
        recipientId: order.user.id,
        audience: ORDER_RECEIPT_AUDIENCE,
        channel: 'in_app',
        title: `Receipt #${receiptNumber}`,
        message: JSON.stringify(payload),
        orderId: order.id,
        read: false,
        deliveryStatus: 'logged',
      },
    })
  }

  if (!hasSmtpConfig()) {
    return
  }

  const existingEmailReceipt = await prisma.notification.findFirst({
    where: {
      recipientId: order.user.id,
      orderId: order.id,
      audience: ORDER_RECEIPT_AUDIENCE,
      channel: 'email',
    },
    select: { id: true },
  })

  if (existingEmailReceipt || !order.user.email) {
    return
  }

  const email = buildReceiptEmail({
    customerName,
    receiptNumber,
    orderId: order.id,
    createdAt: order.createdAt,
    total: order.total,
    deliveryFee: order.deliveryFee,
    platformFee: order.platformFee,
    fulfillmentMethod: order.fulfillmentMethod,
    items: order.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      selectedOptionsSummary: item.selectedOptionsSummary,
      vendorName: item.vendor?.vendorName || item.vendor?.email || 'Admin Store',
    })),
  })

  const port = Number(process.env.SMTP_PORT || '587')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: order.user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

    await prisma.notification.create({
      data: {
        recipientId: order.user.id,
        audience: ORDER_RECEIPT_AUDIENCE,
        channel: 'email',
        title: `Receipt #${receiptNumber} emailed`,
        message: JSON.stringify(payload),
        orderId: order.id,
        read: false,
        deliveryStatus: 'sent',
        sentAt: new Date(),
      },
    })
  } catch (error) {
    await prisma.notification.create({
      data: {
        recipientId: order.user.id,
        audience: ORDER_RECEIPT_AUDIENCE,
        channel: 'email',
        title: `Receipt #${receiptNumber} email failed`,
        message: JSON.stringify(payload),
        orderId: order.id,
        read: false,
        deliveryStatus: 'failed',
        failedAt: new Date(),
      },
    })

    console.error('Order receipt email failed:', error)
  }
}
