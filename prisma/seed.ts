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

  // Create sample products
  const products = [
    {
      name: 'Laptop',
      description: 'High-performance laptop',
      price: 999.99,
      image: 'https://via.placeholder.com/300',
      category: 'Electronics',
      stock: 10
    },
    {
      name: 'Phone',
      description: 'Smartphone',
      price: 599.99,
      image: 'https://via.placeholder.com/300',
      category: 'Electronics',
      stock: 20
    },
    {
      name: 'Book',
      description: 'Programming book',
      price: 29.99,
      image: 'https://via.placeholder.com/300',
      category: 'Books',
      stock: 50
    },
    {
      name: 'Headphones',
      description: 'Wireless headphones',
      price: 149.99,
      image: 'https://via.placeholder.com/300',
      category: 'Electronics',
      stock: 15
    }
  ]

  for (const product of products) {
    await prisma.product.create({
      data: product
    })
  }

  console.log('Seeded database')
}

main().catch(e => console.error(e))