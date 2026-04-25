import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser, selectAuth } from '../store/authSlice'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { status } = useSelector(selectAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const resultAction = await dispatch(loginUser(form))
      if (loginUser.rejected.match(resultAction)) {
        setError('Invalid email or password. Please try again.')
        return
      }
      const user = resultAction.payload.user
      if (user.role === 'owner') {
        navigate('/owner/dashboard')
      } else {
        navigate('/')
      }
    } catch {
      setError('Invalid email or password. Please try again.')
    }
  }

  const loading = status === 'loading'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-5 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">yelp<span className="text-red-400">*</span></h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" name="email" value={form.email} onChange={handleChange} required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="password" type="password" name="password" value={form.password} onChange={handleChange} required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-red-600 font-semibold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}