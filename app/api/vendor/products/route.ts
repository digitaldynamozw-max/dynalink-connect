import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeProductPayload } from '@/lib/product-payload'
import { resolveActingVendorId } from '@/lib/vendor-actor'

// GET vendor's products
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = resolveActingVendorId(request, session).vendorId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      where: { vendorId: userId },
      include: {
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
            name: true,
          },
        },
        ratings: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            verified: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        orderItems: {
          include: { order: true }
        }
      }
    })

    return NextResponse.json(products.map((product) => serializeProductPayload(product)))
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = resolveActingVendorId(request, session).vendorId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user?.isVendor) {
      return NextResponse.json(
        { error: 'Only vendors can create products' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      salePrice,
      onSale,
      image,
      category,
      stock,
      optionGroupsJson,
      specificationsJson,
    } = body

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        vendorId: userId,
        name,
        description,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        onSale: onSale || false,
        image,
        category,
        stock: parseInt(stock) || 0,
        optionGroupsJson: optionGroupsJson || null,
        specificationsJson: specificationsJson || null,
      }
    })

    const hydratedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(serializeProductPayload(hydratedProduct || product))
  } catch {
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
