import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchFavourites, removeFavouriteAsync, selectFavourites, selectFavouritesStatus } from '../store/favouritesSlice'
import { getRestaurant } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'
import { resolvePhotoUrl } from '../utils/url'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const favorites = useSelector(selectFavourites)
  const status = useSelector(selectFavouritesStatus)
  const [enriched, setEnriched] = useState([])

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    dispatch(fetchFavourites())
  }, [dispatch, navigate])

  useEffect(() => {
    if (favorites.length === 0) { setEnriched([]); return }
    let cancelled = false
    Promise.all(
      favorites.map(async (fav) => {
        try {
          const r = await getRestaurant(fav.restaurant_id)
          const photos = r.data.photos
            ? r.data.photos.split(',').map(p => p.trim()).filter(Boolean)
            : []
          return {
            ...fav,
            photoUrl: photos.length > 0 ? resolvePhotoUrl(photos[0]) : null,
            cuisine_type: r.data.cuisine_type,
            pricing_tier: r.data.pricing_tier || r.data.price_tier,
            avg_rating: r.data.avg_rating,
          }
        } catch {
          return { ...fav, photoUrl: null }
        }
      })
    ).then(data => { if (!cancelled) setEnriched(data) })
    return () => { cancelled = true }
  }, [favorites])

  const handleRemove = (restaurantId) => {
    dispatch(removeFavouriteAsync(restaurantId))
  }

  const loading = status === 'loading' && enriched.length === 0

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Favorites</h1>
      {loading ? (
        <div className="text-gray-400 text-center py-20">Loading...</div>
      ) : enriched.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">♡</div>
          <p className="text-lg font-medium">No favorites yet</p>
          <Link to="/" className="text-red-600 hover:underline text-sm mt-2 inline-block">Browse restaurants</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enriched.map((fav) => (
            <div key={fav.id} className="bg-white rounded-xl shadow overflow-hidden flex flex-col sm:flex-row">
              {/* Restaurant image */}
              <Link to={`/restaurant/${fav.restaurant_id}`} className="sm:w-40 w-full h-36 sm:h-auto flex-shrink-0">
                {fav.photoUrl ? (
                  <img
                    src={fav.photoUrl}
                    alt={fav.restaurant_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">
                    🍽️
                  </div>
                )}
              </Link>
              {/* Info */}
              <div className="flex flex-1 items-center justify-between gap-3 p-4">
                <div>
                  <Link to={`/restaurant/${fav.restaurant_id}`}
                    className="font-semibold text-gray-800 hover:text-red-600 transition text-base">
                    {fav.restaurant_name}
                  </Link>
                  {(fav.cuisine_type || fav.pricing_tier) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[fav.cuisine_type, fav.pricing_tier, fav.avg_rating ? `⭐ ${fav.avg_rating}` : null].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Saved on {new Date(fav.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => handleRemove(fav.restaurant_id)}
                  className="text-red-500 text-sm hover:underline whitespace-nowrap">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}