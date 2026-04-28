import { useState, useEffect, useRef } from 'react'
import { chatWithAI } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your Yelp AI assistant 🍽️ Tell me what you're in the mood for and I'll find the perfect restaurant for you!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const bottomRef = useRef(null)

  const QUICK_ACTIONS = [
    'Find dinner tonight 🍽️',
    'Best rated near me ⭐',
    'Vegan options 🌱',
    'Something romantic 🕯️',
    'Cheap eats 💰',
    'Family friendly 👨‍👩‍👧'
  ]

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
  }, [navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
  const userText = text || input.trim()
  if (!userText) return
  setInput('')
  setMessages(prev => [...prev, { role: 'user', text: userText }])
  setLoading(true)
  try {
    const res = await chatWithAI({ message: userText, session_id: sessionId || 'default' })
    setSessionId(res.data.session_id)
    
    // Map recommendations to match our frontend card format
    const recs = (res.data.recommendations || []).map(r => ({
      id: r.id || Math.random(),
      name: r.name,
      cuisine_type: r.cuisines,
      pricing_tier: r.pricing_tier,
      avg_rating: r.rating || 0,
      city: '',
      url: r.url || null,
      isWeb: typeof r.id === 'string' && r.id.startsWith('web-'),
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
        text: 'Sorry, I had trouble connecting. Please try again!' 
      }])
    }
  } finally { setLoading(false) }
}

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{ role: 'assistant', text: "Hi! I'm your Yelp AI assistant 🍽️ Tell me what you're in the mood for!" }])
    setSessionId(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Food Assistant</h1>
          <p className="text-gray-500 text-sm">Powered by your preferences</p>
        </div>
        <button onClick={clearChat} className="text-sm text-red-600 hover:underline">Clear chat</button>
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl shadow overflow-hidden flex flex-col" style={{ height: '65vh' }}>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                <p>{msg.text}</p>
                {/* Restaurant Recommendations */}
                {msg.recommendations?.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {msg.recommendations.map((r) => (
                      r.isWeb ? (
                        <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="bg-white rounded-xl p-3 text-gray-800 hover:shadow-md transition block">
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                            <span className="font-semibold text-gray-800 text-sm">{r.name}</span>
                          </div>
                          {r.cuisine_type && <div className="text-xs text-gray-500 mt-0.5 ml-5">{r.cuisine_type}</div>}
                          <div className="text-xs text-blue-400 mt-0.5 ml-5 truncate">View on Yelp ↗</div>
                        </a>
                      ) : (
                        <Link key={r.id} to={`/restaurant/${r.id}`}
                          className="bg-white rounded-xl p-3 text-gray-800 hover:shadow-md transition block">
                          <div className="font-semibold text-red-600">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.cuisine_type} • {r.pricing_tier} • ⭐ {r.avg_rating}</div>
                          <div className="text-xs text-gray-400">{r.city}</div>
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... e.g. 'I want something romantic'"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">Quick actions:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(action => (
            <button key={action} onClick={() => sendMessage(action)}
              className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm hover:border-red-400 hover:text-red-600 transition shadow-sm">
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}