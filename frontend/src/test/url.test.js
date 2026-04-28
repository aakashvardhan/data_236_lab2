/**
 * Tests for utils/url.js — API config routing and photo URL resolution.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'

// We need to control import.meta.env — mock at module level via vi.stubEnv
describe('getApiConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns split mode when VITE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { getApiConfig } = await import('../utils/url.js?v=1')
    const config = getApiConfig()
    expect(config.mode).toBe('split')
    expect(config.user).toContain('/api/users')
    expect(config.restaurant).toContain('/api/restaurants')
    expect(config.review).toContain('/api/reviews')
    expect(config.owner).toContain('/api/owner')
  })

  it('returns single mode when VITE_API_BASE_URL is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    const { getApiConfig } = await import('../utils/url.js?v=2')
    const config = getApiConfig()
    expect(config.mode).toBe('single')
    expect(config.baseURL).toBe('http://localhost:8000')
  })

  it('strips trailing slash from single API URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/')
    const { getApiConfig } = await import('../utils/url.js?v=3')
    const config = getApiConfig()
    expect(config.baseURL).toBe('http://localhost:8000')
  })
})

describe('resolvePhotoUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns empty string for null', async () => {
    const { resolvePhotoUrl } = await import('../utils/url.js?v=4')
    expect(resolvePhotoUrl(null)).toBe('')
  })

  it('returns empty string for undefined', async () => {
    const { resolvePhotoUrl } = await import('../utils/url.js?v=5')
    expect(resolvePhotoUrl(undefined)).toBe('')
  })

  it('returns http URLs unchanged', async () => {
    const { resolvePhotoUrl } = await import('../utils/url.js?v=6')
    const url = 'http://cdn.example.com/photo.jpg'
    expect(resolvePhotoUrl(url)).toBe(url)
  })

  it('returns https URLs unchanged', async () => {
    const { resolvePhotoUrl } = await import('../utils/url.js?v=7')
    const url = 'https://cdn.example.com/photo.jpg'
    expect(resolvePhotoUrl(url)).toBe(url)
  })

  it('prepends base URL to relative paths (split mode)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { resolvePhotoUrl } = await import('../utils/url.js?v=8')
    const result = resolvePhotoUrl('uploads/photo.jpg')
    expect(result).toContain('/api/users')
    expect(result).toContain('/uploads/photo.jpg')
  })

  it('normalizes missing leading slash on relative path', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { resolvePhotoUrl } = await import('../utils/url.js?v=9')
    const withSlash = resolvePhotoUrl('/uploads/photo.jpg')
    const withoutSlash = resolvePhotoUrl('uploads/photo.jpg')
    expect(withSlash).toBe(withoutSlash)
  })

  it('prepends base URL in single mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    const { resolvePhotoUrl } = await import('../utils/url.js?v=10')
    const result = resolvePhotoUrl('/uploads/photo.jpg')
    expect(result).toBe('http://localhost:8000/uploads/photo.jpg')
  })
})
