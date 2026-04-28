import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StarRating from '../components/StarRating'
import axios from 'axios'
import { getRestaurant, getReviews, getOwnerAnalytics } from '../services/api'
import { resolvePhotoUrl } from '../utils/url'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const AMENITIES = ['wifi', 'outdoor_seating', 'parking', 'delivery', 'takeout', 'reservations']

const apiBase = () => {
  const raw = import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'
  return raw.replace(/\/$/, '')
}

function SentimentBadge({ text }) {
  if (!text) return null
  const lower = text.toLowerCase()
  const positive = ['excellent','great','good','love','amazing','fantastic','wonderful','best','delicious','perfect']
  const negative = ['bad','terrible','awful','poor','worst','horrible','disappointing','slow','rude']
  const posCount = positive.filter(w => lower.includes(w)).length
  const negCount = negative.filter(w => lower.includes(w)).length
  if (posCount > negCount) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">😊 Positive</span>
  if (negCount > posCount) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">😞 Negative</span>
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">😐 Neutral</span>
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = parseFloat(value) || 0
    let start = 0
    const step = target / 30
    const interval = setInterval(() => {
      start += step
      if (start >= target) { setDisplay(target); clearInterval(interval) }
      else setDisplay(parseFloat(start.toFixed(1)))
    }, 30)
    return () => clearInterval(interval)
  }, [value])
  return <>{display}</>
}

