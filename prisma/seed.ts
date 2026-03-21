import { prisma } from '../lib/prisma'

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: '$2b$10$dnmxAgrxHkEQOqARuC1hpOKbZQDjZyoqyd4sloOCdSwGSZw/iWtmW',
      role: 'admin'
    }
  })

  // Create vendor 1
  const vendor1 = await prisma.user.upsert({
    where: { email: 'vendor1@example.com' },
    update: {},
    create: {
      email: 'vendor1@example.com',
      name: 'Tech Paradise',
      password: '#Honest2025',
      role: 'vendor',
      isVendor: true,
      vendorName: 'Tech Paradise',
      vendorDescription: 'Premium electronics and gadgets',
      storeAddress: '2 Giraffe Cres, Borrowdale West',
      storeCity: 'Harare',
      storeState: 'ZWE',
      storeZipCode: '263',
      latitude: -17.8252,
      longitude: 31.0335,
      vendorPhoneNumber: '+263788006331',
      vendorVerified: true,
      vendorJoinedAt: new Date(),
      commissionRate: 10
    }
  })

  // Create vendor 2
  const vendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@example.com' },
    update: {},
    create: {
      email: 'vendor2@example.com',
      name: 'Book Emporium',
      password: '',
      role: 'vendor',
      isVendor: true,
      vendorName: 'Book Emporium',
      vendorDescription: 'Extensive collection of books and media',
      storeAddress: '456 Library Lane',
      storeCity: 'New York',
      storeState: 'NY',
      storeZipCode: '10001',
      latitude: 40.7128,
      longitude: -74.0060,
      vendorPhoneNumber: '+1 (555) 987-6543',
      vendorVerified: true,
      vendorJoinedAt: new Date(),
      commissionRate: 8
    }
  })

  // Create sample products for vendor 1
  const vendor1Products = [
    {
      name: 'Laptop',
      description: 'High-performance laptop with 16GB RAM and 512GB SSD',
      price: 999.99,
      image: 'https://via.placeholder.com/300',
      category: 'Electronics',
      stock: 10,
      vendorId: vendor1.id
    },
    {
      name: 'Wireless Headphones',
      description: 'Premium wireless headphones with noise cancellation',
      price: 249.99,
      image: 'https://via.placeholder.com/300',
      category: 'Electronics',
      stock: 25,
      vendorId: vendor1.id
    }
  ]

  // Create sample products for vendor 2
  const vendor2Products = [
    {
      name: 'Programming Book',
      description: 'Complete guide to modern web development',
      price: 39.99,
      image: 'https://via.placeholder.com/300',
      category: 'Books',
      stock: 50,
      vendorId: vendor2.id
    },
    {
      name: 'JavaScript Mastery',
      description: 'Advanced JavaScript patterns and best practices',
      price: 44.99,
      image: 'https://via.placeholder.com/300',
      category: 'Books',
      stock: 35,
      vendorId: vendor2.id
    },
    {
      name: 'Design Thinking Handbook',
      description: 'Comprehensive guide to design thinking methodology',
      price: 34.99,
      image: 'https://via.placeholder.com/300',
      category: 'Books',
      stock: 40,
      vendorId: vendor2.id
    }
  ]

  // Create all products
  const allProducts = [...vendor1Products, ...vendor2Products]
  for (const product of allProducts) {
    try {
      await prisma.product.create({
        data: product
      })
    } catch (e) {
      // Product already exists, skip
    }
  }

  console.log('Seeded database with 2 vendors and 5 products')
}

main().catch(e => console.error(e))