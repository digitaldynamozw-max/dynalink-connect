import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

function orderDateStamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function getStoreKey(vendorId?: string | null) {
  return vendorId || 'admin-store'
}

export function getStoreLabel(vendorName?: string | null) {
  return vendorName || 'Admin Store'
}

export async function generateUniqueOrderNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = String(crypto.randomInt(100000, 1000000))
    const existing = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }
  }

  throw new Error('Failed to generate a unique order number')
}

export function formatOrderReceiptNumber(orderNumber?: string | null, orderId?: string) {
  if (orderNumber && /^\d{6}$/.test(orderNumber)) {
    return orderNumber
  }

  const digits = (orderNumber || '').replace(/\D/g, '')
  if (digits.length >= 6) {
    return digits.slice(-6)
  }

  const source = orderNumber || orderId || '000000'
  const hash = crypto.createHash('sha1').update(source).digest('hex')
  const numeric = parseInt(hash.slice(0, 8), 16) % 900000
  return String(100000 + numeric).padStart(6, '0')
}
