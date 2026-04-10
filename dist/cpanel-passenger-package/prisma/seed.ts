import path from 'path'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { serializeWeeklyHours, getDefaultWeeklyHours } from '../lib/store-hours'
import { getDefaultDeliveryNotificationPreferences } from '../lib/courier-tracking'
import { additionalVendorSeeds, type ProductSeed, type VendorSeed } from './sample-vendors'

const localSqlitePath = path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${localSqlitePath}`,
    },
  },
})

async function upsertProduct(
  vendorId: string,
  data: ProductSeed
) {
  const existing = await prisma.product.findFirst({
    where: {
      vendorId,
      name: data.name,
    },
  })

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.product.create({
    data: {
      ...data,
      vendorId,
    },
  })
}

async function upsertVendor(
  hashedPassword: string,
  defaultHours: string,
  defaultNotificationPreferences: string,
  vendor: VendorSeed
) {
  return prisma.user.upsert({
    where: { email: vendor.email },
    update: {
      name: vendor.name,
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: vendor.vendorName,
      vendorDescription: vendor.vendorDescription,
      vendorCategory: vendor.vendorCategory,
      vendorImage: vendor.vendorImage,
      storeBannerImage: vendor.storeBannerImage,
      vendorPriority: vendor.vendorPriority,
      storeAddress: vendor.storeAddress,
      storeCity: vendor.storeCity,
      storeState: vendor.storeState,
      storeZipCode: vendor.storeZipCode,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      vendorPhoneNumber: vendor.vendorPhoneNumber,
      vendorVerified: true,
      vendorJoinedAt: new Date(vendor.vendorJoinedAt),
      commissionRate: vendor.commissionRate,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: vendor.email,
      name: vendor.name,
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: vendor.vendorName,
      vendorDescription: vendor.vendorDescription,
      vendorCategory: vendor.vendorCategory,
      vendorImage: vendor.vendorImage,
      storeBannerImage: vendor.storeBannerImage,
      vendorPriority: vendor.vendorPriority,
      storeAddress: vendor.storeAddress,
      storeCity: vendor.storeCity,
      storeState: vendor.storeState,
      storeZipCode: vendor.storeZipCode,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      vendorPhoneNumber: vendor.vendorPhoneNumber,
      vendorVerified: true,
      vendorJoinedAt: new Date(vendor.vendorJoinedAt),
      commissionRate: vendor.commissionRate,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })
}

async function main() {
  const hashedPassword = await bcrypt.hash('password', 10)
  const defaultHours = serializeWeeklyHours(getDefaultWeeklyHours())
  const defaultNotificationPreferences = JSON.stringify(getDefaultDeliveryNotificationPreferences())

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })

  const courier = await prisma.user.upsert({
    where: { email: 'courier1@example.com' },
    update: {
      name: 'Tariro Rider',
      password: hashedPassword,
      role: 'courier',
      mobileNumber: '+263772111222',
      isActive: true,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: 'courier1@example.com',
      name: 'Tariro Rider',
      password: hashedPassword,
      role: 'courier',
      mobileNumber: '+263772111222',
      isActive: true,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      name: 'Sample Customer',
      password: hashedPassword,
      role: 'user',
      mobileNumber: '+263772000999',
      deliveryAddress: '12 Samora Machel Ave, Harare',
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: 'customer@example.com',
      name: 'Sample Customer',
      password: hashedPassword,
      role: 'user',
      mobileNumber: '+263772000999',
      deliveryAddress: '12 Samora Machel Ave, Harare',
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })

  const vendor1 = await prisma.user.upsert({
    where: { email: 'vendor1@example.com' },
    update: {
      name: 'Tech Paradise',
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: 'Tech Paradise',
      vendorDescription: 'Premium electronics and everyday gadgets',
      storeAddress: '2 Giraffe Cres, Borrowdale West',
      storeCity: 'Harare',
      storeState: 'Harare',
      storeZipCode: '263',
      latitude: -17.8252,
      longitude: 31.0335,
      vendorPhoneNumber: '+263788006331',
      vendorVerified: true,
      vendorJoinedAt: new Date('2026-01-10T08:00:00Z'),
      commissionRate: 10,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: 'vendor1@example.com',
      name: 'Tech Paradise',
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: 'Tech Paradise',
      vendorDescription: 'Premium electronics and everyday gadgets',
      storeAddress: '2 Giraffe Cres, Borrowdale West',
      storeCity: 'Harare',
      storeState: 'Harare',
      storeZipCode: '263',
      latitude: -17.8252,
      longitude: 31.0335,
      vendorPhoneNumber: '+263788006331',
      vendorVerified: true,
      vendorJoinedAt: new Date('2026-01-10T08:00:00Z'),
      commissionRate: 10,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })

  const vendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@example.com' },
    update: {
      name: 'Home & Style Studio',
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: 'Home & Style Studio',
      vendorDescription: 'Home essentials, books, and lifestyle favorites',
      storeAddress: '17 Samora Machel Avenue',
      storeCity: 'Harare',
      storeState: 'Harare',
      storeZipCode: '263',
      latitude: -17.8292,
      longitude: 31.0522,
      vendorPhoneNumber: '+263719555120',
      vendorVerified: true,
      vendorJoinedAt: new Date('2026-01-18T08:00:00Z'),
      commissionRate: 8,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
    create: {
      email: 'vendor2@example.com',
      name: 'Home & Style Studio',
      password: hashedPassword,
      role: 'vendor',
      isVendor: true,
      vendorName: 'Home & Style Studio',
      vendorDescription: 'Home essentials, books, and lifestyle favorites',
      storeAddress: '17 Samora Machel Avenue',
      storeCity: 'Harare',
      storeState: 'Harare',
      storeZipCode: '263',
      latitude: -17.8292,
      longitude: 31.0522,
      vendorPhoneNumber: '+263719555120',
      vendorVerified: true,
      vendorJoinedAt: new Date('2026-01-18T08:00:00Z'),
      commissionRate: 8,
      weeklyOpeningHours: defaultHours,
      temporarilyClosed: false,
      notificationPreferencesJson: defaultNotificationPreferences,
    },
  })

  const vendor1Products = [
    {
      name: 'MacBook Pro 16"',
      description: 'High-performance laptop for professionals and creators.',
      price: 2499.99,
      salePrice: 2299.99,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 8,
      salesCount: 45,
      rating: 4.8,
      averageRating: 4.8,
      reviewCount: 24,
    },
    {
      name: 'iPhone 15 Pro',
      description: 'Flagship smartphone with advanced camera performance and premium finish.',
      price: 1199.99,
      image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 21,
      salesCount: 128,
      rating: 4.9,
      averageRating: 4.9,
      reviewCount: 58,
    },
    {
      name: 'Sony WH-1000XM5 Headphones',
      description: 'Wireless noise-canceling headphones with rich audio and all-day comfort.',
      price: 379.99,
      salePrice: 349.99,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 14,
      salesCount: 89,
      rating: 4.7,
      averageRating: 4.7,
      reviewCount: 41,
    },
    {
      name: 'Apple Watch Ultra',
      description: 'Rugged smartwatch built for training, adventure, and daily health tracking.',
      price: 799.99,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 7,
      salesCount: 72,
      rating: 4.8,
      averageRating: 4.8,
      reviewCount: 33,
    },
    {
      name: 'GoPro Hero 12',
      description: 'Compact action camera for travel, sports, and outdoor adventure.',
      price: 499.99,
      image: 'https://images.unsplash.com/photo-1608121078774-26373b2f6f19?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 18,
      salesCount: 91,
      rating: 4.7,
      averageRating: 4.7,
      reviewCount: 28,
    },
    {
      name: 'Portable Bluetooth Speaker',
      description: 'Water-resistant speaker with punchy sound and long battery life.',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&h=800&fit=crop',
      category: 'Electronics',
      stock: 34,
      salesCount: 63,
      rating: 4.5,
      averageRating: 4.5,
      reviewCount: 19,
    },
  ]

  const vendor2Products = [
    {
      name: 'Atomic Habits',
      description: 'A practical guide to building good habits and breaking bad ones.',
      price: 28.99,
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=800&fit=crop',
      category: 'Books',
      stock: 75,
      salesCount: 234,
      rating: 4.9,
      averageRating: 4.9,
      reviewCount: 102,
    },
    {
      name: 'Design of Everyday Things',
      description: 'A classic on user-centered design, usability, and product thinking.',
      price: 35.99,
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&h=800&fit=crop',
      category: 'Books',
      stock: 32,
      salesCount: 78,
      rating: 4.8,
      averageRating: 4.8,
      reviewCount: 29,
    },
    {
      name: 'Nespresso Vertuo Plus',
      description: 'Automatic coffee machine for quick espresso and smooth morning brews.',
      price: 199.99,
      salePrice: 179.99,
      onSale: true,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop',
      category: 'Home',
      stock: 20,
      salesCount: 103,
      rating: 4.7,
      averageRating: 4.7,
      reviewCount: 37,
    },
    {
      name: 'Dyson V15 Detect',
      description: 'Powerful cordless vacuum with laser dust detection.',
      price: 749.99,
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=800&fit=crop',
      category: 'Home',
      stock: 5,
      salesCount: 34,
      rating: 4.8,
      averageRating: 4.8,
      reviewCount: 16,
    },
    {
      name: 'Linen Throw Pillow Set',
      description: 'Soft neutral-toned pillow covers for a warm, modern living room.',
      price: 42.0,
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=800&fit=crop',
      category: 'Home',
      stock: 27,
      salesCount: 57,
      rating: 4.4,
      averageRating: 4.4,
      reviewCount: 14,
    },
    {
      name: 'Ceramic Table Lamp',
      description: 'Minimal bedside lamp with warm ambient lighting and a matte finish.',
      price: 64.99,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=800&fit=crop',
      category: 'Home',
      stock: 16,
      salesCount: 39,
      rating: 4.6,
      averageRating: 4.6,
      reviewCount: 11,
    },
  ]

  for (const product of vendor1Products) {
    await upsertProduct(vendor1.id, product)
  }

  for (const product of vendor2Products) {
    await upsertProduct(vendor2.id, product)
  }

  let additionalProductCount = 0

  for (const vendorSeed of additionalVendorSeeds) {
    const vendor = await upsertVendor(
      hashedPassword,
      defaultHours,
      defaultNotificationPreferences,
      vendorSeed
    )

    for (const product of vendorSeed.products) {
      await upsertProduct(vendor.id, product)
      additionalProductCount += 1
    }
  }

  await prisma.order.deleteMany({
    where: {
      userId: customer.id,
    },
  })

  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'DL-SEED-0001',
      userId: customer.id,
      total: 2679.98,
      status: 'accepted',
      deliveryAddress: customer.deliveryAddress,
      deliveryFee: 12,
      items: {
        create: [
          {
            productId: (
              await prisma.product.findFirstOrThrow({
                where: { vendorId: vendor1.id, name: 'MacBook Pro 16"' },
                select: { id: true },
              })
            ).id,
            vendorId: vendor1.id,
            quantity: 1,
            price: 2499.99,
            status: 'accepted',
            preparationMinutes: 15,
            estimatedDeliveryMinutes: 45,
            deliveryFee: 6,
            vendorEarnings: 2250,
          },
          {
            productId: (
              await prisma.product.findFirstOrThrow({
                where: { vendorId: vendor2.id, name: 'Atomic Habits' },
                select: { id: true },
              })
            ).id,
            vendorId: vendor2.id,
            quantity: 1,
            price: 28.99,
            status: 'pending',
            preparationMinutes: 5,
            estimatedDeliveryMinutes: 35,
            deliveryFee: 6,
            vendorEarnings: 24,
          },
        ],
      },
    },
  })

  const firstOrderItem = await prisma.orderItem.findFirst({
    where: { orderId: sampleOrder.id },
    orderBy: { id: 'asc' },
  })

  if (firstOrderItem) {
    await prisma.notification.createMany({
      data: [
        {
          recipientId: courier.id,
          audience: 'courier_assignment',
          title: 'Seeded courier assignment',
          message: 'You have been assigned to a seeded delivery.',
          orderId: sampleOrder.id,
          orderItemId: firstOrderItem.id,
          channel: 'in_app',
          deliveryStatus: 'sent',
          sentAt: new Date(),
        },
        {
          recipientId: customer.id,
          audience: 'delivery_customer_update',
          title: 'Seeded rider assignment',
          message: JSON.stringify({
            type: 'rider_assigned',
            title: 'Seeded rider assignment',
            message: 'A courier has been assigned to your seeded order.',
            channel: 'in_app',
            requestedChannels: ['in_app', 'email'],
            createdAt: new Date().toISOString(),
            orderId: sampleOrder.id,
            orderItemId: firstOrderItem.id,
          }),
          orderId: sampleOrder.id,
          orderItemId: firstOrderItem.id,
          channel: 'in_app',
          deliveryStatus: 'sent',
          sentAt: new Date(),
        },
      ],
    })
  }

  console.log(
    `Seeded database with ${2 + additionalVendorSeeds.length} vendors, 1 courier, 1 customer, and ${vendor1Products.length + vendor2Products.length + additionalProductCount} sample products`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
