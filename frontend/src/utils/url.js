/**
 * API base URLs.
 *
 * - If `VITE_API_BASE_URL` is set: single monolithic API (e.g. Lab 1 on port 8000).
 * - Otherwise: split microservices behind the same origin (`/api/users`, …) — Docker
 *   nginx or `vite.config.js` dev proxy forwards to ports 8001–8004.
 */
const DEFAULT_SINGLE_API = 'http://localhost:8000'

export function getApiConfig() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw) {
    return { mode: 'single', baseURL: String(raw).replace(/\/$/, '') }
  }
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ''
  return {
    mode: 'split',
    user: `${origin}/api/users`,
    restaurant: `${origin}/api/restaurants`,
    review: `${origin}/api/reviews`,
    owner: `${origin}/api/owner`,
  }
}

export function getApiBaseUrl() {
  const c = getApiConfig()
  if (c.mode === 'single') {
    return c.baseURL || DEFAULT_SINGLE_API
  }
  return c.user
}

export function resolvePhotoUrl(photo) {
  if (!photo) {
    return ''
  }

  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo
  }

  const c = getApiConfig()
  const baseUrl = c.mode === 'single' ? c.baseURL : c.user
  const normalizedPhotoPath = photo.startsWith('/') ? photo : `/${photo}`
  return `${baseUrl}${normalizedPhotoPath}`
}
