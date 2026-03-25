import { getMergedCatalog } from '../data/catalogStore'
import { deriveLocations } from '../data/browseFacets'

/**
 * Popular Indian destinations — merged with live property locations for typeahead.
 */
const EXTRA_PLACES = [
  'Delhi, Delhi NCR',
  'New Delhi, Delhi NCR',
  'Gurugram, Haryana',
  'Noida, Uttar Pradesh',
  'Faridabad, Haryana',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Bengaluru, Karnataka',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan',
  'Jodhpur, Rajasthan',
  'Jaisalmer, Rajasthan',
  'Udaipur, Rajasthan',
  'Shimla, Himachal Pradesh',
  'Manali, Himachal Pradesh',
  'Dharamshala, Himachal Pradesh',
  'Rishikesh, Uttarakhand',
  'Dehradun, Uttarakhand',
  'Mussoorie, Uttarakhand',
  'Darjeeling, West Bengal',
  'Gangtok, Sikkim',
  'Shillong, Meghalaya',
  'North Goa, Goa',
  'South Goa, Goa',
  'Panaji, Goa',
  'Ooty, Tamil Nadu',
  'Munnar, Kerala',
  'Alleppey, Kerala',
  'Kochi, Kerala',
  'Thekkady, Kerala',
  'Hampi, Karnataka',
  'Mysuru, Karnataka',
  'Pondicherry, Puducherry',
  'Agra, Uttar Pradesh',
  'Varanasi, Uttar Pradesh',
  'Khajuraho, Madhya Pradesh',
  'Ujjain, Madhya Pradesh',
  'Indore, Madhya Pradesh',
  'Lonavala, Maharashtra',
  'Alibaug, Maharashtra',
]

function parseLabel(label) {
  const parts = label.split(',').map(s => s.trim())
  return {
    label,
    city: parts[0] || label,
    state: parts.slice(1).join(', ') || '',
  }
}

let cachedRows = null
let cachedPropsKey = ''

function mergedPropsCacheKey() {
  const m = getMergedCatalog()
  return `${m.length}:${m.map(p => p.id).join(',')}`
}

export function getPlaceRows() {
  const key = mergedPropsCacheKey()
  if (cachedRows && cachedPropsKey === key) return cachedRows
  cachedPropsKey = key
  const fromProps = deriveLocations(getMergedCatalog()).map(l => ({
    label: l.value,
    city: l.city,
    state: l.state,
  }))
  const extras = EXTRA_PLACES.map(parseLabel)
  const seen = new Set()
  const out = []
  for (const row of [...fromProps, ...extras]) {
    const key = row.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  out.sort((a, b) => a.city.localeCompare(b.city))
  cachedRows = out
  return out
}

/**
 * @param {string} query
 * @param {number} limit
 * @returns {string[]} full location labels for autocomplete
 */
export function suggestPlaces(query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const rows = getPlaceRows()
  const scored = []

  for (const row of rows) {
    const city = row.city.toLowerCase()
    const state = row.state.toLowerCase()
    const label = row.label.toLowerCase()
    let score = 100

    if (city === q) score = 0
    else if (city.startsWith(q)) score = 1
    else if (city.split(/\s+/).some(w => w.startsWith(q))) score = 2
    else if (state.startsWith(q)) score = 3
    else if (label.includes(q)) score = 4
    else if (city.includes(q)) score = 5
    else if (state.includes(q)) score = 6
    else continue

    scored.push({ label: row.label, score })
  }

  scored.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))
  const out = []
  const seen = new Set()
  for (const s of scored) {
    if (out.length >= limit) break
    const k = s.label.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s.label)
  }
  return out
}
