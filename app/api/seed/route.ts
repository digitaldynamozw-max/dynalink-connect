import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Delete related data before deleting users
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.rating.deleteMany()
    await prisma.promoCode.deleteMany()
    await prisma.referral.deleteMany()
    await prisma.supportTicket.deleteMany()
    await prisma.deliveryZone.deleteMany()
    await prisma.vendorPayout.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    
    const hashedPassword = await bcrypt.hash('password', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin',
        password: hashedPassword,
        role: 'admin'
      }
    })

    // Create sample products with better images
    await prisma.product.deleteMany()
    const products = [
      {
        name: 'MacBook Pro 16"',
        description: 'High-performance laptop for professionals and creators',
        price: 2499.99,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 10,
        salesCount: 45,
        rating: 4.8
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Latest smartphone with advanced camera and A17 Pro chip',
        price: 1199.99,
        image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 25,
        salesCount: 128,
        rating: 4.9
      },
      {
        name: 'Clean Code Book',
        description: 'Essential programming book for writing maintainable code',
        price: 45.99,
        image: 'https://images.unsplash.com/photo-150784272343-583f20270319?w=500&h=500&fit=crop',
        category: 'Books',
        stock: 50,
        salesCount: 67,
        rating: 4.9
      },
      {
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Premium wireless headphones with industry-leading noise cancellation',
        price: 379.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 15,
        salesCount: 89,
        rating: 4.7
      },
      {
        name: 'iPad Air 11"',
        description: 'Powerful tablet for work, creativity, and entertainment',
        price: 799.99,
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 12,
        salesCount: 54,
        rating: 4.6
      },
      {
        name: 'Apple Watch Ultra',
        description: 'Rugged smartwatch for adventure and fitness tracking',
        price: 799.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 8,
        salesCount: 72,
        rating: 4.8
      },
      {
        name: 'Nespresso Vertuo Plus',
        description: 'Automatic coffee maker with barista-quality espresso',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=500&h=500&fit=crop',
        category: 'Home',
        stock: 20,
        salesCount: 103,
        rating: 4.7
      },
      {
        name: 'Nike Air Max 270',
        description: 'Comfortable and stylish running shoes for everyday wear',
        price: 159.99,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
        category: 'Sports',
        stock: 40,
        salesCount: 156,
        rating: 4.5
      },
      {
        name: 'Dyson V15 Detect',
        description: 'Powerful cordless vacuum with laser detection technology',
        price: 749.99,
        image: 'https://images.unsplash.com/photo-1584622614875-e72bc58d0a41?w=500&h=500&fit=crop',
        category: 'Home',
        stock: 5,
        salesCount: 34,
        rating: 4.8
      },
      {
        name: 'Atomic Habits',
        description: 'Transform your habits and build better systems for life',
        price: 28.99,
        image: 'https://images.unsplash.com/photo-1507842313343-583f20270319?w=500&h=500&fit=crop',
        category: 'Books',
        stock: 75,
        salesCount: 234,
        rating: 4.9
      },
      {
        name: 'Sony A7R V',
        description: 'Professional mirrorless camera with cutting-edge sensor',
        price: 3998.00,
        image: 'https://images.unsplash.com/photo-1558694327-b8905e97b78f?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 3,
        salesCount: 12,
        rating: 4.9
      },
      {
        name: 'Lululemon ABC Pants',
        description: 'Premium athletic pants for work and lifestyle',
        price: 128.00,
        image: 'https://images.unsplash.com/photo-1542272604-787c62d465d1?w=500&h=500&fit=crop',
        category: 'Clothing',
        stock: 35,
        salesCount: 189,
        rating: 4.6
      },
      {
        name: 'Herman Miller Aeron Chair',
        description: 'Ergonomic office chair for comfort and posture',
        price: 1395.00,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
        category: 'Home',
        stock: 2,
        salesCount: 23,
        rating: 4.9
      },
      {
        name: 'Design of Everyday Things',
        description: 'Seminal work on user-centered design and psychology',
        price: 35.99,
        image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&h=500&fit=crop',
        category: 'Books',
        stock: 32,
        salesCount: 78,
        rating: 4.8
      },
      {
        name: 'GoPro Hero 12',
        description: 'Compact action camera for capturing life\'s adventures',
        price: 499.99,
        image: 'https://images.unsplash.com/photo-1608121078774-26373b2f6f19?w=500&h=500&fit=crop',
        category: 'Electronics',
        stock: 18,
        salesCount: 91,
        rating: 4.7
      }
    ]

    for (const product of products) {
      await prisma.product.create({
        data: product
      })
    }

    return NextResponse.json({ message: 'Seeded successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}