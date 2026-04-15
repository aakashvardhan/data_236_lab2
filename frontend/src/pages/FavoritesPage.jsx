import { useState, useEffect } from 'react'
import { getFavorites, removeFavorite } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    fetchFavorites()
  }, [navigate])

  const fetchFavorites = async () => {
    try {
      const res = await getFavorites()
      setFavorites(res.data)
    } catch { /* favorites fetch is best-effort */ }
    finally { setLoading(false) }
  }

  const handleRemove = async (restaurantId) => {
    try {
      await removeFavorite(restaurantId)
      setFavorites(favorites.filter(f => f.restaurant_id !== restaurantId))
    } catch { /* removal failure is non-critical */ }
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Favorites</h1>
      {loading ? (
        <div className="text-gray-400 text-center py-20">Loading...</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">♡</div>
          <p className="text-lg font-medium">No favorites yet</p>
          <Link to="/" className="text-red-600 hover:underline text-sm mt-2 inline-block">Browse restaurants</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Link to={`/restaurant/${fav.restaurant_id}`}
                  className="font-semibold text-gray-800 hover:text-red-600 transition">
                  {fav.restaurant_name}
                </Link>
                <p className="text-xs text-gray-400 mt-1">
                  Saved on {new Date(fav.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => handleRemove(fav.restaurant_id)}
                className="text-red-500 text-sm hover:underline">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}