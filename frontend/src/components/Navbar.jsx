import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout, getMe } from '../services/api'
import { resolvePhotoUrl } from '../utils/url'
import { USER_PROFILE_UPDATED_EVENT } from '../utils/userEvents'

function Navbar() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  /** Name + avatar from API so the bar matches the profile after saves. */
  const [navUser, setNavUser] = useState(null)
  const token = localStorage.getItem('token')
  const userName = localStorage.getItem('userName')
  const userRole = localStorage.getItem('userRole')
  const greetingName = token ? (navUser?.name || userName || 'there') : ''
  const navInitial = (greetingName === 'there' ? '?' : greetingName).charAt(0).toUpperCase()

  useEffect(() => {
    if (!token) {
      setNavUser(null)
      return
    }
    const loadNavUser = () => {
      getMe()
        .then((res) => {
          setNavUser({
            name: res.data.name || '',
            avatarUrl: res.data.profile_picture
              ? resolvePhotoUrl(res.data.profile_picture)
              : null,
          })
        })
        .catch(() => {
          setNavUser({
            name: localStorage.getItem('userName') || '',
            avatarUrl: null,
          })
        })
    }
    loadNavUser()
    const onProfileUpdated = () => loadNavUser()
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated)
    return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated)
  }, [token])

  const handleLogout = async () => {
    try { await logout() } catch (e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('userName')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    setNavUser(null)
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <nav className="bg-red-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          yelp<span className="text-red-200">*</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="sm:hidden inline-flex items-center justify-center rounded-md border border-red-300 px-2 py-1 text-sm"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <div className={`${menuOpen ? 'flex' : 'hidden'} sm:flex absolute sm:static top-14 left-0 right-0 sm:top-auto z-20 bg-red-600 sm:bg-transparent px-3 sm:px-0 py-3 sm:py-0 border-t border-red-500 sm:border-0 flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm font-medium`}>
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
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-full sm:rounded-lg pl-1 pr-2 py-1 hover:bg-red-500/40 transition max-w-[min(100%,14rem)] sm:max-w-xs"
                title="My profile"
              >
                {navUser?.avatarUrl ? (
                  <img
                    src={navUser.avatarUrl}
                    alt={greetingName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-red-200 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-400 flex items-center justify-center text-white text-sm font-bold border-2 border-red-200 shrink-0">
                    {navInitial}
                  </div>
                )}
                <span className="text-red-50 font-semibold text-sm truncate">Hi, {greetingName}!</span>
              </Link>
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