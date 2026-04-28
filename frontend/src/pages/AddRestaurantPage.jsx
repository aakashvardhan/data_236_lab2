import { useState } from 'react'
import { createRestaurant } from '../services/api'
import { useNavigate } from 'react-router-dom'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const AMENITIES = ['wifi', 'outdoor_seating', 'parking', 'delivery', 'takeout', 'reservations']
const CUISINES = [
  'Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'American',
  'Mediterranean', 'Thai', 'French', 'Greek', 'Korean', 'Vietnamese',
  'Middle Eastern', 'Spanish', 'Brazilian', 'Ethiopian', 'Caribbean',
  'Vegan', 'Vegetarian', 'Seafood', 'Steakhouse', 'Pizza', 'Burgers',
  'Sushi', 'BBQ', 'Cafe', 'Bakery', 'Desserts', 'Other'
]
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

const HOURS_PATTERN = /^(\d{1,2}(:\d{2})?(AM|PM|am|pm)\s*-\s*\d{1,2}(:\d{2})?(AM|PM|am|pm)|[Cc]losed)$/

export default function AddRestaurantPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', cuisine_type: '', description: '', address: '',
    city: '', state: '', zip_code: '', phone: '', pricing_tier: '',
    amenities: [], hours_of_operation: {}
  })
  const [photos, setPhotos] = useState([])
  const [photoPreview, setPhotoPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Validate individual field
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Restaurant name is required'
        if (value.trim().length < 2) return 'Name must be at least 2 characters'
        if (value.trim().length > 100) return 'Name must be under 100 characters'
        return ''
      case 'cuisine_type':
        if (!value) return 'Please select a cuisine type'
        return ''
      case 'description':
        if (value && value.length > 500) return 'Description must be under 500 characters'
        return ''
      case 'address':
        if (!value.trim()) return 'Address is required'
        return ''
      case 'city':
        if (!value.trim()) return 'City is required'
        if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'City can only contain letters'
        return ''
      case 'state':
        if (!value) return 'Please select a state'
        return ''
      case 'zip_code':
        if (!value.trim()) return 'Zip code is required'
        if (!/^\d{5}(-\d{4})?$/.test(value.trim())) return 'Enter a valid zip code (e.g. 95112)'
        return ''
      case 'phone':
        if (value && !/^[\d\s\-+()]{7,15}$/.test(value)) return 'Enter a valid phone number'
        return ''
      case 'pricing_tier':
        if (!value) return 'Please select a price tier'
        return ''
      default:
        return ''
    }
  }

  // Validate all fields
  const validateAll = () => {
    const requiredFields = ['name', 'cuisine_type', 'address', 'city', 'state', 'zip_code', 'pricing_tier']
    const newErrors = {}
    requiredFields.forEach(field => {
      const err = validateField(field, form[field])
      if (err) newErrors[field] = err
    })
    if (form.phone) {
      const err = validateField('phone', form.phone)
      if (err) newErrors.phone = err
    }
    if (form.description) {
      const err = validateField('description', form.description)
      if (err) newErrors.description = err
    }
    // Validate hours
    Object.entries(form.hours_of_operation).forEach(([day, hours]) => {
      if (hours && !HOURS_PATTERN.test(hours)) {
        newErrors[`hours_${day}`] = 'Use format like 11AM-9PM or Closed'
      }
    })
    return newErrors
  }

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
    }
  }

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateField(name, form[name]) }))
  }

  const toggleAmenity = (a) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a]
    }))
  }

  const handleHours = (day, value) => {
    setForm(prev => ({ ...prev, hours_of_operation: { ...prev.hours_of_operation, [day]: value } }))
    if (value && !HOURS_PATTERN.test(value)) {
      setErrors(prev => ({ ...prev, [`hours_${day}`]: 'Use format like 11AM-9PM or Closed' }))
    } else {
      setErrors(prev => { const e = { ...prev }; delete e[`hours_${day}`]; return e })
    }
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    const validFiles = files.filter(f => validTypes.includes(f.type))
    if (validFiles.length !== files.length) {
      setErrors(prev => ({ ...prev, photos: 'Only JPG, PNG, WEBP images allowed' }))
    } else {
      setErrors(prev => { const e = { ...prev }; delete e.photos; return e })
    }
    if (validFiles.length > 5) {
      setErrors(prev => ({ ...prev, photos: 'Maximum 5 photos allowed' }))
      return
    }
    setPhotos(validFiles)
    setPhotoPreview(validFiles.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!localStorage.getItem('token')) { navigate('/login'); return }

    // Mark all fields as touched
    const allTouched = {}
    Object.keys(form).forEach(k => allTouched[k] = true)
    setTouched(allTouched)

    const newErrors = validateAll()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // Scroll to first error
      const firstError = document.querySelector('.border-red-500')
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        cuisine_type: form.cuisine_type,
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        zip_code: form.zip_code.trim(),
        phone: form.phone.trim(),
        pricing_tier: form.pricing_tier,
        hours: Object.entries(form.hours_of_operation)
          .filter(([, v]) => v.trim())
          .map(([day, hours]) => `${day}:${hours}`)
          .join(',')
      }
      const res = await createRestaurant(payload)
      const restaurantId = res.data.id

      if (photos.length > 0) {
        const token = localStorage.getItem('token')
        for (const photo of photos) {
          const formData = new FormData()
          formData.append('file', photo)
          await fetch(`/api/restaurants/${restaurantId}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          })
        }
      }
      navigate(`/restaurant/${restaurantId}`)
    } catch (err) {
      setErrors({ submit: err.response?.data?.detail || 'Failed to create restaurant. Please try again.' })
    } finally { setLoading(false) }
  }

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
      errors[field] && touched[field]
        ? 'border-red-500 focus:ring-red-300 bg-red-50'
        : 'border-gray-300 focus:ring-red-400'
    }`

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Add a Restaurant</h1>
      <p className="text-gray-500 text-sm mb-6">Fields marked with * are required</p>

      {errors.submit && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          ⚠️ {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col gap-6">

        {/* Basic Info */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">1</span>
            Basic Info
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g. Pasta Paradise"
                className={inputClass('name')} />
              {errors.name && touched.name && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.name}</p>
              )}
            </div>

            {/* Cuisine — dropdown only, no free text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type <span className="text-red-500">*</span>
              </label>
              <select value={form.cuisine_type}
                onChange={e => handleChange('cuisine_type', e.target.value)}
                onBlur={() => handleBlur('cuisine_type')}
                className={inputClass('cuisine_type')}>
                <option value="">Select cuisine type...</option>
                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.cuisine_type && touched.cuisine_type && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.cuisine_type}</p>
              )}
            </div>

            {/* Price Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Tier <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {['$', '$$', '$$$', '$$$$'].map(p => (
                  <button type="button" key={p}
                    onClick={() => handleChange('pricing_tier', p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                      form.pricing_tier === p
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-gray-300 text-gray-600 hover:border-red-400'
                    }`}>{p}</button>
                ))}
              </div>
              {errors.pricing_tier && touched.pricing_tier && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.pricing_tier}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
                placeholder="123 Main St"
                className={inputClass('address')} />
              {errors.address && touched.address && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.address}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.city}
                onChange={e => handleChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                placeholder="San Jose"
                className={inputClass('city')} />
              {errors.city && touched.city && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.city}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select value={form.state}
                onChange={e => handleChange('state', e.target.value)}
                onBlur={() => handleBlur('state')}
                className={inputClass('state')}>
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && touched.state && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.state}</p>
              )}
            </div>

            {/* Zip Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.zip_code}
                onChange={e => handleChange('zip_code', e.target.value)}
                onBlur={() => handleBlur('zip_code')}
                placeholder="95112"
                maxLength={10}
                className={inputClass('zip_code')} />
              {errors.zip_code && touched.zip_code && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.zip_code}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="408-555-0000"
                className={inputClass('phone')} />
              {errors.phone && touched.phone && (
                <p className="text-red-500 text-xs mt-1">⚠ {errors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">2</span>
            Description
          </h2>
          <textarea value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            rows={3} placeholder="Describe the restaurant, its atmosphere, specialties..."
            className={inputClass('description')} />
          <div className="flex justify-between mt-1">
            {errors.description && touched.description ? (
              <p className="text-red-500 text-xs">⚠ {errors.description}</p>
            ) : <span />}
            <p className={`text-xs ${form.description.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
              {form.description.length}/500
            </p>
          </div>
        </div>

        {/* Hours */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-2">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">3</span>
            Hours of Operation
          </h2>
          <p className="text-xs text-gray-400 mb-3">Format: 11AM-9PM or Closed</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS.map(day => (
              <div key={day}>
                <div className="flex items-center gap-2">
                  <span className="capitalize text-sm text-gray-600 w-8">{day}</span>
                  <input type="text" placeholder="11AM-9PM or Closed"
                    value={form.hours_of_operation[day] || ''}
                    onChange={e => handleHours(day, e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 transition ${
                      errors[`hours_${day}`]
                        ? 'border-red-500 focus:ring-red-300 bg-red-50'
                        : 'border-gray-300 focus:ring-red-400'
                    }`} />
                </div>
                {errors[`hours_${day}`] && (
                  <p className="text-red-500 text-xs mt-0.5 ml-10">⚠ {errors[`hours_${day}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">4</span>
            Amenities
          </h2>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button type="button" key={a} onClick={() => toggleAmenity(a)}
                className={`px-3 py-1 rounded-full text-sm border transition capitalize ${
                  form.amenities.includes(a)
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-gray-300 text-gray-600 hover:border-red-400'
                }`}>{a.replace('_', ' ')}</button>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-2">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">5</span>
            Photos
          </h2>
          <p className="text-xs text-gray-400 mb-3">Max 5 photos. JPG, PNG, WEBP only. Each under 5MB.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple
            onChange={handlePhotoChange}
            className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-red-50 file:text-red-600 hover:file:bg-red-100" />
          {errors.photos && (
            <p className="text-red-500 text-xs mt-1">⚠ {errors.photos}</p>
          )}
          {photoPreview.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photoPreview.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="preview"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  <button type="button"
                    onClick={() => {
                      setPhotos(prev => prev.filter((_, idx) => idx !== i))
                      setPhotoPreview(prev => prev.filter((_, idx) => idx !== i))
                    }}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-700">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding Restaurant...
            </>
          ) : 'Add Restaurant'}
        </button>
      </form>
    </div>
  )
}