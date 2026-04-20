/**
 * Data validation tests — mirrors the validateField logic in AddRestaurantPage.
 * These run pure (no DOM, no network) and cover every branch of the validator.
 */

const HOURS_PATTERN = /^(\d{1,2}(:\d{2})?(AM|PM|am|pm)\s*-\s*\d{1,2}(:\d{2})?(AM|PM|am|pm)|[Cc]losed)$/

function validateField(name, value) {
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

// ---------------------------------------------------------------------------
// name
// ---------------------------------------------------------------------------
describe('validateField — name', () => {
  it('rejects empty string', () => {
    expect(validateField('name', '')).toBe('Restaurant name is required')
  })
  it('rejects whitespace-only', () => {
    expect(validateField('name', '   ')).toBe('Restaurant name is required')
  })
  it('rejects single character', () => {
    expect(validateField('name', 'A')).toBe('Name must be at least 2 characters')
  })
  it('rejects names over 100 chars', () => {
    expect(validateField('name', 'A'.repeat(101))).toBe('Name must be under 100 characters')
  })
  it('accepts a normal name', () => {
    expect(validateField('name', 'The Cheesecake Factory')).toBe('')
  })
  it('accepts exactly 2 characters', () => {
    expect(validateField('name', 'Bo')).toBe('')
  })
  it('accepts exactly 100 characters', () => {
    expect(validateField('name', 'A'.repeat(100))).toBe('')
  })
})

// ---------------------------------------------------------------------------
// cuisine_type
// ---------------------------------------------------------------------------
describe('validateField — cuisine_type', () => {
  it('rejects empty selection', () => {
    expect(validateField('cuisine_type', '')).toBe('Please select a cuisine type')
  })
  it('accepts a valid cuisine', () => {
    expect(validateField('cuisine_type', 'Italian')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// description
// ---------------------------------------------------------------------------
describe('validateField — description', () => {
  it('accepts empty description (optional field)', () => {
    expect(validateField('description', '')).toBe('')
  })
  it('rejects description over 500 chars', () => {
    expect(validateField('description', 'x'.repeat(501))).toBe('Description must be under 500 characters')
  })
  it('accepts exactly 500 chars', () => {
    expect(validateField('description', 'x'.repeat(500))).toBe('')
  })
})

// ---------------------------------------------------------------------------
// address
// ---------------------------------------------------------------------------
describe('validateField — address', () => {
  it('rejects empty address', () => {
    expect(validateField('address', '')).toBe('Address is required')
  })
  it('rejects whitespace-only', () => {
    expect(validateField('address', '   ')).toBe('Address is required')
  })
  it('accepts a valid street address', () => {
    expect(validateField('address', '123 Main St')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// city
// ---------------------------------------------------------------------------
describe('validateField — city', () => {
  it('rejects empty city', () => {
    expect(validateField('city', '')).toBe('City is required')
  })
  it('rejects city with digits', () => {
    expect(validateField('city', 'San Jose123')).toBe('City can only contain letters')
  })
  it('rejects city with special chars', () => {
    expect(validateField('city', 'St. Louis')).toBe('City can only contain letters')
  })
  it('accepts letters and spaces', () => {
    expect(validateField('city', 'San Jose')).toBe('')
  })
  it('accepts single-word city', () => {
    expect(validateField('city', 'Chicago')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
describe('validateField — state', () => {
  it('rejects empty state', () => {
    expect(validateField('state', '')).toBe('Please select a state')
  })
  it('accepts a valid state abbreviation', () => {
    expect(validateField('state', 'CA')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// zip_code
// ---------------------------------------------------------------------------
describe('validateField — zip_code', () => {
  it('rejects empty zip', () => {
    expect(validateField('zip_code', '')).toBe('Zip code is required')
  })
  it('rejects 4-digit zip', () => {
    expect(validateField('zip_code', '9511')).toBe('Enter a valid zip code (e.g. 95112)')
  })
  it('rejects 6-digit zip', () => {
    expect(validateField('zip_code', '951120')).toBe('Enter a valid zip code (e.g. 95112)')
  })
  it('rejects letters', () => {
    expect(validateField('zip_code', 'ABCDE')).toBe('Enter a valid zip code (e.g. 95112)')
  })
  it('accepts 5-digit zip', () => {
    expect(validateField('zip_code', '95112')).toBe('')
  })
  it('accepts ZIP+4 format', () => {
    expect(validateField('zip_code', '95112-1234')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// phone (optional)
// ---------------------------------------------------------------------------
describe('validateField — phone', () => {
  it('accepts empty phone (optional)', () => {
    expect(validateField('phone', '')).toBe('')
  })
  it('accepts standard US format', () => {
    expect(validateField('phone', '(408) 555-1234')).toBe('')
  })
  it('accepts digits only', () => {
    expect(validateField('phone', '4085551234')).toBe('')
  })
  it('rejects letters in phone', () => {
    expect(validateField('phone', 'call-me')).toBe('Enter a valid phone number')
  })
  it('rejects too-short number', () => {
    expect(validateField('phone', '123')).toBe('Enter a valid phone number')
  })
  it('rejects too-long number', () => {
    expect(validateField('phone', '1234567890123456')).toBe('Enter a valid phone number')
  })
})

// ---------------------------------------------------------------------------
// pricing_tier
// ---------------------------------------------------------------------------
describe('validateField — pricing_tier', () => {
  it('rejects empty tier', () => {
    expect(validateField('pricing_tier', '')).toBe('Please select a price tier')
  })
  it('accepts $ tier', () => {
    expect(validateField('pricing_tier', '$')).toBe('')
  })
  it('accepts $$$$ tier', () => {
    expect(validateField('pricing_tier', '$$$$')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// hours_of_operation pattern
// ---------------------------------------------------------------------------
describe('HOURS_PATTERN', () => {
  const valid = ['11AM-9PM', '9:30AM-10:30PM', '11am-9pm', 'Closed', 'closed']
  const invalid = ['9-5', '11:00-21:00', 'open', '11 AM - 9 PM extra']

  valid.forEach(h => {
    it(`accepts "${h}"`, () => {
      expect(HOURS_PATTERN.test(h)).toBe(true)
    })
  })

  invalid.forEach(h => {
    it(`rejects "${h}"`, () => {
      expect(HOURS_PATTERN.test(h)).toBe(false)
    })
  })
})
