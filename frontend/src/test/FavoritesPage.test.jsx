/**
 * FavoritesPage UI/UX tests — auth redirect, rendering favorites, remove flow.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockGetFavorites = vi.fn()
const mockRemoveFavorite = vi.fn()
vi.mock('../services/api', () => ({
  getFavorites: (...a) => mockGetFavorites(...a),
  removeFavorite: (...a) => mockRemoveFavorite(...a),
}))

import FavoritesPage from '../pages/FavoritesPage'

const FAVORITES = [
  { id: 'f1', restaurant_id: 'r1', restaurant_name: 'Pasta Palace', cuisine_type: 'Italian', avg_rating: 4.5, pricing_tier: '$$', city: 'San Jose', photos: '', created_at: '2026-01-01T00:00:00Z' },
  { id: 'f2', restaurant_id: 'r2', restaurant_name: 'Sushi World', cuisine_type: 'Japanese', avg_rating: 4.8, pricing_tier: '$$$', city: 'Sunnyvale', photos: '', created_at: '2026-01-02T00:00:00Z' },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <FavoritesPage />
    </MemoryRouter>
  )
}

describe('FavoritesPage — auth redirect', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('redirects to /login when not authenticated', () => {
    mockGetFavorites.mockResolvedValue({ data: [] })
    renderPage()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})

describe('FavoritesPage — with favorites', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'tok')
    mockNavigate.mockClear()
    mockGetFavorites.mockResolvedValue({ data: FAVORITES })
  })
  afterEach(() => localStorage.clear())

  it('renders restaurant names', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Pasta Palace')).toBeInTheDocument()
      expect(screen.getByText('Sushi World')).toBeInTheDocument()
    })
  })

  it('renders remove buttons for each favorite', async () => {
    renderPage()
    await waitFor(() => {
      const removeBtns = screen.getAllByRole('button', { name: /remove/i })
      expect(removeBtns).toHaveLength(2)
    })
  })

  it('removes a restaurant from the list on Remove click', async () => {
    mockRemoveFavorite.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText('Pasta Palace'))
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeBtns[0])
    await waitFor(() => expect(screen.queryByText('Pasta Palace')).not.toBeInTheDocument())
  })

  it('keeps other favorites after removing one', async () => {
    mockRemoveFavorite.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText('Pasta Palace'))
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
    await waitFor(() => expect(screen.getByText('Sushi World')).toBeInTheDocument())
  })
})

describe('FavoritesPage — empty state', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'tok')
    mockGetFavorites.mockResolvedValue({ data: [] })
  })
  afterEach(() => localStorage.clear())

  it('shows empty state message', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument()
    )
  })
})

describe('FavoritesPage — API failure', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'tok')
    mockGetFavorites.mockRejectedValue(new Error('Network error'))
  })
  afterEach(() => localStorage.clear())

  it('does not crash on fetch failure', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument()
    )
  })
})
