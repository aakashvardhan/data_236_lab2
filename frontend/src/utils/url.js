const DEFAULT_API_BASE_URL = 'http://localhost:8000'

export function getApiBaseUrl() {
  const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.REACT_APP_API_BASE_URL ||
    import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_API_BASE_URL

  return rawBaseUrl.replace(/\/$/, '')
}

export function resolvePhotoUrl(photo) {
  if (!photo) {
    return ''
  }

  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo
  }

  const baseUrl = getApiBaseUrl()
  const normalizedPhotoPath = photo.startsWith('/') ? photo : `/${photo}`
  return `${baseUrl}${normalizedPhotoPath}`
}
