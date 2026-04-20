import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import { resolvePhotoUrl } from '../utils/url'

function RestaurantCard({ restaurant }) {
  const photos = restaurant.photos
    ? restaurant.photos.split(',').map((p) => p.trim()).filter(Boolean)
    : []
  const [imgIdx, setImgIdx] = useState(0)

  return (
    <div className="bg-white rounded-xl overflow-hidden flex flex-col group w-[260px] flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow duration-200">
      {/* Photo */}
      <div className="relative h-[180px] bg-gray-100 overflow-hidden flex-shrink-0">
        {photos.length > 0 ? (
          <>
            <img
              src={resolvePhotoUrl(photos[imgIdx])}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {photos.length > 1 && (
              <>
                <button onClick={e => { e.preventDefault(); setImgIdx(i => (i - 1 + photos.length) % photos.length) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">&#8249;</button>
                <button onClick={e => { e.preventDefault(); setImgIdx(i => (i + 1) % photos.length) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">&#8250;</button>
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {photos.length} photos
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">&#127869;</div>
        )}
      </div>

      {/* Info */}
      <Link to={`/restaurant/${restaurant.id}`} className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">{restaurant.name}</h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StarRating rating={restaurant.avg_rating} />
          <span className="text-sm font-semibold text-gray-700">{restaurant.avg_rating?.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({restaurant.review_count || 0})</span>
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          {restaurant.cuisine_type} &middot; {restaurant.pricing_tier || restaurant.price_tier}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">&#128205; {restaurant.city}</div>
      </Link>
    </div>
  )
}

export default RestaurantCard
