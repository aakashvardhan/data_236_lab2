/**
 * RestaurantDetailPage UI/UX tests — loading states, error states,
 * data rendering, review flow, and favorite toggle.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { renderWithProviders } from './test-utils'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockGetRestaurant = vi.fn()
const mockGetReviews = vi.fn()
const mockCreateReview = vi.fn()
const mockAddFavorite = vi.fn()
const mockRemoveFavorite = vi.fn()
const mockDeleteReview = vi.fn()
const mockUpdateReview = vi.fn()

vi.mock('../services/api', () => ({
  getRestaurant: (...a) => mockGetRestaurant(...a),
  getReviews: (...a) => mockGetReviews(...a),
  createReview: (...a) => mockCreateReview(...a),
  updateReview: (...a) => mockUpdateReview(...a),
  deleteReview: (...a) => mockDeleteReview(...a),
  addFavorite: (...a) => mockAddFavorite(...a),
  removeFavorite: (...a) => mockRemoveFavorite(...a),
}))

vi.mock('../utils/url', () => ({
  resolvePhotoUrl: (p) => p || '',
}))

import RestaurantDetailPage from '../pages/RestaurantDetailPage'

const RESTAURANT = {
  id: '1',
  name: 'The Test Kitchen',
  cuisine_type: 'Italian',
  pricing_tier: '$$',
  avg_rating: 4.5,
  review_count: 12,
  address: '123 Main St',
  city: 'San Jose',
  state: 'CA',
  phone: '408-555-1234',
  description: 'A great Italian place',
  hours: 'mon:11AM-9PM,tue:11AM-9PM',
  amenities: 'wifi,parking',
  photos: '',
  is_claimed: true,
}

const REVIEWS = [
  { id: 'r1', user_id: '42', user_name: 'Alice', rating: 5, comment: 'Amazing food!', created_at: '2024-01-01T00:00:00Z' },
  { id: 'r2', user_id: '99', user_name: 'Bob', rating: 3, comment: 'It was okay', created_at: '2024-01-02T00:00:00Z' },
]

function renderPage(restaurantId = '1') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/restaurant/${restaurantId}`]}>
      <Routes>
        <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RestaurantDetailPage — loading state', () => {
  it('shows loading spinner initially', () => {
    mockGetRestaurant.mockImplementation(() => new Promise(() => {}))
    mockGetReviews.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('RestaurantDetailPage — error state', () => {
  it('shows error message when restaurant not found', async () => {
    mockGetRestaurant.mockRejectedValue(new Error('404'))
    mockGetReviews.mockRejectedValue(new Error('404'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/restaurant not found/i)).toBeInTheDocument()
    )
  })
})

describe('RestaurantDetailPage — data rendering', () => {
  beforeEach(() => {
    mockGetRestaurant.mockResolvedValue({ data: RESTAURANT })
    mockGetReviews.mockResolvedValue({ data: REVIEWS })
  })

  it('renders restaurant name', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('The Test Kitchen')).toBeInTheDocument())
  })

  it('renders cuisine type', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Italian')).toBeInTheDocument())
  })

  it('renders pricing tier', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/\$\$/)).toBeInTheDocument())
  })

  it('renders address', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/123 Main St/)).toBeInTheDocument())
  })

  it('renders phone number', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/408-555-1234/)).toBeInTheDocument())
  })

  it('renders review count', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/12 reviews/i)).toBeInTheDocument())
  })

  it('renders all reviews', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Amazing food!')).toBeInTheDocument()
      expect(screen.getByText('It was okay')).toBeInTheDocument()
    })
  })

  it('renders reviewer names', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows claimed badge', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/claimed/i)).toBeInTheDocument())
  })
})

describe('RestaurantDetailPage — favorite toggle', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'tok')
    mockGetRestaurant.mockResolvedValue({ data: RESTAURANT })
    mockGetReviews.mockResolvedValue({ data: REVIEWS })
  })
  afterEach(() => localStorage.clear())

  it('shows Save button when not favorited', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/♡ save/i)).toBeInTheDocument())
  })

  it('calls addFavorite and shows Saved on click', async () => {
    mockAddFavorite.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText(/♡ save/i))
    fireEvent.click(screen.getByText(/♡ save/i))
    await waitFor(() => expect(screen.getByText(/♥ saved/i)).toBeInTheDocument())
    expect(mockAddFavorite).toHaveBeenCalledWith('1')
  })

  it('calls removeFavorite when already saved', async () => {
    mockAddFavorite.mockResolvedValue({})
    mockRemoveFavorite.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText(/♡ save/i))
    fireEvent.click(screen.getByText(/♡ save/i))
    await waitFor(() => screen.getByText(/♥ saved/i))
    fireEvent.click(screen.getByText(/♥ saved/i))
    await waitFor(() => expect(mockRemoveFavorite).toHaveBeenCalledWith('1'))
  })
})

describe('RestaurantDetailPage — review form (logged in)', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('userId', '42')
    mockGetRestaurant.mockResolvedValue({ data: RESTAURANT })
    mockGetReviews.mockResolvedValue({ data: REVIEWS })
    mockCreateReview.mockResolvedValue({})
  })
  afterEach(() => localStorage.clear())

  it('shows Write Review button for logged-in users', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /write review/i })).toBeInTheDocument())
  })

  it('reveals review form on button click', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /write review/i }))
    fireEvent.click(screen.getByRole('button', { name: /write review/i }))
    expect(screen.getByPlaceholderText(/share your experience/i)).toBeInTheDocument()
  })

  it('submits review and calls createReview', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /write review/i }))
    fireEvent.click(screen.getByRole('button', { name: /write review/i }))
    await userEvent.type(screen.getByPlaceholderText(/share your experience/i), 'Great place!')
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }))
    await waitFor(() => expect(mockCreateReview).toHaveBeenCalledWith('1', { rating: 5, comment: 'Great place!' }))
  })

  it('shows Edit/Delete buttons only on own reviews', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Amazing food!'))
    // Alice's review (userId 42) — should have Edit/Delete
    const editBtns = screen.getAllByText(/edit/i)
    expect(editBtns).toHaveLength(1)
    // Bob's review (userId 99) — should not
    const deleteBtns = screen.getAllByText(/delete/i)
    expect(deleteBtns).toHaveLength(1)
  })
})

describe('RestaurantDetailPage — review form (logged out)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetRestaurant.mockResolvedValue({ data: RESTAURANT })
    mockGetReviews.mockResolvedValue({ data: REVIEWS })
  })

  it('does not show Write Review button when logged out', async () => {
    renderPage()
    await waitFor(() => screen.getByText('The Test Kitchen'))
    expect(screen.queryByRole('button', { name: /write review/i })).not.toBeInTheDocument()
  })

  it('navigates to login when logged-out user clicks Save', async () => {
    renderPage()
    await waitFor(() => screen.getByText(/♡ save/i))
    fireEvent.click(screen.getByText(/♡ save/i))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
