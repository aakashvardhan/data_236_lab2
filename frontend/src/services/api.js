
import axios from 'axios'
import { getApiConfig } from '../utils/url'

const config = getApiConfig()

function attachAuth(instance) {
  instance.interceptors.request.use(
    (reqConfig) => {
      const token = localStorage.getItem('token')
      if (token) {
        reqConfig.headers['Authorization'] = `Bearer ${token}`
      }
      return reqConfig
    },
    (error) => Promise.reject(error)
  )
  return instance
}

function create(baseURL) {
  return attachAuth(axios.create({ baseURL }))
}

let userAPI
let restaurantAPI
let reviewAPI
let ownerAPI
let singleAPI

if (config.mode === 'single') {
  singleAPI = create(config.baseURL)
  userAPI = restaurantAPI = reviewAPI = ownerAPI = singleAPI
} else {
  userAPI = create(config.user)
  restaurantAPI = create(config.restaurant)
  reviewAPI = create(config.review)
  ownerAPI = create(config.owner)
}

// AUTH
export const signup = (data) => userAPI.post('/auth/signup', data)
export const ownerSignup = (data) => userAPI.post('/auth/owner/signup', data)
export const login = (data) => userAPI.post('/auth/login', data)
export const logout = () => userAPI.post('/auth/logout')

// USER
export const getMe = () => userAPI.get('/users/me')
export const updateMe = (data) => {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
  return userAPI.put('/users/me', cleaned)
}
export const getPreferences = () => userAPI.get('/users/me/preferences')
export const savePreferences = (data) => userAPI.post('/users/me/preferences', data)
export const getHistory = () => userAPI.get('/favorites/me/history')

// RESTAURANTS
export const getRestaurants = (params) => restaurantAPI.get('/restaurants', { params })
export const getRestaurant = (id) => restaurantAPI.get(`/restaurants/${id}`)
export const createRestaurant = (data) => restaurantAPI.post('/restaurants', data)
export const updateRestaurant = (id, data) => restaurantAPI.put(`/restaurants/${id}`, data)

// REVIEWS
export const createReview = (restaurantId, data) =>
  reviewAPI.post(`/restaurants/${restaurantId}/reviews`, data)
export const getReviews = (restaurantId) =>
  reviewAPI.get(`/restaurants/${restaurantId}/reviews`)
export const updateReview = (reviewId, data) => reviewAPI.put(`/reviews/${reviewId}`, data)
export const deleteReview = (reviewId) => reviewAPI.delete(`/reviews/${reviewId}`)

// FAVORITES
export const addFavorite = (restaurantId) => userAPI.post(`/favorites/${restaurantId}`)
export const removeFavorite = (restaurantId) => userAPI.delete(`/favorites/${restaurantId}`)
export const getFavorites = () => userAPI.get('/favorites')

// OWNER
export const getOwnerRestaurants = () => ownerAPI.get('/owner/restaurants')
export const getOwnerRestaurantReviews = (id) => ownerAPI.get(`/owner/restaurants/${id}/reviews`)
export const getOwnerAnalytics = (id) => ownerAPI.get(`/owner/restaurants/${id}/analytics`)

// AI ASSISTANT
export const chatWithAI = (data) =>
  userAPI.post('/ai-assistant/chat', {
    message: data.message,
    session_id: data.session_id || 'default',
  })
