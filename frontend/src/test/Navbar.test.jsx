/**
 * Navbar UI/UX tests — verifies correct links render based on auth state
 * and that logout clears localStorage and redirects.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from './test-utils'

// Mock api module so logout doesn't make real HTTP requests
vi.mock('../services/api', () => ({
  logout: vi.fn().mockResolvedValue({}),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import Navbar from '../components/Navbar'

function renderNavbar() {
  return renderWithProviders(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar — unauthenticated', () => {
  beforeEach(() => localStorage.clear())

  it('shows Log In and Sign Up links', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('does not show Logout button', () => {
    renderNavbar()
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument()
  })

  it('does not show Profile link', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument()
  })

  it('always shows Explore link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument()
  })
})

describe('Navbar — authenticated regular user', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('userName', 'Alice')
    localStorage.setItem('userRole', 'user')
  })
  afterEach(() => localStorage.clear())

  it('shows greeting with username', () => {
    renderNavbar()
    expect(screen.getByText(/hi, alice/i)).toBeInTheDocument()
  })

  it('shows Favorites link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /favorites/i })).toBeInTheDocument()
  })

  it('shows AI Assistant link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /ai assistant/i })).toBeInTheDocument()
  })

  it('shows Profile link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
  })

  it('shows Logout button', () => {
    renderNavbar()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('does not show Owner Dashboard for regular user', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: /owner dashboard/i })).not.toBeInTheDocument()
  })
})

describe('Navbar — authenticated owner', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'owner-token')
    localStorage.setItem('userName', 'Bob')
    localStorage.setItem('userRole', 'owner')
  })
  afterEach(() => localStorage.clear())

  it('shows Owner Dashboard link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /owner dashboard/i })).toBeInTheDocument()
  })

  it('does not show Favorites for owner', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: /favorites/i })).not.toBeInTheDocument()
  })

  it('does not show AI Assistant for owner', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: /ai assistant/i })).not.toBeInTheDocument()
  })
})

describe('Navbar — logout flow', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('userName', 'Alice')
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userId', '42')
    mockNavigate.mockClear()
  })
  afterEach(() => localStorage.clear())

  it('clears localStorage on logout', async () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    await vi.waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('userName')).toBeNull()
      expect(localStorage.getItem('userRole')).toBeNull()
      expect(localStorage.getItem('userId')).toBeNull()
    })
  })

  it('navigates to /login on logout', async () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})

describe('Navbar — mobile menu toggle', () => {
  beforeEach(() => localStorage.clear())

  it('menu button toggles aria-expanded', () => {
    renderNavbar()
    const btn = screen.getByRole('button', { name: /toggle menu/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('button label changes between Menu and Close', () => {
    renderNavbar()
    const btn = screen.getByRole('button', { name: /toggle menu/i })
    expect(btn).toHaveTextContent('Menu')
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Close')
  })
})
