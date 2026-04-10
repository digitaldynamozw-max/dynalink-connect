import { prisma } from '../lib/prisma'

async function main() {
  const shouldApply = process.argv.includes('--apply')

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentMethod: 'pickup',
    },
    select: {
      id: true,
      orderNumber: true,
      deliveryAddress: true,
      items: {
        select: {
          vendor: {
            select: {
              vendorName: true,
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

  const repairs = orders
    .map((order) => {
      const vendor = order.items.find((item) => item.vendor)?.vendor
      const vendorAddress = [vendor?.storeAddress, vendor?.storeCity, vendor?.storeState]
        .filter(Boolean)
        .join(', ')

      if (!vendorAddress || vendorAddress === order.deliveryAddress) {
        return null
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        currentAddress: order.deliveryAddress || '',
        nextAddress: vendorAddress,
        vendorName: vendor?.vendorName || 'Unknown vendor',
      }
    })
    .filter((repair): repair is NonNullable<typeof repair> => Boolean(repair))

  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Pickup orders scanned: ${orders.length}`)
  console.log(`Pickup orders needing address repair: ${repairs.length}`)
  console.log('')

  for (const repair of repairs) {
    console.log(`Order #${repair.orderNumber} (${repair.vendorName})`)
    console.log(`  Current: ${repair.currentAddress || '[empty]'}`)
    console.log(`  Next:    ${repair.nextAddress}`)
    console.log('')
  }

  if (!shouldApply) {
    console.log('Dry run complete. Re-run with --apply to persist repaired pickup addresses.')
    return
  }

  for (const repair of repairs) {
    await prisma.order.update({
      where: { id: repair.orderId },
      data: {
        deliveryAddress: repair.nextAddress,
      },
    })
  }

  console.log('Pickup order address repair applied successfully.')
}

main()
  .catch((error) => {
    console.error('Pickup order address repair failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
