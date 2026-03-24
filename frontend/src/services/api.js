
import axios from 'axios'
import { getApiBaseUrl } from '../utils/url'

const API = axios.create({
  baseURL: getApiBaseUrl(),
})

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
// AUTH
export const signup = (data) => API.post('/auth/signup', data)
export const ownerSignup = (data) => API.post('/auth/owner/signup', data)
export const login = (data) => API.post('/auth/login', data)
export const logout = () => API.post('/auth/logout')

// USER
export const getMe = () => API.get('/users/me')
export const updateMe = (data) => {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  )
  return API.put('/users/me', cleaned)
}
export const getPreferences = () => API.get('/users/me/preferences')
export const savePreferences = (data) => API.post('/users/me/preferences', data)
export const getHistory = () => API.get('/favorites/me/history')

// RESTAURANTS
export const getRestaurants = (params) => API.get('/restaurants', { params })
export const getRestaurant = (id) => API.get(`/restaurants/${id}`)
export const createRestaurant = (data) => API.post('/restaurants', data)
export const updateRestaurant = (id, data) => API.put(`/restaurants/${id}`, data)

// REVIEWS
export const createReview = (restaurantId, data) => API.post(`/restaurants/${restaurantId}/reviews`, data)
export const getReviews = (restaurantId) => API.get(`/restaurants/${restaurantId}/reviews`)
export const updateReview = (reviewId, data) => API.put(`/reviews/${reviewId}`, data)
export const deleteReview = (reviewId) => API.delete(`/reviews/${reviewId}`)

// FAVORITES
export const addFavorite = (restaurantId) => API.post(`/favorites/${restaurantId}`)
export const removeFavorite = (restaurantId) => API.delete(`/favorites/${restaurantId}`)
export const getFavorites = () => API.get('/favorites')

// OWNER
export const getOwnerRestaurants = () => API.get('/owner/restaurants')
export const getOwnerRestaurantReviews = (id) => API.get(`/owner/restaurants/${id}/reviews`)
export const getOwnerAnalytics = (id) => API.get(`/owner/restaurants/${id}/analytics`)

// AI ASSISTANT
export const chatWithAI = (data) => API.post('/ai-assistant/chat', {
  message: data.message,
  session_id: data.session_id || 'default'
})