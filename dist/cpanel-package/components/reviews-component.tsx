'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Review {
  id: string
  rating: number
  title: string
  comment: string
  helpful: number
  notHelpful: number
  verified: boolean
  createdAt: string
  user: {
    name: string
    email: string
  }
}

interface ReviewsProps {
  productId: string
  averageRating: number
  reviewCount: number
}

export function ReviewsComponent({ productId, averageRating, reviewCount }: ReviewsProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ rating: 5, title: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [productId])

  async function fetchReviews() {
    try {
      const response = await fetch(`/api/reviews/${productId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setReviews(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.email) {
      alert('Please sign in to leave a review')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      if (response.ok) {
        const newReview = await response.json()
        setReviews([newReview, ...reviews])
        setFormData({ rating: 5, title: '', comment: '' })
        setShowForm(false)
        alert('Review submitted successfully!')
      } else {
        alert('Failed to submit review')
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Error submitting review')
    } finally {
      setSubmitting(false)
    }
  }

  async function markHelpful(reviewId: string, helpful: boolean) {
    try {
      const response = await fetch(`/api/reviews/${productId}/${reviewId}/helpful`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
        credentials: 'include',
      })

      if (response.ok) {
        // Update the review locally
        setReviews(reviews.map(r =>
          r.id === reviewId
            ? {
                ...r,
                helpful: helpful ? r.helpful + 1 : r.helpful,
                notHelpful: !helpful ? r.notHelpful + 1 : r.notHelpful,
              }
            : r
        ))
      }
    } catch (error) {
      console.error('Failed to mark review helpful:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h2>

        {/* Rating Summary */}
        <div className="flex items-center gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
              <div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-gray-600">{reviewCount} reviews</p>
          </div>
        </div>

        {/* Add Review Button */}
        {session?.user?.email && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition mb-6"
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        )}

        {/* Review Form */}
        {showForm && (
          <form onSubmit={submitReview} className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="focus:outline-none"
                    title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`h-8 w-8 cursor-pointer ${
                        star <= formData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Summarize your experience"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review
              </label>
              <textarea
                required
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Share your thoughts about this product"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <p className="text-gray-600">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <h4 className="font-semibold text-gray-900">{review.title}</h4>
                </div>
                {review.verified && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                    Verified Purchase
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                By {review.user.name} • {new Date(review.createdAt).toLocaleDateString()}
              </p>

              <p className="text-gray-700 mb-4">{review.comment}</p>

              <div className="flex gap-4">
                <button
                  onClick={() => markHelpful(review.id, true)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
                  title="Mark as helpful"
                  aria-label="Mark as helpful"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{review.helpful}</span>
                </button>
                <button
                  onClick={() => markHelpful(review.id, false)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition"
                  title="Mark as not helpful"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>{review.notHelpful}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
