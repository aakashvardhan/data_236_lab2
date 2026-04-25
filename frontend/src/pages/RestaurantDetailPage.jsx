import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import StarRating from '../components/StarRating'
import { resolvePhotoUrl } from '../utils/url'
import { selectCurrentUserWithFallback, selectIsAuthenticated } from '../store/authSlice'
import {
  fetchRestaurantById,
  selectRestaurantDetailsStatus,
  selectSelectedRestaurant,
} from '../store/restaurantSlice'
import {
  createReviewAsync,
  deleteReviewAsync,
  fetchReviewsByRestaurant,
  selectReviewsByRestaurant,
  updateReviewAsync,
} from '../store/reviewSlice'
import {
  addFavouriteAsync,
  fetchFavourites,
  removeFavouriteAsync,
  selectFavourites,
} from '../store/favouritesSlice'

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const token = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUserWithFallback)
  const userId = user?.id
  const restaurant = useSelector(selectSelectedRestaurant)
  const reviews = useSelector(selectReviewsByRestaurant(id))
  const detailsStatus = useSelector(selectRestaurantDetailsStatus)
  const favourites = useSelector(selectFavourites)

  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [id])

  useEffect(() => {
    if (token) {
      dispatch(fetchFavourites())
    }
  }, [dispatch, token])

  useEffect(() => {
    setIsFavorite(favourites.some((f) => String(f.restaurant_id) === String(id)))
  }, [favourites, id])

  const fetchData = async () => {
    await Promise.all([
      dispatch(fetchRestaurantById(id)),
      dispatch(fetchReviewsByRestaurant(id)),
    ])
  }

  const handleFavorite = async () => {
    if (!token) { navigate('/login'); return }
    try {
      if (isFavorite) { await dispatch(removeFavouriteAsync(id)); setIsFavorite(false) }
      else { await dispatch(addFavouriteAsync(id)); setIsFavorite(true) }
    } catch { /* favorite toggle failure is non-critical */ }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingReviewId) {
        await dispatch(updateReviewAsync({ restaurantId: id, reviewId: editingReviewId, payload: reviewForm }))
      } else {
        await dispatch(createReviewAsync({ restaurantId: id, payload: reviewForm }))
      }
      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '' })
      setEditingReviewId(null)
      fetchData()
    } catch {
      setError('Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReview = (review) => {
    setEditingReviewId(review.id)
    setReviewForm({ rating: review.rating, comment: review.comment })
    setShowReviewForm(true)
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return
    try { await dispatch(deleteReviewAsync({ restaurantId: id, reviewId })); fetchData() } catch { /* deletion failure is non-critical */ }
  }

  if (detailsStatus === 'loading' || detailsStatus === 'idle') return <div className="flex justify-center items-center min-h-screen"><div className="text-gray-400 text-lg">Loading...</div></div>
  if (!restaurant) return <div className="text-center py-20 text-gray-400">{error || 'Restaurant not found.'}</div>

  const photos = restaurant.photos
    ? restaurant.photos.split(',').map((p) => p.trim()).filter(Boolean)
    : []

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <button onClick={() => navigate(-1)} className="text-red-600 text-sm mb-4 hover:underline">← Back to results</button>

      <div className="bg-white rounded-2xl shadow p-4 sm:p-6 mb-6">
        {/* Photos */}
        {photos.length > 0 ? (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {photos.map((photo, i) => (
              <img key={i} src={resolvePhotoUrl(photo)} alt={`${restaurant.name} photo ${i + 1}`}
                className="h-44 sm:h-48 w-64 sm:w-72 object-cover rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center text-gray-400 mb-4">
            No photos yet
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">{restaurant.name}</h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
              <span>{restaurant.cuisine_type}</span>
              <span>•</span>
              <span>{restaurant.pricing_tier || restaurant.price_tier}</span>
              {restaurant.is_claimed && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">✓ Claimed</span>
              )}
            </div>
            <div className="mt-2">
              <StarRating rating={restaurant.avg_rating} />
              <span className="text-sm text-gray-400">{restaurant.review_count} reviews</span>
            </div>
          </div>
          <button onClick={handleFavorite}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              isFavorite ? 'bg-red-600 text-white border-red-600' : 'border-red-600 text-red-600 hover:bg-red-50'
            }`}>
            {isFavorite ? '♥ Saved' : '♡ Save'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {restaurant.address && <div>📍 {restaurant.address}, {restaurant.city}, {restaurant.state}</div>}
          {restaurant.phone && <div>📞 {restaurant.phone}</div>}
          {restaurant.description && <div className="col-span-2 text-gray-500 italic">"{restaurant.description}"</div>}
        </div>

        {restaurant.hours && (
  <div className="mt-4">
    <h3 className="font-semibold text-gray-700 mb-2">Hours</h3>
    <div className="grid grid-cols-2 gap-1 text-sm text-gray-500">
      {restaurant.hours.split(',').map((h, i) => {
        const firstColon = h.indexOf(':')
        const day = h.substring(0, firstColon)
        const hours = h.substring(firstColon + 1)
        return (
          <div key={i} className="flex gap-2">
            <span className="capitalize font-medium w-10">{day?.trim()}</span>
            <span>{hours?.trim()}</span>
          </div>
        )
      })}
    </div>
  </div>
)}

        {restaurant.amenities && (
          <div className="mt-4 flex flex-wrap gap-2">
            {restaurant.amenities.split(',').map(a => (
              <span key={a} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full capitalize">
                {a.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800">Reviews</h2>
          {token && (
            <button onClick={() => { setShowReviewForm(!showReviewForm); setEditingReviewId(null); setReviewForm({ rating: 5, comment: '' }) }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
              {showReviewForm ? 'Cancel' : '+ Write Review'}
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-xl p-4 mb-6 flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <select value={reviewForm.rating}
                onChange={e => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                {[5,4,3,2,1].map(n => (
                  <option key={n} value={n}>{'⭐'.repeat(n)} {n} star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea value={reviewForm.comment}
                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                rows={3} placeholder="Share your experience..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <button type="submit" disabled={submitting}
              className="bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
              {submitting ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No reviews yet. Be the first to review!</div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map(review => (
              <div key={review.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-700">{review.user_name}</span>
                    <div className="mt-1"><StarRating rating={review.rating} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    {String(review.user_id) === String(userId) && (
                      <>
                        <button onClick={() => handleEditReview(review)} className="text-xs text-blue-500 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}