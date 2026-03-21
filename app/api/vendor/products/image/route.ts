import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const productId = formData.get('productId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Verify product belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true }
    })

    if (!product || product.vendorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 403 }
      )
    }

    // Convert to base64 for storage
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Update product image
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { image: dataUrl }
    })

    return NextResponse.json({
      success: true,
      image: updatedProduct.image,
      message: 'Product image uploaded successfully'
    })
  } catch (error) {
    console.error('Product image upload error:', error)
    return NextResponse.json({ error: 'Failed to upload product image' }, { status: 500 })
  }
}
