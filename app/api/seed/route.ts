import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Create admin user
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

    // Create sample products
    await prisma.product.deleteMany()
    const products = [
      {
        name: 'Laptop',
        description: 'High-performance laptop for work and gaming',
        price: 999.99,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
        category: 'Electronics',
        stock: 10,
        salesCount: 45,
        rating: 4.5
      },
      {
        name: 'Phone',
        description: 'Latest smartphone with advanced features',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
        category: 'Electronics',
        stock: 20,
        salesCount: 78,
        rating: 4.2
      },
      {
        name: 'Book',
        description: 'Programming book for beginners',
        price: 29.99,
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop',
        category: 'Books',
        stock: 50,
        salesCount: 23,
        rating: 4.8
      },
      {
        name: 'Headphones',
        description: 'Wireless headphones with noise cancellation',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        category: 'Electronics',
        stock: 15,
        salesCount: 67,
        rating: 4.3
      },
      {
        name: 'Tablet',
        description: 'Portable tablet for work and entertainment',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop',
        category: 'Electronics',
        stock: 12,
        salesCount: 34,
        rating: 4.1
      },
      {
        name: 'Smart Watch',
        description: 'Fitness tracking smartwatch',
        price: 249.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
        category: 'Electronics',
        stock: 8,
        salesCount: 56,
        rating: 4.4
      },
      {
        name: 'Coffee Maker',
        description: 'Automatic coffee maker for home',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
        category: 'Home',
        stock: 25,
        salesCount: 41,
        rating: 4.6
      },
      {
        name: 'Running Shoes',
        description: 'Comfortable running shoes',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
        category: 'Sports',
        stock: 30,
        salesCount: 89,
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