import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import { resolvePhotoUrl } from '../utils/url'

function RestaurantCard({ restaurant }) {
  const photos = restaurant.photos
    ? restaurant.photos.split(',').map((p) => p.trim()).filter(Boolean)
    : []
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-md transition p-4 flex flex-col gap-2">
      {photos.length > 0 ? (
        <img src={resolvePhotoUrl(photos[0])} alt={restaurant.name}
          className="rounded-lg h-36 w-full object-cover" />
      ) : (
        <div className="bg-gray-100 rounded-lg h-36 flex items-center justify-center text-gray-400 text-sm">
          No photo yet
        </div>
      )}
      <h3 className="font-bold text-gray-800 text-lg">{restaurant.name}</h3>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{restaurant.cuisine_type}</span>
        <span>•</span>
        <span>{restaurant.pricing_tier || restaurant.price_tier}</span>
        <span>•</span>
        <span>{restaurant.city}</span>
      </div>
      <StarRating rating={restaurant.avg_rating} />
      <span className="text-xs text-gray-400">{restaurant.review_count} reviews</span>
      <Link to={`/restaurant/${restaurant.id}`}
        className="mt-auto bg-red-600 text-white text-center py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
        View Details
      </Link>
    </div>
  )
}

export default RestaurantCard