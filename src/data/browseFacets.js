/**
 * Faceted filters for the properties browse page.
 * Each amenity facet tests tags, amenities, type, and sometimes location text.
 */
export const AMENITY_FACETS = [
  {
    id: 'pool',
    label: 'Pool',
    test: p =>
      [...p.amenities, ...p.tags].some(s => /pool|plunge\s*pool/i.test(s)),
  },
  {
    id: 'chef',
    label: 'Private chef',
    test: p => [...p.amenities, ...p.tags].some(s => /chef|cuisine|dining/i.test(s)),
  },
  {
    id: 'butler',
    label: 'Butler / concierge',
    test: p => [...p.amenities, ...p.tags].some(s => /butler|concierge/i.test(s)),
  },
  {
    id: 'water',
    label: 'Lake / river / backwater',
    test: p =>
      [...p.amenities, ...p.tags].some(s =>
        /lake|ganga|backwater|river|boat|houseboat|ghat/i.test(s)
      ),
  },
  {
    id: 'beach',
    label: 'Beach / coast',
    test: p =>
      /goa|beach|coast|sea/i.test(p.location) ||
      [...p.amenities, ...p.tags].some(s => /beach|coast|sea/i.test(s)),
  },
  {
    id: 'mountain',
    label: 'Mountains / hills',
    test: p =>
      /manali|himachal|kullu/i.test(p.location.toLowerCase()) ||
      [...p.amenities, ...p.tags].some(s => /snow|mountain|himal|valley/i.test(s)),
  },
  {
    id: 'spa',
    label: 'Spa / wellness',
    test: p => [...p.amenities, ...p.tags].some(s => /spa|ayurved|yoga|sauna|wellness/i.test(s)),
  },
  {
    id: 'heritage',
    label: 'Heritage',
    test: p =>
      /heritage/i.test(p.type) || p.tags.some(t => /heritage/i.test(t)),
  },
]

export function deriveTypes(properties) {
  const set = new Set(properties.map(p => p.type))
  return ['All', ...[...set].sort()]
}

/** { value: full location string, city, state } */
export function deriveLocations(properties) {
  const map = new Map()
  for (const p of properties) {
    const loc = p.location.trim()
    if (!map.has(loc)) {
      const parts = loc.split(',').map(s => s.trim())
      map.set(loc, {
        value: loc,
        city: parts[0] || loc,
        state: parts.slice(1).join(', ') || '',
      })
    }
  }
  return [...map.values()].sort((a, b) => a.city.localeCompare(b.city))
}

export function deriveStates(properties) {
  const set = new Set()
  for (const p of properties) {
    const parts = p.location.split(',').map(s => s.trim())
    if (parts.length > 1) set.add(parts.slice(1).join(', '))
  }
  return ['All states', ...[...set].sort()]
}
