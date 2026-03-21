'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import { Star, ShoppingCart, Truck, Shield } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  price: number
  salePrice?: number
  onSale?: boolean
  image?: string
  category?: string
  stock: number
  salesCount: number
  rating: number
  vendorId?: string
}

export default function ProductDetailsPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    if (!productId) return

    const fetchProduct = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) {
          throw new Error('Product not found')
        }
        const data = await res.json()
        setProduct(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddToCart = () => {
    if (!product) return
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.onSale && product.salePrice ? product.salePrice : product.price,
        image: product.image,
      })
    }
    
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link href="/products" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            View All Products
          </Link>
        </div>
      </div>
    )
  }

  const displayPrice = product.onSale && product.salePrice ? product.salePrice : product.price
  const originalPrice = product.price
  const discountPercentage = product.onSale && product.salePrice 
    ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
          <span className="text-gray-400">/</span>
          <Link href="/products" className="text-blue-600 hover:text-blue-700">Products</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Image Section */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg relative">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-96 max-w-96 object-contain"
                />
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">No Image Available</span>
                </div>
              )}
              
              {product.onSale && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold">
                  SALE -{discountPercentage}%
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="flex flex-col">
              {/* Category */}
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {product.category || 'Uncategorized'}
                </span>
              </div>

              {/* Name and Rating */}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-lg font-semibold text-gray-900">{product.rating}</span>
                </div>
                <span className="text-gray-600">({product.salesCount} sold)</span>
              </div>

              {/* Price Section */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-gray-900">${displayPrice.toFixed(2)}</span>
                    {product.onSale && product.salePrice && (
                      <span className="text-2xl text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {product.onSale && (
                    <span className="text-lg font-bold text-red-600 bg-red-100 px-3 py-1 rounded">
                      Save ${(originalPrice - displayPrice).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Stock Status */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                {product.stock > 0 ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    In Stock ({product.stock} available)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    Out of Stock
                  </div>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div className="mb-8 flex gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stock === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setQuantity(Math.max(1, Math.min(val, product.stock)))
                    }}
                    min="1"
                    max={product.stock}
                    title="Product quantity"
                    placeholder="1"
                    className="w-16 text-center border-0 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={product.stock === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                    addedToCart
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-gray-200 pt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Free shipping on orders over $100</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">30-day money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
