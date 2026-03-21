'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

interface WishlistButtonProps {
  productId: string
  isInWishlist?: boolean
  onToggle?: (isInWishlist: boolean) => void
}

export function WishlistButton({ productId, isInWishlist = false, onToggle }: WishlistButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [inWishlist, setInWishlist] = useState(isInWishlist)
  const [loading, setLoading] = useState(false)

  async function toggleWishlist() {
    if (!session?.user?.email) {
      router.push('/auth/signin')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/wishlist', {
        method: inWishlist ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        credentials: 'include',
      })

      if (response.ok) {
        const newState = !inWishlist
        setInWishlist(newState)
        onToggle?.(newState)
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`p-2 rounded-lg transition ${
        inWishlist
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
    </button>
  )
}
