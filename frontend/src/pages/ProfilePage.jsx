import { useState, useEffect } from 'react'
import { getMe, updateMe, getPreferences, savePreferences, getHistory } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const CUISINES = ['Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'American', 'Vegan', 'Mediterranean']
const DIETARY = ['vegetarian', 'vegan', 'halal', 'gluten-free', 'kosher']
const AMBIANCE = ['casual', 'fine dining', 'family-friendly', 'romantic', 'outdoor']

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({})
  const [prefs, setPrefs] = useState({ cuisines: [], price_range: '', dietary_restrictions: [], ambiance: [], sort_preference: 'rating', search_radius: 15 })
  const [history, setHistory] = useState({ reviews: [], restaurants_added: [] })
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [profilePic, setProfilePic] = useState(null)
  const [profilePicPreview, setProfilePicPreview] = useState(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const userRes = await getMe()
      setUser(userRes.data)
      setForm({
        name: userRes.data.name || '',
        email: userRes.data.email || '',
        phone: userRes.data.phone || '',
        city: userRes.data.city || '',
        state: userRes.data.state || '',
        country: userRes.data.country || '',
        languages: userRes.data.languages || '',
        gender: userRes.data.gender || '',
        about_me: userRes.data.about_me || '',
      })
      localStorage.setItem('userId', userRes.data.id)
      if (userRes.data.profile_picture) {
        setProfilePicPreview(`http://localhost:8000${userRes.data.profile_picture}`)
      }
    } catch { /* user profile fetch is best-effort */ }

    try {
      const prefRes = await getPreferences()
      if (prefRes.data) {
        setPrefs({
          cuisines: prefRes.data.cuisines ? prefRes.data.cuisines.split(',') : [],
          price_range: prefRes.data.price_range || '',
          dietary_restrictions: prefRes.data.dietary_needs ? prefRes.data.dietary_needs.split(',') : [],
          ambiance: prefRes.data.ambience ? prefRes.data.ambience.split(',') : [],
          sort_preference: prefRes.data.sort_preference || 'rating',
          search_radius: 15
        })
      }
    } catch { /* preferences fetch is best-effort */ }

    try {
      const histRes = await getHistory()
      setHistory(histRes.data || { reviews: [], restaurants_added: [] })
    } catch { /* history fetch is best-effort */ }

    setLoading(false)
  }

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    fetchAll() // eslint-disable-line react-hooks/set-state-in-effect
  }, [navigate])

  const handleSaveProfile = async (e) => {
  e.preventDefault()
  setSaving(true)
  try {
    await updateMe({
      name: form.name,
      phone: form.phone,
      about_me: form.about_me,
      city: form.city,
      state: form.state,
      country: form.country,
      languages: form.languages,
      gender: form.gender,
    })
    localStorage.setItem('userName', form.name)
    setMessage('Profile updated successfully!')
    setTimeout(() => setMessage(''), 3000)
    fetchAll()
  } catch {
    setMessage('Failed to update profile.')
  }
}
  const handleSavePrefs = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await savePreferences({
        cuisines: prefs.cuisines.join(','),
        price_range: prefs.price_range,
        dietary_needs: prefs.dietary_restrictions.join(','),
        ambience: prefs.ambiance.join(','),
        sort_preference: prefs.sort_preference,
      })
      setMessage('Preferences saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to save preferences.')
    }
  }

  const handlePicChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePic(file)
    setProfilePicPreview(URL.createObjectURL(file))
  }

  const handlePicUpload = async () => {
    if (!profilePic) return
    setUploadingPic(true)
    try {
      const formData = new FormData()
      formData.append('file', profilePic)
      const token = localStorage.getItem('token')
      await axios.put('http://localhost:8000/users/me/profile-pic', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setMessage('Profile picture updated!')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to upload picture.')
    }
  }

  const toggleArray = (arr, val) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
          {profilePicPreview ? (
            <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-gray-400">👤</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{user?.name}</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {['profile', 'preferences', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-2 text-sm font-semibold capitalize transition border-b-2 whitespace-nowrap ${
              tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm">
          ✓ {message}
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col gap-4">
          {/* Profile Picture */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-400">👤</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Profile Picture</label>
              <input type="file" accept="image/*" onChange={handlePicChange}
                className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-red-50 file:text-red-600 hover:file:bg-red-100" />
              {profilePic && (
                <button type="button" onClick={handlePicUpload} disabled={uploadingPic}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 w-fit">
                  {uploadingPic ? 'Uploading...' : 'Upload Photo'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', name: 'name', type: 'text' },
              { label: 'Email', name: 'email', type: 'email' },
              { label: 'Phone', name: 'phone', type: 'text' },
              { label: 'City', name: 'city', type: 'text' },
              { label: 'State (abbr.)', name: 'state', type: 'text' },
              { label: 'Languages', name: 'languages', type: 'text' },
            ].map(({ label, name, type }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={form[name] || ''}
                  onChange={e => setForm({ ...form, [name]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="">Select country</option>
                {['United States', 'Canada', 'United Kingdom', 'India', 'Australia', 'Germany', 'France', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">About Me</label>
            <textarea value={form.about_me || ''} onChange={e => setForm({ ...form, about_me: e.target.value })}
              rows={3} placeholder="Tell us about yourself..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <button type="submit" disabled={saving}
            className="bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <form onSubmit={handleSavePrefs} className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cuisine Preferences</label>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(c => (
                <button type="button" key={c}
                  onClick={() => setPrefs({ ...prefs, cuisines: toggleArray(prefs.cuisines || [], c) })}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    prefs.cuisines?.includes(c) ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                  }`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
            <div className="flex gap-2">
              {['$', '$$', '$$$', '$$$$'].map(p => (
                <button type="button" key={p} onClick={() => setPrefs({ ...prefs, price_range: p })}
                  className={`px-4 py-2 rounded-lg text-sm border font-semibold transition ${
                    prefs.price_range === p ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Radius: {prefs.search_radius} miles
            </label>
            <input type="range" min="1" max="50" value={prefs.search_radius || 15}
              onChange={e => setPrefs({ ...prefs, search_radius: parseInt(e.target.value) })}
              className="w-full accent-red-600" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dietary Restrictions</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map(d => (
                <button type="button" key={d}
                  onClick={() => setPrefs({ ...prefs, dietary_restrictions: toggleArray(prefs.dietary_restrictions || [], d) })}
                  className={`px-3 py-1 rounded-full text-sm border transition capitalize ${
                    prefs.dietary_restrictions?.includes(d) ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                  }`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ambiance Preferences</label>
            <div className="flex flex-wrap gap-2">
              {AMBIANCE.map(a => (
                <button type="button" key={a}
                  onClick={() => setPrefs({ ...prefs, ambiance: toggleArray(prefs.ambiance || [], a) })}
                  className={`px-3 py-1 rounded-full text-sm border transition capitalize ${
                    prefs.ambiance?.includes(a) ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                  }`}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort Preference</label>
            <select value={prefs.sort_preference || 'rating'}
              onChange={e => setPrefs({ ...prefs, sort_preference: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="rating">Rating</option>
              <option value="distance">Distance</option>
              <option value="popularity">Popularity</option>
              <option value="price">Price</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="flex flex-col gap-4">
          {/* Reviews History */}
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-4">
              My Reviews ({history.reviews?.length || 0})
            </h3>
            {!history.reviews?.length ? (
              <div className="text-center py-6 text-gray-400">
                <p>No reviews yet.</p>
                <Link to="/" className="text-red-600 hover:underline text-sm mt-1 inline-block">
                  Browse restaurants to review
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.reviews.map((item, i) => (
                  <Link key={i} to={`/restaurant/${item.restaurant_id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition">
                    <div>
                      <p className="font-semibold text-gray-800">{item.restaurant_name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.comment?.slice(0, 60)}{item.comment?.length > 60 ? '...' : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-yellow-500 font-bold">{'⭐'.repeat(item.rating)}</div>
                      <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Restaurants Added History */}
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-4">
              Restaurants I Added ({history.restaurants_added?.length || 0})
            </h3>
            {!history.restaurants_added?.length ? (
              <div className="text-center py-6 text-gray-400">
                <p>No restaurants added yet.</p>
                <Link to="/add-restaurant" className="text-red-600 hover:underline text-sm mt-1 inline-block">
                  Add a restaurant
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.restaurants_added.map((item, i) => (
                  <Link key={i} to={`/restaurant/${item.restaurant_id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition">
                    <p className="font-semibold text-gray-800">{item.restaurant_name}</p>
                    <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}