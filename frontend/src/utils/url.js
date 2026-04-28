export function getApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
  return rawBaseUrl.replace(/\/$/, '')
}

export function resolvePhotoUrl(photo) {
  if (!photo) {
    return ''
  }

  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo
  }

  const normalizedPhotoPath = photo.startsWith('/') ? photo : `/${photo}`
  return `/api${normalizedPhotoPath}`
}
