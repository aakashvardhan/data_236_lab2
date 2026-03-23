import { useState, useEffect, useRef } from 'react'
import { getRestaurants, chatWithAI } from '../services/api'
import RestaurantCard from '../components/RestaurantCard'
import { Link } from 'react-router-dom'

export default function ExplorePage() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [price, setPrice] = useState('')
  const [keywords, setKeywords] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState('rating')

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! 🍽️ Tell me what you're craving and I'll find the perfect restaurant!" }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const bottomRef = useRef(null)

  const QUICK_ACTIONS = ['Best rated near me ⭐', 'Vegan options 🌱', 'Something romantic 🕯️', 'Cheap eats 💰']

  // Real-time search — fires on every filter change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRestaurants()
    }, 400) // wait 400ms after user stops typing
    return () => clearTimeout(timer)
  }, [search, cuisine, price, keywords, city, sort])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.name = search
      if (cuisine) params.cuisine_type = cuisine
      if (keywords) params.keywords = keywords
      if (city) params.city = city
      if (price) params.pricing_tier = price  // fixed: use pricing_tier not price_tier
      const res = await getRestaurants(params)
      let results = res.data.items || []

      // Client-side sorting
      if (sort === 'rating') results.sort((a, b) => b.avg_rating - a.avg_rating)
      else if (sort === 'price_low') results.sort((a, b) => (a.pricing_tier || '').length - (b.pricing_tier || '').length)
      else if (sort === 'price_high') results.sort((a, b) => (b.pricing_tier || '').length - (a.pricing_tier || '').length)
      else if (sort === 'reviews') results.sort((a, b) => b.review_count - a.review_count)

      setRestaurants(results)
    } catch (err) {
      setRestaurants([])
    } finally { setLoading(false) }
  }

  const sendChat = async (text) => {
  const userText = text || chatInput.trim()
  if (!userText) return
  setChatInput('')
  setMessages(prev => [...prev, { role: 'user', text: userText }])
  setChatLoading(true)
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Please log in to use the AI assistant! 😊' }])
      setChatLoading(false)
      return
    }
    const res = await chatWithAI({ message: userText, session_id: sessionId || 'default' })
    setSessionId(res.data.session_id)

    const recs = (res.data.recommendations || []).map(r => ({
      id: r.id || Math.random(),
      name: r.name,
      cuisine_type: r.cuisines,
      pricing_tier: r.pricing_tier,
      avg_rating: r.rating || 0,
      city: ''
    }))

    setMessages(prev => [...prev, {
      role: 'assistant',
      text: res.data.response,
      recommendations: recs
    }])
  } catch (err) {
    if (err.response && err.response.status === 401) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Your session has expired. Please log in again to use the AI! 😊' }])
    } else {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Sorry, AI is unavailable right now. Try searching above!' 
      }])
    }
  } finally { setChatLoading(false) }
}

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-red-600 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-bold mb-2">Find great local businesses</h1>
        <p className="text-red-200 mb-8">Restaurants, food, and more near you</p>
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none" />
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="City or zip code..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="Keywords: quiet, wifi, outdoor seating..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none" />
            <select value={cuisine} onChange={e => setCuisine(e.target.value)}
              className="px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none">
              <option value="">All Cuisines</option>
              {['Italian','Chinese','Mexican','Indian','Japanese','American','Vegan','Mediterranean'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={price} onChange={e => setPrice(e.target.value)}
              className="px-4 py-3 rounded-lg text-gray-800 text-sm focus:outline-none">
              <option value="">Any Price</option>
              <option value="$">$ Cheap eats</option>
              <option value="$$">$$ Moderate</option>
              <option value="$$$">$$$ Pricey</option>
              <option value="$$$$">$$$$ Ultra high-end</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">

        {/* Left - Restaurant Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-gray-800">
              {loading ? 'Searching...' : `${restaurants.length} Restaurants Found`}
            </h2>
            <div className="flex items-center gap-3">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                <option value="rating">Sort: Top Rated</option>
                <option value="reviews">Sort: Most Reviewed</option>
                <option value="price_low">Sort: Price Low → High</option>
                <option value="price_high">Sort: Price High → Low</option>
              </select>
              <Link to="/add-restaurant"
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
                + Add Restaurant
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
                  <div className="bg-gray-200 h-36 rounded-lg mb-3"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-lg font-medium">No restaurants found</p>
              <p className="text-sm mt-1">Try different search terms or ask the AI assistant!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
            </div>
          )}
        </div>

        {/* Right - AI Assistant Panel */}
        <div className="lg:w-96">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-4">
            <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">✨ AI Food Assistant</h3>
                <p className="text-red-200 text-xs">Ask me anything about food!</p>
              </div>
              <button onClick={() => { setMessages([{ role: 'assistant', text: "Hi! 🍽️ What are you craving?" }]); setSessionId(null) }}
                className="text-red-200 text-xs hover:text-white">Clear</button>
            </div>

            <div className="h-80 overflow-y-auto p-3 flex flex-col gap-3 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow'
                  }`}>
                    <p>{msg.text}</p>
                    {msg.recommendations?.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {msg.recommendations.map(r => (
                          <Link key={r.id} to={`/restaurant/${r.id}`}
                            className="bg-red-50 rounded-lg p-2 text-xs text-gray-800 hover:bg-red-100 transition block">
                            <div className="font-semibold text-red-600">{r.name}</div>
                            <div className="text-gray-500">{r.cuisine_type} • {r.pricing_tier || r.price_tier} • ⭐ {r.avg_rating}</div>
                          </Link>
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
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1">
              {QUICK_ACTIONS.map(a => (
                <button key={a} onClick={() => sendChat(a)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full hover:border-red-400 hover:text-red-600 transition">
                  {a}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask me anything..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                className="bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}