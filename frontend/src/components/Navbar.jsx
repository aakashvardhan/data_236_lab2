import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../services/api'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const userName = localStorage.getItem('userName')
  const userRole = localStorage.getItem('userRole')

  const handleLogout = async () => {
    try { await logout() } catch (e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('userName')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    navigate('/login')
  }

  return (
    <nav className="bg-red-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          yelp<span className="text-red-200">*</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-red-200 transition">Explore</Link>
          {token ? (
            <>
              {userRole === 'owner' ? (
                <>
                  <Link to="/owner/dashboard" className="hover:text-red-200 transition">Owner Dashboard</Link>
                  <Link to="/add-restaurant" className="hover:text-red-200 transition">+ Add Restaurant</Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="hover:text-red-200 transition">AI Assistant</Link>
                  <Link to="/favorites" className="hover:text-red-200 transition">Favorites</Link>
                  <Link to="/add-restaurant" className="hover:text-red-200 transition">+ Add</Link>
                </>
              )}
              <Link to="/profile" className="hover:text-red-200 transition">Profile</Link>
              <span className="text-red-200">Hi, {userName}!</span>
              <button
                onClick={handleLogout}
                className="bg-white text-red-600 px-3 py-1 rounded-full font-semibold hover:bg-red-100 transition">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-red-200 transition">Log In</Link>
              <Link to="/signup"
                className="bg-white text-red-600 px-4 py-1 rounded-full font-semibold hover:bg-red-100 transition">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar