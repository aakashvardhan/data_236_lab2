import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchRestaurants as fetchRestaurantsThunk, selectRestaurants, selectRestaurantsMeta, selectRestaurantListStatus } from '../store/restaurantSlice'
import { getRestaurants, chatWithAI } from '../services/api'
import RestaurantCard from '../components/RestaurantCard'
import { Link } from 'react-router-dom'

const CUISINES = ['Italian','Chinese','Mexican','Indian','Japanese','American','Vegan','Mediterranean']
const CUISINE_ICONS = { Italian:'🍝', Chinese:'🥡', Mexican:'🌮', Indian:'🍛', Japanese:'🍣', American:'🍔', Vegan:'🥗', Mediterranean:'🫒' }
const QUICK_ACTIONS = ['Best rated near me ⭐', 'Vegan options 🌱', 'Something romantic 🕯️', 'Cheap eats 💰']

export default function ExplorePage() {
  const dispatch = useDispatch()
  const restaurants = useSelector(selectRestaurants)
  const { total: totalRestaurants, totalPages } = useSelector(selectRestaurantsMeta)
  const listStatus = useSelector(selectRestaurantListStatus)

  const [topRated, setTopRated] = useState([])
  const [newest, setNewest] = useState([])
  const [page, setPage] = useState(1)
  const perPage = 12
  const loading = listStatus === 'loading'
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [price, setPrice] = useState('')
  const [keywords, setKeywords] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState('rating')
  const [hasSearched, setHasSearched] = useState(false)

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! 🍽️ Tell me what you're craving and I'll find the perfect restaurant!" }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { setPage(1) }, [search, cuisine, price, keywords, city, sort])

  useEffect(() => {
    const timer = setTimeout(() => { runFetch() }, 400)
    return () => clearTimeout(timer)
  }, [search, cuisine, price, keywords, city, sort, page])

  useEffect(() => {
    getRestaurants({ sort_by: 'rating', sort_order: 'desc', per_page: 8 })
      .then(res => setTopRated(res.data.items || [])).catch(() => {})
    getRestaurants({ per_page: 6 })
      .then(res => setNewest(res.data.items || [])).catch(() => {})
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const runFetch = () => {
    const isSearching = search || cuisine || price || keywords || city
    setHasSearched(!!isSearching)
    const params = { page, per_page: perPage }
    if (sort === 'rating') { params.sort_by = 'rating'; params.sort_order = 'desc' }
    else if (sort === 'reviews') { params.sort_by = 'reviews'; params.sort_order = 'desc' }
    else if (sort === 'price_low') { params.sort_by = 'price'; params.sort_order = 'asc' }
    else if (sort === 'price_high') { params.sort_by = 'price'; params.sort_order = 'desc' }
    if (search) params.name = search
    if (cuisine) params.cuisine_type = cuisine
    if (keywords) params.keywords = keywords
    if (city) params.city = city
    if (price) params.pricing_tier = price
    dispatch(fetchRestaurantsThunk(params))
  }

  const buildVisiblePages = () => {
    const windowSize = 5
    const start = Math.max(1, page - Math.floor(windowSize / 2))
    const end = Math.min(totalPages, start + windowSize - 1)
    const adjustedStart = Math.max(1, end - windowSize + 1)
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i)
  }

  const sendChat = async (text) => {
    const userText = text || chatInput.trim()
    if (!userText) return
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setChatLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { setMessages(prev => [...prev, { role: 'assistant', text: 'Please log in to use the AI assistant! 😊' }]); return }
      const res = await chatWithAI({ message: userText, session_id: sessionId || 'default' })
      setSessionId(res.data.session_id)
      const recs = (res.data.recommendations || []).map(r => ({ id: r.id || Math.random(), name: r.name, cuisine_type: r.cuisines, pricing_tier: r.pricing_tier, avg_rating: r.rating || 0, url: r.url || null, isWeb: typeof r.id === 'string' && r.id.startsWith('web-') }))
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.response, recommendations: recs }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: err.response?.status === 401 ? 'Session expired. Please log in again!' : 'Sorry, AI is unavailable right now.' }])
    } finally { setChatLoading(false) }
  }

  const HorizontalScroll = ({ children }) => (
    <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {children}
    </div>
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div className="bg-red-600 text-white py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">Find great local businesses</h1>
          <p className="text-red-200 mb-10 text-lg">Restaurants, food, and more near you</p>
          <div className="bg-white rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row gap-2 mb-3">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search restaurants..."
              className="flex-1 px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50" />
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="📍 City or zip code..."
              className="flex-1 px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50" />
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row gap-2">
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="Keywords: quiet, wifi, outdoor seating..."
              className="flex-1 px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50" />
            <select value={cuisine} onChange={e => setCuisine(e.target.value)}
              className="px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none bg-gray-50 min-w-[140px]">
              <option value="">All Cuisines</option>
              {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={price} onChange={e => setPrice(e.target.value)}
              className="px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none bg-gray-50 min-w-[120px]">
              <option value="">Any Price</option>
              <option value="$">$ Cheap eats</option>
              <option value="$$">$$ Moderate</option>
              <option value="$$$">$$$ Pricey</option>
              <option value="$$$$">$$$$ Ultra high-end</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Cuisine Pills ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-10 py-3">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setCuisine('')}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition border ${
                cuisine === '' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-600'
              }`}>All</button>
            {CUISINES.map(c => (
              <button key={c} onClick={() => setCuisine(cuisine === c ? '' : c)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition border ${
                  cuisine === c ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-600'
                }`}>
                {CUISINE_ICONS[c]} {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-10 py-10">

        {/* ── Search Results ── */}
        {hasSearched || search || cuisine || price || keywords || city ? (
          <>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {loading ? 'Searching...' : `${totalRestaurants} Restaurants Found`}
              </h2>
              <div className="flex items-center gap-3">
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                  <option value="rating">Top Rated</option>
                  <option value="reviews">Most Reviewed</option>
                  <option value="price_low">Price Low → High</option>
                  <option value="price_high">Price High → Low</option>
                </select>
                <Link to="/add-restaurant" className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                  + Add Restaurant
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="flex flex-wrap gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl animate-pulse w-[260px] flex-shrink-0">
                    <div className="bg-gray-200 h-[180px] rounded-t-xl" />
                    <div className="p-4">
                      <div className="bg-gray-200 h-5 rounded mb-2" />
                      <div className="bg-gray-200 h-4 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <div className="text-6xl mb-5">🍽️</div>
                <p className="text-xl font-semibold text-gray-600">No restaurants found</p>
                <p className="text-sm mt-2">Try different search terms or ask the AI assistant!</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-6">
                  {restaurants.map(r => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white disabled:opacity-40 hover:border-red-400 hover:text-red-600 font-medium">Previous</button>
                    {buildVisiblePages().map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${n === page ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 bg-white hover:border-red-400 hover:text-red-600'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white disabled:opacity-40 hover:border-red-400 hover:text-red-600 font-medium">Next</button>
                  </div>
                )}
              </>
            )}
          </>

        ) : (
          /* ── Homepage sections ── */
          <>
            {/* Top Rated */}
            {topRated.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">⭐ Top Rated Near You</h2>
                    <p className="text-sm text-gray-500 mt-1">Highest rated restaurants right now</p>
                  </div>
                  <button onClick={() => { setSort('rating'); setHasSearched(true) }}
                    className="text-sm text-red-600 hover:underline font-semibold">View all →</button>
                </div>
                <HorizontalScroll>
                  {topRated.map(r => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </HorizontalScroll>
              </section>
            )}

            {/* Browse by Cuisine */}
            <section className="mb-14">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-gray-900">🍴 Browse by Cuisine</h2>
                <p className="text-sm text-gray-500 mt-1">Find exactly what you're craving</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CUISINES.map(c => (
                  <button key={c} onClick={() => setCuisine(c)}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition p-6 flex flex-col items-center gap-3 group hover:border-red-300">
                    <span className="text-4xl group-hover:scale-110 transition-transform">{CUISINE_ICONS[c]}</span>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600">{c}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Browse by Price */}
            <section className="mb-14">
              <h2 className="text-2xl font-bold text-gray-900 mb-5">🎯 Browse by Price</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: '$ Budget', value: '$', desc: 'Under $15', color: 'from-green-50 to-emerald-50 border-green-200' },
                  { label: '$$ Casual', value: '$$', desc: '$15 – $30', color: 'from-blue-50 to-sky-50 border-blue-200' },
                  { label: '$$$ Upscale', value: '$$$', desc: '$30 – $60', color: 'from-purple-50 to-violet-50 border-purple-200' },
                  { label: '$$$$ Fine Dining', value: '$$$$', desc: '$60+', color: 'from-amber-50 to-yellow-50 border-amber-200' },
                ].map(({ label, value, desc, color }) => (
                  <button key={value} onClick={() => setPrice(value)}
                    className={`bg-gradient-to-br ${color} border rounded-2xl p-5 text-left hover:shadow-md transition group`}>
                    <div className="font-bold text-gray-800 group-hover:text-red-600">{label}</div>
                    <div className="text-sm text-gray-500 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recently Added */}
            {newest.length > 0 && (
              <section className="mb-14">
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-gray-900">🆕 Recently Added</h2>
                  <p className="text-sm text-gray-500 mt-1">Fresh listings on Yelp*</p>
                </div>
                <HorizontalScroll>
                  {newest.map(r => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </HorizontalScroll>
              </section>
            )}

            {/* Footer */}
            <footer className="border-t border-gray-200 pt-12 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 mb-10">
                <div>
                  <div className="text-xl font-bold text-gray-900 mb-2">yelp<span className="text-red-500">*</span></div>
                  <p className="text-sm text-gray-400 leading-relaxed">Find great local restaurants and businesses near you.</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Discover</h4>
                  <div className="flex flex-col gap-3">
                    {[['/', 'Explore Restaurants'], ['/favorites', 'My Favorites'], ['/add-restaurant', 'Add a Restaurant']].map(([to, label]) => (
                      <Link key={to} to={to} className="text-sm text-gray-500 hover:text-red-600 transition">{label}</Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">For Businesses</h4>
                  <div className="flex flex-col gap-3">
                    {[['/signup', 'Owner Sign Up'], ['/owner/dashboard', 'Owner Dashboard'], ['/add-restaurant', 'List Your Restaurant']].map(([to, label]) => (
                      <Link key={to} to={to} className="text-sm text-gray-500 hover:text-red-600 transition">{label}</Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-5 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400">© {new Date().getFullYear()} Yelp* Clone · Built for DATA236</p>
                <div className="flex gap-5">
                  {['Privacy', 'Terms', 'Accessibility'].map(item => (
                    <span key={item} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">{item}</span>
                  ))}
                </div>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* ── Floating AI Chat ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-80 sm:w-96 flex flex-col" style={{ maxHeight: '520px' }}>
            <div className="bg-red-600 text-white px-4 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">✨ AI Food Assistant</h3>
                <p className="text-red-200 text-xs">Ask me anything about food!</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setMessages([{ role: 'assistant', text: "Hi! 🍽️ What are you craving?" }]); setSessionId(null) }}
                  className="text-red-200 text-xs hover:text-white">Clear</button>
                <button onClick={() => setChatOpen(false)} className="text-red-200 hover:text-white text-xl font-bold leading-none">−</button>
              </div>
            </div>
            <div className="overflow-y-auto p-3 flex flex-col gap-3 bg-gray-50" style={{ minHeight: '200px', maxHeight: '300px' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow'}`}>
                    <p>{msg.text}</p>
                    {msg.recommendations?.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {msg.recommendations.map(r => (
                          r.isWeb ? (
                            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                              className="bg-red-50 rounded-lg p-2 text-xs text-gray-800 hover:bg-red-100 transition block">
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                                <span className="font-semibold text-gray-800">{r.name}</span>
                              </div>
                              {r.cuisine_type && <div className="text-gray-500 ml-4">{r.cuisine_type}</div>}
                              <div className="text-blue-400 ml-4">View on Yelp ↗</div>
                            </a>
                          ) : (
                            <Link key={r.id} to={`/restaurant/${r.id}`}
                              className="bg-red-50 rounded-lg p-2 text-xs text-gray-800 hover:bg-red-100 transition block">
                              <div className="font-semibold text-red-600">{r.name}</div>
                              <div className="text-gray-500">{r.cuisine_type} · {r.pricing_tier} · ⭐ {r.avg_rating}</div>
                            </Link>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-none px-3 py-2 shadow">
                    <div className="flex gap-1">
                      {[0, 0.1, 0.2].map((d, i) => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1">
              {QUICK_ACTIONS.map(a => (
                <button key={a} onClick={() => sendChat(a)} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full hover:border-red-400 hover:text-red-600 transition">{a}</button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask me anything..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                className="bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">Send</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(prev => !prev)}
          className="bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95"
          title="AI Food Assistant">
          {chatOpen ? '✕' : '✨'}
        </button>
      </div>
    </div>
  )
}
