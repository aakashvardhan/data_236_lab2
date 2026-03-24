import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup, ownerSignup } from '../services/api'

const getSignupErrorMessage = (err) => {
  const responseData = err?.response?.data
  const validationErrors = Array.isArray(responseData?.errors) ? responseData.errors : []

  const passwordError = validationErrors.find(
    (validationError) => Array.isArray(validationError?.loc) && validationError.loc.includes('password')
  )

  if (passwordError?.msg) {
    return passwordError.msg
  }

  if (responseData?.detail) {
    return responseData.detail
  }

  return 'Signup failed. Please try again.'
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('user')
  const [form, setForm] = useState({ name: '', email: '', password: '', restaurant_location: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (role === 'owner') {
        await ownerSignup({ ...form, role: 'owner' })
      } else {
        await signup({ ...form, role: 'user' })
      }
      navigate('/login')
    } catch (err) {
      setError(getSignupErrorMessage(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-5 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">yelp<span className="text-red-400">*</span></h1>
          <p className="text-gray-500 mt-1">Create your account</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
          <button type="button" onClick={() => setRole('user')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition ${role === 'user' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            I'm a User
          </button>
          <button type="button" onClick={() => setRole('owner')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition ${role === 'owner' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            I'm an Owner
          </button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm break-words">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Doe"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          {role === 'owner' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Location</label>
              <input type="text" name="restaurant_location" value={form.restaurant_location} onChange={handleChange}
                required placeholder="San Jose, CA"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          )}
          <button type="submit" disabled={loading}
            className="bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 font-semibold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  )
}