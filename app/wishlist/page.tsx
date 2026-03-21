'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, ShoppingCart, Heart } from 'lucide-react'

interface WishlistProduct {
  id: string
  name: string
  description?: string
  price: number
  salePrice?: number | null
  onSale?: boolean
  image?: string | null
  category?: string | null
  stock: number
}

export default function WishlistPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.email) {
      router.push('/auth/signin')
      return
    }
    fetchWishlist()
  }, [session, router])

  async function fetchWishlist() {
    try {
      const response = await fetch('/api/wishlist', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setWishlistItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeFromWishlist(productId: string) {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        credentials: 'include',
      })
      if (response.ok) {
        setWishlistItems(wishlistItems.filter(p => p.id !== productId))
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error)
    }
  }

  async function addToCart(product: WishlistProduct) {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          price: product.onSale && product.salePrice ? product.salePrice : product.price,
        }),
        credentials: 'include',
      })
      if (response.ok) {
        alert('Added to cart!')
        await removeFromWishlist(product.id)
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-red-600" />
            <h1 className="text-4xl font-bold text-gray-900">My Wishlist</h1>
          </div>
          <p className="text-gray-600">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-6">
              Start adding products to your wishlist to save them for later
            </p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.map(product => {
              const displayPrice = product.onSale && product.salePrice ? product.salePrice : product.price
              const discountedPrice = product.onSale && product.salePrice ? product.salePrice : null

              return (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden group">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link
                      href={`/products/${product.id}`}
                      className="block hover:text-blue-600"
                    >
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>

                    {/* Pricing */}
                    <div className="mt-3 flex items-baseline gap-2">
                      {product.onSale && product.salePrice ? (
                        <>
                          <span className="text-lg font-bold text-red-600">
                            ${product.salePrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className={`text-xs font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm">Add</span>
                      </button>
                      <button
                        onClick={() => removeFromWishlist(product.id)}
                        className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
