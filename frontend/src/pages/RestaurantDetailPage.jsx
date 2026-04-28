import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchRestaurantById,
  selectSelectedRestaurant,
  selectRestaurantDetailsStatus,
} from '../store/restaurantSlice'
import {
  fetchReviewsByRestaurant,
  createReviewAsync,
  updateReviewAsync,
  deleteReviewAsync,
  selectReviewsByRestaurant,
  selectReviewSubmitStatus,
} from '../store/reviewSlice'
import { addFavorite, removeFavorite } from '../services/api'
import StarRating from '../components/StarRating'
import { resolvePhotoUrl } from '../utils/url'

// ── Lightbox ──────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-5 right-5 text-white/60 hover:text-white text-4xl leading-none z-10">×</button>
      <button onClick={e => { e.stopPropagation(); onPrev() }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-2xl z-10">‹</button>
      <img src={resolvePhotoUrl(photos[index])} alt={`photo ${index + 1}`}
        className="max-h-[88vh] max-w-[90vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
      <button onClick={e => { e.stopPropagation(); onNext() }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-2xl z-10">›</button>
      <div className="absolute bottom-5 text-white/50 text-sm">{index + 1} / {photos.length}</div>
    </div>
  )
}

// ── Hero photo grid (OpenTable style) ────────────────────────────
function PhotoSection({ photos, name }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const open = (i) => setLightboxIdx(i)
  const close = () => setLightboxIdx(null)
  const prev = () => setLightboxIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setLightboxIdx(i => (i + 1) % photos.length)

  if (!photos.length) return (
    <div className="w-full h-72 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 text-5xl mb-0">🍽️</div>
  )

  if (photos.length === 1) return (
    <>
      {lightboxIdx !== null && <Lightbox photos={photos} index={lightboxIdx} onClose={close} onPrev={prev} onNext={next} />}
      <div className="relative w-full h-80 sm:h-[420px] cursor-pointer overflow-hidden group" onClick={() => open(0)}>
        <img src={resolvePhotoUrl(photos[0])} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">🖼 1 photo</div>
      </div>
    </>
  )

  // 2+ photos: big hero left + up to 4 thumbnails right
  const mainPhoto = photos[0]
  const sidePics = photos.slice(1, 5)

  return (
    <>
      {lightboxIdx !== null && <Lightbox photos={photos} index={lightboxIdx} onClose={close} onPrev={prev} onNext={next} />}
      <div className="flex gap-2 h-80 sm:h-[420px]">
        {/* Main hero */}
        <div className="relative flex-1 cursor-pointer overflow-hidden rounded-l-2xl group" onClick={() => open(0)}>
          <img src={resolvePhotoUrl(mainPhoto)} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        {/* Right grid */}
        {sidePics.length > 0 && (
          <div className={`grid gap-2 w-44 sm:w-56 ${sidePics.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {sidePics.map((photo, i) => (
              <div key={i} className={`relative cursor-pointer overflow-hidden group ${i === 0 && sidePics.length === 1 ? 'rounded-r-2xl' : i === 1 && sidePics.length === 2 ? 'rounded-br-2xl rounded-tr-2xl' : i === 1 ? 'rounded-tr-2xl' : i === sidePics.length - 1 && sidePics.length === 4 ? 'rounded-br-2xl' : ''}`}
                onClick={() => open(i + 1)}>
                <img src={resolvePhotoUrl(photo)} alt={`photo ${i + 2}`} className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
                {/* Show all photos button on last tile */}
                {i === sidePics.length - 1 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">+{photos.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Counter */}
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <button onClick={() => open(0)} className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full transition">
            🖼 {photos.length} photos
          </button>
        </div>
      </div>
    </>
  )
}

// ── Rating bar chart ─────────────────────────────────────────────
function RatingBreakdown({ reviews }) {
  if (!reviews.length) return null
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100)
  }))
  return (
    <div className="flex gap-6 items-start mb-6 p-4 bg-gray-50 rounded-2xl">
      <div className="text-center flex-shrink-0">
        <div className="text-5xl font-bold text-gray-900">{avg}</div>
        <StarRating rating={parseFloat(avg)} />
        <div className="text-xs text-gray-400 mt-1">{reviews.length} reviews</div>
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        {counts.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 bg-red-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar map (embed via iframe) ──────────────────────────────
function MapWidget({ address, city, state }) {
  const query = encodeURIComponent(`${address}, ${city}, ${state}`)
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <iframe
        title="map"
        width="100%"
        height="200"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${query}&z=15&output=embed`}
      />
    </div>
  )
}

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')

  const restaurant = useSelector(selectSelectedRestaurant)
  const detailsStatus = useSelector(selectRestaurantDetailsStatus)
  const reviews = useSelector(selectReviewsByRestaurant(id))
  const submitStatus = useSelector(selectReviewSubmitStatus)

  const loading = detailsStatus === 'loading' || (detailsStatus === 'idle')
  const submitting = submitStatus === 'loading'

  const [isFavorite, setIsFavorite] = useState(false)
  const [tab, setTab] = useState('overview')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [error, setError] = useState('')

  const overviewRef = useRef(null)
  const photosRef = useRef(null)
  const reviewsRef = useRef(null)

  useEffect(() => {
    dispatch(fetchRestaurantById(id))
    dispatch(fetchReviewsByRestaurant(id))
  }, [id])

  const scrollTo = (ref, tabName) => {
    setTab(tabName)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleFavorite = async () => {
    if (!token) { navigate('/login'); return }
    try {
      if (isFavorite) { await removeFavorite(id); setIsFavorite(false) }
      else { await addFavorite(id); setIsFavorite(true) }
    } catch {}
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingReviewId) {
        await dispatch(updateReviewAsync({ restaurantId: id, reviewId: editingReviewId, payload: reviewForm })).unwrap()
      } else {
        await dispatch(createReviewAsync({ restaurantId: id, payload: reviewForm })).unwrap()
      }
      setShowReviewForm(false); setReviewForm({ rating: 5, comment: '' }); setEditingReviewId(null)
    } catch {
      setError('Failed to submit review.')
    }
  }

  const handleEditReview = (review) => {
    setEditingReviewId(review.id); setReviewForm({ rating: review.rating, comment: review.comment }); setShowReviewForm(true)
    scrollTo(reviewsRef, 'reviews')
  }

  const handleDeleteReview = async (reviewId) => {
    try {
      await dispatch(deleteReviewAsync({ restaurantId: id, reviewId })).unwrap()
      setConfirmDeleteId(null)
    } catch {
      setError('Failed to delete review.'); setConfirmDeleteId(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
    </div>
  )
  if (!restaurant) return <div className="text-center py-20 text-gray-400">Restaurant not found.</div>

  const photos = restaurant.photos ? restaurant.photos.split(',').map(p => p.trim()).filter(Boolean) : []
  const avg = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  const hoursList = restaurant.hours
    ? restaurant.hours.split(',').map(h => {
        const c = h.indexOf(':')
        return { day: h.substring(0, c)?.trim(), time: h.substring(c + 1)?.trim() }
      }).filter(h => h.day)
    : []

  const amenitiesList = restaurant.amenities
    ? restaurant.amenities.split(',').map(a => a.trim()).filter(Boolean)
    : []

  const amenityIcons = { wifi: '📶', outdoor_seating: '🌿', parking: '🅿️', delivery: '🛵', takeout: '🥡', reservations: '📅' }

  return (
    <div className="bg-white min-h-screen">
      {/* Back button */}
      <div className="px-10 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="text-red-600 text-sm hover:underline flex items-center gap-1 font-medium">
          ← Back to results
        </button>
      </div>

      {/* Photo Grid — full width */}
      <div className="w-full mb-0 relative">
        <PhotoSection photos={photos} name={restaurant.name} />
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-10 flex items-center gap-1 overflow-x-auto">
          {[['overview','Overview'],['photos','Photos'],['reviews','Reviews'],['details','Details']].map(([t, label]) => (
            <button key={t}
              onClick={() => {
                if (t === 'overview') scrollTo(overviewRef, t)
                else if (t === 'photos') scrollTo(photosRef, t)
                else if (t === 'reviews') scrollTo(reviewsRef, t)
                else if (t === 'details') scrollTo(reviewsRef, t)
                setTab(t)
              }}
              className={`px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="px-10 py-8 flex flex-col lg:flex-row gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Overview section */}
          <div ref={overviewRef} className="bg-white rounded-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{restaurant.name}</h1>
                  {restaurant.is_claimed && (
                    <span className="bg-green-100 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">✓ Verified</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-base mt-2 flex-wrap">
                  {avg && <span className="font-semibold text-gray-800">{avg} ⭐</span>}
                  {avg && <span>·</span>}
                  <span>{restaurant.cuisine_type}</span>
                  <span>·</span>
                  <span>{restaurant.pricing_tier || restaurant.price_tier}</span>
                </div>
              </div>
              <button onClick={handleFavorite}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition flex-shrink-0 ${
                  isFavorite ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600'
                }`}>
                {isFavorite ? '♥ Saved' : '♡ Save'}
              </button>
            </div>

            {/* Amenity tags */}
            {amenitiesList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {amenitiesList.map(a => (
                  <span key={a} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full capitalize font-medium">
                    <span>{amenityIcons[a] || '✓'}</span> {a.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {restaurant.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{restaurant.description}</p>
            )}
          </div>

          {/* Photos section */}
          <div ref={photosRef} className="bg-white rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Photos</h2>
            {photos.length === 0 ? (
              <div className="text-center py-10 text-gray-300 text-4xl">🍽️</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer group">
                    <img src={resolvePhotoUrl(photo)} alt={`${restaurant.name} ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews section */}
          <div ref={reviewsRef} className="bg-white rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
              {token && (
                <button onClick={() => { setShowReviewForm(!showReviewForm); setEditingReviewId(null); setReviewForm({ rating: 5, comment: '' }) }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                  {showReviewForm ? 'Cancel' : '+ Write Review'}
                </button>
              )}
            </div>

            {/* Rating breakdown bar chart */}
            <RatingBreakdown reviews={reviews} />

            {/* Error */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-4 font-bold text-red-400 hover:text-red-600">×</button>
              </div>
            )}

            {/* Review form */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-xl p-4 mb-6 flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n} star{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                  <textarea value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={3} placeholder="Share your experience..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <button type="submit" disabled={submitting}
                  className="bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                  {submitting ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Submit Review'}
                </button>
              </form>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-3xl mb-2">💬</div>
                <p>No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {reviews.map(review => (
                  <div key={review.id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(review.user_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{review.user_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                      {String(review.user_id) === String(userId) && (
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <button onClick={() => handleEditReview(review)} className="text-xs text-blue-500 hover:underline">Edit</button>
                          {confirmDeleteId === review.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Delete?</span>
                              <button onClick={() => handleDeleteReview(review.id)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition">Yes</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded hover:bg-gray-200 transition">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(review.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="lg:w-80 xl:w-96 flex flex-col gap-4 flex-shrink-0">

          {/* Map */}
          {restaurant.address && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <MapWidget address={restaurant.address} city={restaurant.city} state={restaurant.state} />
              <div className="p-4 flex flex-col gap-1.5 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">📍</span>
                  <span className="font-medium text-gray-800">{restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}</span>
                </div>
                {restaurant.phone && (
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <a href={`tel:${restaurant.phone}`} className="text-red-600 hover:underline">{restaurant.phone}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details card */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Details</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5 text-base">🍽️</span>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Cuisine</div>
                  <div className="text-gray-700">{restaurant.cuisine_type}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5 text-base">💰</span>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Price</div>
                  <div className="text-gray-700">{restaurant.pricing_tier || restaurant.price_tier}</div>
                </div>
              </div>
              {restaurant.city && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 mt-0.5 text-base">🏘️</span>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Neighborhood</div>
                    <div className="text-gray-700">{restaurant.city}</div>
                  </div>
                </div>
              )}
              {restaurant.is_claimed && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 mt-0.5 text-base">✅</span>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Status</div>
                    <div className="text-green-600 font-medium">Verified Owner</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hours card */}
          {hoursList.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">🕐 Hours of Operation</h3>
              <div className="flex flex-col gap-1.5">
                {hoursList.map(({ day, time }, i) => {
                  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()
                  const isToday = day?.toLowerCase().startsWith(today.slice(0, 3))
                  return (
                    <div key={i} className={`flex justify-between text-sm py-1 border-b border-gray-50 last:border-0 ${isToday ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      <span className="capitalize">{day}</span>
                      <span className={time?.toLowerCase() === 'closed' ? 'text-red-400' : isToday ? 'text-red-600' : ''}>
                        {isToday && <span className="text-xs text-red-500 mr-1">Today</span>}
                        {time}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Amenities card */}
          {amenitiesList.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Amenities</h3>
              <div className="grid grid-cols-2 gap-2">
                {amenitiesList.map(a => (
                  <div key={a} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <span>{amenityIcons[a] || '✓'}</span>
                    <span className="capitalize">{a.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
