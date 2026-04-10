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
    const candidate = `DL-${orderDateStamp()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
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
