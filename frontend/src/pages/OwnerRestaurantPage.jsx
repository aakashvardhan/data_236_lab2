import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import StarRating from '../components/StarRating'
import axios from 'axios'
import { getRestaurant, getReviews } from '../services/api'
import { resolvePhotoUrl } from '../utils/url'
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const AMENITIES = ['wifi', 'outdoor_seating', 'parking', 'delivery', 'takeout', 'reservations']

export default function OwnerRestaurantPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('userRole')
    if (!token) { navigate('/login'); return }
    if (role !== 'owner') { navigate('/'); return }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate])

  const fetchData = async () => {
  try {
    const [restRes, revRes] = await Promise.all([getRestaurant(id), getReviews(id)])
    setRestaurant(restRes.data)

    // Parse hours string back into object
    const hoursObj = {}
    if (restRes.data.hours) {
      restRes.data.hours.split(',').forEach(h => {
        const [day, time] = h.split(':')
        if (day && time) hoursObj[day.trim()] = time.trim()
      })
    }

    setForm({
      ...restRes.data,
      hours_of_operation: hoursObj,
      amenities: restRes.data.amenities || []
    })
    setReviews(revRes.data || [])
  } catch { /* data fetch is best-effort */ }
  finally { setLoading(false) }
}

const handleSave = async (e) => {
  e.preventDefault()
  setSaving(true)
  try {
    const token = localStorage.getItem('token')
    const payload = {
      name: form.name,
      cuisine_type: form.cuisine_type,
      description: form.description,
      address: form.address,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      phone: form.phone,
      pricing_tier: form.pricing_tier,
      hours: Object.entries(form.hours_of_operation || {})
        .filter(([, v]) => v)
        .map(([day, hours]) => `${day}:${hours}`)
        .join(',')
    }
    await axios.put(`http://localhost:8000/restaurants/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setMessage('Restaurant updated!')
    setTimeout(() => setMessage(''), 3000)
  } catch {
    setMessage('Failed to update.')
  }
}

  const handleClaim = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`http://localhost:8000/restaurants/${id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('Restaurant claimed successfully!')
      fetchData()
    } catch {
      setMessage('Failed to claim restaurant.')
    }
  }

  const toggleAmenity = (a) => {
    const current = form.amenities || []
    setForm({ ...form, amenities: current.includes(a) ? current.filter(x => x !== a) : [...current, a] })
  }

  const handleHours = (day, value) => {
    setForm({ ...form, hours_of_operation: { ...form.hours_of_operation, [day]: value } })
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!restaurant) return <div className="text-center py-20 text-gray-400">Restaurant not found.</div>

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  const ratingCounts = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }))
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <button onClick={() => navigate('/owner/dashboard')}
        className="text-red-600 text-sm mb-4 hover:underline">
        ← Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{restaurant.name}</h1>
          <p className="text-gray-500 text-sm">{restaurant.city}, {restaurant.state}</p>
        </div>
        {!restaurant.is_claimed && (
          <button onClick={handleClaim}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
            ✓ Claim This Restaurant
          </button>
        )}
        {restaurant.is_claimed && (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
            ✓ Claimed
          </span>
        )}
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {['details', 'reviews', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-2 text-sm font-semibold capitalize transition border-b-2 whitespace-nowrap ${
              tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* Details Tab */}
      {tab === 'details' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Restaurant Name', name: 'name' },
              { label: 'Cuisine Type', name: 'cuisine_type' },
              { label: 'Address', name: 'address' },
              { label: 'City', name: 'city' },
              { label: 'State', name: 'state' },
              { label: 'Zip Code', name: 'zip_code' },
              { label: 'Phone', name: 'phone' },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type="text" value={form[name] || ''}
                  onChange={e => setForm({ ...form, [name]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Tier</label>
              <select value={form.price_tier || '$$'}
                onChange={e => setForm({ ...form, price_tier: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                {['$','$$','$$$','$$$$'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description || ''} rows={3}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <div>
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Hours of Operation</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {DAYS.map(day => (
      <div key={day} className="flex items-center gap-2">
        <span className="capitalize text-sm text-gray-600 w-8">{day}</span>
        <input type="text" placeholder="e.g. 11AM-9PM or Closed"
          value={(form.hours_of_operation || {})[day] || ''}
          onChange={e => handleHours(day, e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>
    ))}
  </div>
</div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => (
                <button type="button" key={a} onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1 rounded-full text-sm border transition capitalize ${
                    (form.amenities || []).includes(a) ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                  }`}>{a.replace('_', ' ')}</button>
              ))}
            </div>
          </div>
        {/* Photo Upload */}
<div>
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Upload Photos</h3>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={async (e) => {
      const files = Array.from(e.target.files)
      if (files.length === 0) return
      const token = localStorage.getItem('token')
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        try {
          await fetch(`http://localhost:8000/restaurants/${id}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          })
        } catch { /* upload errors are non-critical */ }
      }
      setMessage('Photos uploaded!')
      setTimeout(() => setMessage(''), 3000)
      fetchData()
    }}
    className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
  />
  {/* Show existing photos */}
  {restaurant?.photos && (
    <div className="flex gap-2 mt-3 flex-wrap">
      {restaurant.photos.split(',').map((photo) => photo.trim()).filter(Boolean).map((photo, i) => (
        <img key={i} src={resolvePhotoUrl(photo)} alt={`photo ${i+1}`}
          className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
      ))}
    </div>
  )}
</div>
          <button type="submit" disabled={saving}
            className="bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Reviews Tab - Read Only */}
      {tab === 'reviews' && (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Customer Reviews</h2>
            <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Read-only</span>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No reviews yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-700">{review.user_name}</span>
                      <div className="mt-1"><StarRating rating={review.rating} /></div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow p-5 text-center">
              <div className="text-3xl font-bold text-red-600">{reviews.length}</div>
              <div className="text-gray-500 text-sm mt-1">Total Reviews</div>
            </div>
            <div className="bg-white rounded-2xl shadow p-5 text-center">
              <div className="text-3xl font-bold text-red-600">{avgRating}⭐</div>
              <div className="text-gray-500 text-sm mt-1">Average Rating</div>
            </div>
            <div className="bg-white rounded-2xl shadow p-5 text-center">
              <div className="text-3xl font-bold text-red-600">
                {reviews.filter(r => r.rating >= 4).length}
              </div>
              <div className="text-gray-500 text-sm mt-1">Positive Reviews (4-5★)</div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-4">Rating Distribution</h3>
            <div className="flex flex-col gap-3">
              {ratingCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-8">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full transition-all"
                      style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-4">Recent Reviews</h3>
            {reviews.slice(0, 3).map(review => (
              <div key={review.id} className="border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-700">{review.user_name}</span>
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-sm text-gray-500 mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}