/**
 * LoginPage UI/UX tests — form rendering, submission, error handling, redirect.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogin = vi.fn()
const mockGetMe = vi.fn()
vi.mock('../services/api', () => ({
  login: (...args) => mockLogin(...args),
  getMe: (...args) => mockGetMe(...args),
}))

import LoginPage from '../pages/LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage — rendering', () => {
  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('has a link to sign up', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('does not show error message initially', () => {
    renderLogin()
    expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument()
  })
})

describe('LoginPage — successful login (regular user)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    mockLogin.mockResolvedValue({ data: { access_token: 'tok-123' } })
    mockGetMe.mockResolvedValue({ data: { name: 'Alice', role: 'user', id: '1' } })
  })
  afterEach(() => localStorage.clear())

  it('stores token in localStorage', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok-123'))
  })

  it('stores userName in localStorage', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(localStorage.getItem('userName')).toBe('Alice'))
  })

  it('redirects regular user to /', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })
})

describe('LoginPage — successful login (owner)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    mockLogin.mockResolvedValue({ data: { access_token: 'owner-tok' } })
    mockGetMe.mockResolvedValue({ data: { name: 'Bob', role: 'owner', id: '2' } })
  })
  afterEach(() => localStorage.clear())

  it('redirects owner to /owner/dashboard', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/owner/dashboard'))
  })
})

describe('LoginPage — failed login', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockLogin.mockRejectedValue(new Error('401'))
  })

  it('shows error message on failed login', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    )
  })

  it('does not navigate on failed login', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => screen.getByText(/invalid email or password/i))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not store token on failed login', async () => {
    localStorage.clear()
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => screen.getByText(/invalid email or password/i))
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('LoginPage — loading state', () => {
  it('disables button while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})) // never resolves
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    )
  })
})
