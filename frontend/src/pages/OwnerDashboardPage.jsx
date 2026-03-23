import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getOwnerRestaurants } from '../services/api'
import StarRating from '../components/StarRating'

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('userRole')
    if (!token) { navigate('/login'); return }
    if (role !== 'owner') { navigate('/'); return }
    fetchMyRestaurants()
  }, [])

  const fetchMyRestaurants = async () => {
    try {
      const res = await getOwnerRestaurants()
      setRestaurants(res.data || [])
    } catch (err) {}
    finally { setLoading(false) }
  }

  const totalReviews = restaurants.reduce((sum, r) => sum + (r.review_count || 0), 0)
  const avgRating = restaurants.length > 0
    ? (restaurants.reduce((sum, r) => sum + (r.avg_rating || 0), 0) / restaurants.length).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Owner Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your restaurants and view analytics</p>
        </div>
        <Link to="/add-restaurant"
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
          + Add Restaurant
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5 text-center">
          <div className="text-3xl font-bold text-red-600">{restaurants.length}</div>
          <div className="text-gray-500 text-sm mt-1">Total Restaurants</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 text-center">
          <div className="text-3xl font-bold text-red-600">{totalReviews}</div>
          <div className="text-gray-500 text-sm mt-1">Total Reviews</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 text-center">
          <div className="text-3xl font-bold text-red-600">{avgRating}⭐</div>
          <div className="text-gray-500 text-sm mt-1">Average Rating</div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4">My Restaurants</h2>
      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading...</div>
      ) : restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">🏪</div>
          <p className="font-medium">No restaurants yet</p>
          <Link to="/add-restaurant" className="text-red-600 hover:underline text-sm mt-2 inline-block">
            Add your first restaurant
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {restaurants.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{r.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>{r.cuisine_type}</span>
                    <span>•</span>
                    <span>{r.pricing_tier || r.price_tier}</span>
                    <span>•</span>
                    <span>{r.city}</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={r.avg_rating} />
                    <span className="text-xs text-gray-400">{r.review_count} reviews</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/owner/restaurant/${r.id}`}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
                    Manage
                  </Link>
                  <Link to={`/restaurant/${r.id}`}
                    className="border border-red-600 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}