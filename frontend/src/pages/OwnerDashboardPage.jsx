import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getOwnerRestaurants, getRestaurants } from '../services/api'
import StarRating from '../components/StarRating'
import { resolvePhotoUrl } from '../utils/url'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = parseFloat(value) || 0
    let start = 0; const step = target / 30
    const interval = setInterval(() => {
      start += step
      if (start >= target) { setDisplay(target); clearInterval(interval) }
      else setDisplay(parseFloat(start.toFixed(1)))
    }, 30)
    return () => clearInterval(interval)
  }, [value])
  return <>{display}</>
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [myRestaurants, setMyRestaurants] = useState([])
  const [unclaimedRestaurants, setUnclaimedRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchClaim, setSearchClaim] = useState('')
  const [showClaimSearch, setShowClaimSearch] = useState(false)
  const [claimSearchResults, setClaimSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('userRole')
    if (!token) { navigate('/login'); return }
    if (role !== 'owner') { navigate('/'); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await getOwnerRestaurants()
      setMyRestaurants(res.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  const handleSearchClaim = async () => {
    if (!searchClaim.trim()) return
    setSearching(true)
    try {
      const res = await getRestaurants({ name: searchClaim, per_page: 8 })
      const results = (res.data.items || []).filter(r => !r.is_claimed)
      setClaimSearchResults(results)
    } catch {}
    finally { setSearching(false) }
  }

  const totalReviews = myRestaurants.reduce((sum, r) => sum + (r.review_count || 0), 0)
  const avgRating = myRestaurants.length > 0
    ? (myRestaurants.reduce((sum, r) => sum + (r.avg_rating || 0), 0) / myRestaurants.length).toFixed(1)
    : '0.0'
  const currentUserId = localStorage.getItem('userId')
  const totalClaimed = myRestaurants.filter(r => r.is_claimed || String(r.owner_id) === String(currentUserId)).length
  const userName = localStorage.getItem('userName') || 'Owner'

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Owner Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, <strong>{userName}</strong> 👋 Manage your restaurants below.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowClaimSearch(prev => !prev)}
            className="border border-green-500 text-green-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50 transition flex items-center gap-1">
            🏪 Claim a Restaurant
          </button>
          <Link to="/add-restaurant"
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
            + Add Restaurant
          </Link>
        </div>
      </div>

      {/* Claim Search Panel */}
      {showClaimSearch && (
        <div className="bg-white border border-green-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">🔍 Find a Restaurant to Claim</h3>
          <p className="text-sm text-gray-500 mb-3">Search for an unclaimed restaurant listing to take ownership of.</p>
          <div className="flex gap-2">
            <input type="text" value={searchClaim} onChange={e => setSearchClaim(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchClaim()}
              placeholder="Search by restaurant name..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <button onClick={handleSearchClaim} disabled={searching}
              className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
              {searching ? '...' : 'Search'}
            </button>
          </div>
          {claimSearchResults.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {claimSearchResults.map(r => (
                <Link key={r.id} to={`/owner/restaurant/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition group">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm group-hover:text-green-700">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.cuisine_type} • {r.city} • {r.pricing_tier || r.price_tier}</div>
                  </div>
                  <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-full">Claim →</span>
                </Link>
              ))}
            </div>
          )}
          {claimSearchResults.length === 0 && searchClaim && !searching && (
            <p className="text-sm text-gray-400 mt-3 text-center">No unclaimed restaurants found. <Link to="/add-restaurant" className="text-red-500 hover:underline">Add a new one?</Link></p>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'My Restaurants', value: myRestaurants.length, suffix: '', icon: '🏪', color: 'from-red-500 to-red-600' },
          { label: 'Total Reviews', value: totalReviews, suffix: '', icon: '📝', color: 'from-blue-500 to-blue-600' },
          { label: 'Avg Rating', value: avgRating, suffix: '★', icon: '⭐', color: 'from-yellow-500 to-amber-500' },
          { label: 'Verified', value: totalClaimed, suffix: '', icon: '✓', color: 'from-green-500 to-emerald-600' },
        ].map(({ label, value, suffix, icon, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold"><AnimatedNumber value={value} />{suffix}</div>
            <div className="text-white/80 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Restaurant List */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">My Restaurants</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : myRestaurants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-medium text-lg mb-1">No restaurants yet</p>
          <p className="text-sm mb-4">Add your first restaurant or claim an existing listing</p>
          <div className="flex gap-3 justify-center">
            <Link to="/add-restaurant" className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition">+ Add Restaurant</Link>
            <button onClick={() => setShowClaimSearch(true)} className="border border-green-500 text-green-600 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-green-50 transition">🏪 Claim One</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myRestaurants.map(r => {
            const photos = r.photos ? r.photos.split(',').map(p => p.trim()).filter(Boolean) : []
            const currentUserId = localStorage.getItem('userId')
            const isVerified = r.is_claimed || String(r.owner_id) === String(currentUserId)
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow overflow-hidden flex flex-col sm:flex-row group hover:shadow-md transition">
                <Link to={`/restaurant/${r.id}`} className="sm:w-40 w-full h-36 sm:h-auto flex-shrink-0">
                  {photos.length > 0
                    ? <img src={resolvePhotoUrl(photos[0])} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">🍽️</div>
                  }
                </Link>
                <div className="flex flex-1 items-start sm:items-center justify-between gap-4 p-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-base truncate">{r.name}</h3>
                      {isVerified
                        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">✓ Verified</span>
                        : <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">⚠ Unclaimed</span>
                      }
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 flex-wrap">
                      <span>{r.cuisine_type}</span>
                      <span>•</span>
                      <span>{r.pricing_tier || r.price_tier}</span>
                      <span>•</span>
                      <span>{r.city}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={r.avg_rating} />
                      <span className="text-xs text-gray-400">{r.review_count || 0} reviews</span>
                    </div>
                    {r.review_count > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex-1 max-w-32 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${Math.min((r.avg_rating / 5) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{r.avg_rating?.toFixed(1)}/5.0</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <Link to={`/owner/restaurant/${r.id}`}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                      Manage
                    </Link>
                    <Link to={`/restaurant/${r.id}`}
                      className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:border-red-400 hover:text-red-600 transition">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