function ClaimModal({ restaurant, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [claimed, setClaimed] = useState(false)

  const handleClaim = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${apiBase()}/restaurants/${restaurant.id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setClaimed(true)
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to claim. This restaurant may already be claimed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">🏪</div>
            <div>
              <h2 className="font-bold">Claim Restaurant</h2>
              <p className="text-green-100 text-xs">{restaurant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {!claimed ? (
            <div className="flex flex-col gap-4">
              {/* Restaurant info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{restaurant.address}, {restaurant.city}, {restaurant.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🍽️</span>
                  <span>{restaurant.cuisine_type} • {restaurant.pricing_tier || restaurant.price_tier}</span>
                </div>
              </div>

              {/* What you get */}
              <div className="flex flex-col gap-2">
                {['Edit details, hours & photos', 'Access analytics & reviews', 'Verified owner badge'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                    {item}
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleClaim} disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Claiming...</>
                    : '✓ Claim It'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-3xl animate-bounce">🎉</div>
              <h3 className="font-bold text-lg text-gray-800">Successfully Claimed!</h3>
              <p className="text-gray-500 text-sm">You are now the verified owner of <strong>{restaurant.name}</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab({ restaurantId, reviews, restaurant }) {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    getOwnerAnalytics(restaurantId).then(res => setAnalytics(res.data)).catch(() => {})
  }, [restaurantId])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0

  const ratingCounts = [5,4,3,2,1].map(star => ({
    star, count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }))

  const positiveCount = reviews.filter(r => r.rating >= 4).length
  const negativeCount = reviews.filter(r => r.rating <= 2).length
  const neutralCount = reviews.filter(r => r.rating === 3).length
  const sentimentScore = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 0

  const monthlyData = (() => {
    const months = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString('default', { month: 'short' })
      months[key] = { count: 0, totalRating: 0 }
    }
    reviews.forEach(r => {
      const key = new Date(r.created_at).toLocaleString('default', { month: 'short' })
      if (months[key]) { months[key].count++; months[key].totalRating += r.rating }
    })
    return Object.entries(months).map(([month, data]) => ({
      month, count: data.count,
      avg: data.count > 0 ? (data.totalRating / data.count).toFixed(1) : 0
    }))
  })()
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1)

  const keywords = (() => {
    const wordCount = {}
    const stopwords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','was','it','this','that','i','we','my','very','so','are','be','have','had','they','their'])
    reviews.forEach(r => {
      if (!r.comment) return
      r.comment.toLowerCase().split(/\s+/).forEach(w => {
        const clean = w.replace(/[^a-z]/g,'')
        if (clean.length > 3 && !stopwords.has(clean)) wordCount[clean] = (wordCount[clean] || 0) + 1
      })
    })
    return Object.entries(wordCount).sort((a,b) => b[1]-a[1]).slice(0,12)
  })()

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', value: reviews.length, suffix: '', icon: '📝', color: 'from-blue-500 to-blue-600' },
          { label: 'Avg Rating', value: avgRating, suffix: '★', icon: '⭐', color: 'from-yellow-500 to-amber-500' },
          { label: 'Satisfaction', value: sentimentScore, suffix: '%', icon: '😊', color: 'from-green-500 to-emerald-600' },
          { label: 'Est. Views', value: analytics?.total_views || reviews.length * 12, suffix: '', icon: '👁️', color: 'from-purple-500 to-purple-600' },
        ].map(({ label, value, suffix, icon, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold"><AnimatedNumber value={value} />{suffix}</div>
            <div className="text-white/80 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Sentiment */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold text-gray-800 mb-4">🧠 Sentiment Analysis</h3>
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No reviews yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative h-6 rounded-full overflow-hidden bg-gray-100 flex">
              <div className="h-full bg-green-400 transition-all duration-1000 flex items-center justify-center text-xs text-white font-semibold"
                style={{ width: `${(positiveCount / reviews.length) * 100}%` }}>
                {positiveCount > 0 && `${Math.round((positiveCount / reviews.length) * 100)}%`}
              </div>
              <div className="h-full bg-gray-300 transition-all duration-1000" style={{ width: `${(neutralCount / reviews.length) * 100}%` }} />
              <div className="h-full bg-red-400 transition-all duration-1000 flex items-center justify-center text-xs text-white font-semibold"
                style={{ width: `${(negativeCount / reviews.length) * 100}%` }}>
                {negativeCount > 0 && `${Math.round((negativeCount / reviews.length) * 100)}%`}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Positive ({positiveCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Neutral ({neutralCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Negative ({negativeCount})</span>
            </div>
            <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-3 ${
              sentimentScore >= 70 ? 'bg-green-50 text-green-800 border border-green-200' :
              sentimentScore >= 40 ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span className="text-xl">{sentimentScore >= 70 ? '🚀' : sentimentScore >= 40 ? '📈' : '⚠️'}</span>
              <div>
                <div className="font-semibold">{sentimentScore >= 70 ? 'Excellent public sentiment!' : sentimentScore >= 40 ? 'Mixed reviews — room to grow' : 'Needs improvement'}</div>
                <div className="text-xs opacity-80">{sentimentScore >= 70 ? 'Your customers love you. Keep it up!' : sentimentScore >= 40 ? 'Focus on addressing negative feedback.' : 'Consider responding to reviews and improving service.'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating + Monthly Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 mb-4">⭐ Rating Breakdown</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800">{avgRating}</div>
              <StarRating rating={parseFloat(avgRating)} />
              <div className="text-xs text-gray-400 mt-1">{reviews.length} reviews</div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {ratingCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{star}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${star >= 4 ? 'bg-green-400' : star === 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 mb-4">📅 Reviews Over Time</h3>
          <div className="flex items-end gap-2 h-28">
            {monthlyData.map(({ month, count }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">{count > 0 ? count : ''}</span>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max((count / maxCount) * 80, count > 0 ? 8 : 2)}px`, backgroundColor: count > 0 ? '#ef4444' : '#f3f4f6' }} />
                <span className="text-xs text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-800 mb-4">💬 Top Keywords from Reviews</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map(([word, count]) => {
              const max = keywords[0][1]
              const size = 0.7 + (count / max) * 0.8
              return (
                <span key={word} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full font-medium hover:bg-red-100 transition cursor-default"
                  style={{ fontSize: `${size}rem` }}>
                  {word} <span className="text-red-400 text-xs">×{count}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">🗣️ Recent Reviews</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{reviews.length} total</span>
        </div>
        {reviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400"><div className="text-3xl mb-2">📭</div><p>No reviews yet</p></div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {reviews.slice(0, 5).map(review => (
              <div key={review.id} className="py-3 first:pt-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                      {(review.user_name || 'U')[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm text-gray-700">{review.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SentimentBadge text={review.comment} />
                    <StarRating rating={review.rating} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 ml-9 line-clamp-2">{review.comment || <span className="italic text-gray-300">No comment.</span>}</p>
                <p className="text-xs text-gray-400 ml-9 mt-0.5">{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            ))}
            {reviews.length > 5 && <p className="text-xs text-gray-400 text-center pt-3">+ {reviews.length - 5} more</p>}
          </div>
        )}
      </div>

      {/* Smart Tips */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
        <h3 className="font-bold mb-3 flex items-center gap-2">💡 Smart Recommendations</h3>
        <div className="flex flex-col gap-2">
          {parseFloat(avgRating) < 4 && reviews.length > 0 && (
            <div className="bg-white/10 rounded-xl p-3 text-sm flex items-start gap-2">
              <span>📈</span><span>Your average is below 4.0. Respond to negative reviews to show engagement and boost trust.</span>
            </div>
          )}
          {reviews.length < 10 && (
            <div className="bg-white/10 rounded-xl p-3 text-sm flex items-start gap-2">
              <span>🎯</span><span>More reviews = more trust. Share your listing with happy customers.</span>
            </div>
          )}
          {negativeCount > positiveCount && (
            <div className="bg-white/10 rounded-xl p-3 text-sm flex items-start gap-2">
              <span>⚡</span><span>Negative reviews outweigh positive ones. Focus on the most common complaints in keywords above.</span>
            </div>
          )}
          {sentimentScore >= 70 && (
            <div className="bg-white/10 rounded-xl p-3 text-sm flex items-start gap-2">
              <span>🌟</span><span>Great sentiment! Encourage customers to upload photos to increase listing visibility.</span>
            </div>
          )}
          {photos.length === 0 && (
            <div className="bg-white/10 rounded-xl p-3 text-sm flex items-start gap-2">
              <span>📸</span><span>Restaurants with photos get 3× more engagement. Upload photos in the Details tab!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OwnerRestaurantPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: 'success' })
  const [showClaimModal, setShowClaimModal] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('userRole')
    if (!token) { navigate('/login'); return }
    if (role !== 'owner') { navigate('/'); return }
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [restRes, revRes] = await Promise.all([getRestaurant(id), getReviews(id)])
      setRestaurant(restRes.data)
      const hoursObj = {}
      if (restRes.data.hours) {
        restRes.data.hours.split(',').forEach(h => {
          const firstColon = h.indexOf(':')
          const day = h.substring(0, firstColon).trim()
          const time = h.substring(firstColon + 1).trim()
          if (day && time) hoursObj[day] = time
        })
      }
      const amenitiesArr = restRes.data.amenities
        ? restRes.data.amenities.split(',').map(a => a.trim()).filter(Boolean)
        : []
      setForm({ ...restRes.data, hours_of_operation: hoursObj, amenities: amenitiesArr })
      setReviews(revRes.data || [])
    } catch (err) { showMsg('Failed to load restaurant.', 'error') }
    finally { setLoading(false) }
  }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const hoursString = Object.entries(form.hours_of_operation || {})
        .filter(([_, v]) => v).map(([day, hours]) => `${day}:${hours}`).join(',')
      const amenitiesVal = Array.isArray(form.amenities) ? form.amenities.join(',') : (form.amenities || '')
      await axios.put(`${apiBase()}/restaurants/${id}`, {
        name: form.name, cuisine_type: form.cuisine_type, description: form.description,
        address: form.address, city: form.city, state: form.state, zip_code: form.zip_code,
        phone: form.phone, pricing_tier: form.pricing_tier || form.price_tier,
        hours: hoursString, amenities: amenitiesVal
      }, { headers: { Authorization: `Bearer ${token}` } })
      showMsg('✓ Restaurant updated successfully!')
      fetchData()
    } catch (err) { showMsg('Failed to update. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  const toggleAmenity = (a) => {
    const current = Array.isArray(form.amenities) ? form.amenities : []
    setForm({ ...form, amenities: current.includes(a) ? current.filter(x => x !== a) : [...current, a] })
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
        <span>Loading restaurant...</span>
      </div>
    </div>
  )
  if (!restaurant) return <div className="text-center py-20 text-gray-400">Restaurant not found.</div>

  const photos = restaurant.photos
    ? restaurant.photos.split(',').map(p => p.trim()).filter(Boolean) : []
  const userId = localStorage.getItem('userId')
  const isOwner = restaurant.is_claimed || String(restaurant.owner_id) === String(userId)

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {showClaimModal && (
        <ClaimModal restaurant={restaurant} onClose={() => setShowClaimModal(false)}
          onSuccess={() => {
            setRestaurant(prev => ({ ...prev, is_claimed: true, owner_id: userId }))
            showMsg('🎉 Restaurant claimed! You are now the verified owner.')
            fetchData()
          }} />
      )}

      <button onClick={() => navigate('/owner/dashboard')} className="text-red-600 text-sm mb-4 hover:underline">
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {photos.length > 0
            ? <img src={resolvePhotoUrl(photos[0])} alt={restaurant.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm" />
            : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🏪</div>
          }
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{restaurant.name}</h1>
              {isOwner
                ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
                : <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">⚠ Unclaimed</span>
              }
            </div>
            <p className="text-gray-500 text-sm">{restaurant.city}, {restaurant.state} • {restaurant.cuisine_type}</p>
          </div>
        </div>
        {!isOwner && (
          <button onClick={() => setShowClaimModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-md flex items-center gap-2">
            🏪 Claim This Restaurant
          </button>
        )}
      </div>

      {/* Toast */}
      {message.text && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between border ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: 'success' })} className="ml-4 opacity-60 hover:opacity-100 font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {[['details','✏️ Details'],['reviews','💬 Reviews'],['analytics','📊 Analytics']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{label}</button>
        ))}
      </div>

      {/* Details */}
      {tab === 'details' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['Restaurant Name','name'],['Cuisine Type','cuisine_type'],['Address','address'],['City','city'],['State','state'],['Zip Code','zip_code'],['Phone','phone']].map(([label, name]) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                <input type="text" value={form[name] || ''} onChange={e => setForm({ ...form, [name]: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 focus:bg-white transition" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Price Tier</label>
              <select value={form.pricing_tier || form.price_tier || '$$'} onChange={e => setForm({ ...form, pricing_tier: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50">
                {['$','$$','$$$','$$$$'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
            <textarea value={form.description || ''} rows={3} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 focus:bg-white transition" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hours of Operation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <span className="capitalize text-sm font-medium text-gray-600 w-8">{day}</span>
                  <input type="text" placeholder="11AM-9PM or Closed"
                    value={(form.hours_of_operation || {})[day] || ''} onChange={e => setForm({ ...form, hours_of_operation: { ...form.hours_of_operation, [day]: e.target.value } })}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => (
                <button type="button" key={a} onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition capitalize ${(Array.isArray(form.amenities) ? form.amenities : []).includes(a) ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:border-red-400 bg-gray-50'}`}>
                  {a.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Photos</h3>
            {photos.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {photos.map((photo, i) => <img key={i} src={resolvePhotoUrl(photo)} alt={`photo ${i+1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />)}
              </div>
            )}
            <input type="file" accept="image/*" multiple onChange={async (e) => {
              const files = Array.from(e.target.files)
              if (!files.length) return
              const token = localStorage.getItem('token')
              for (const file of files) {
                const fd = new FormData(); fd.append('file', file)
                try { await fetch(`${apiBase()}/restaurants/${id}/photos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }) } catch {}
              }
              showMsg('✓ Photos uploaded!'); fetchData()
            }} className="text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Reviews */}
      {tab === 'reviews' && (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-lg">Customer Reviews</h2>
            <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Read-only</span>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📭</div><p>No reviews yet.</p></div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {reviews.map(review => (
                <div key={review.id} className="py-4 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                        {(review.user_name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-700 text-sm">{review.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SentimentBadge text={review.comment} />
                      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-gray-600 mt-1 ml-10">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && <AnalyticsTab restaurantId={id} reviews={reviews} restaurant={restaurant} photos={photos} />}
    </div>
  )
}
