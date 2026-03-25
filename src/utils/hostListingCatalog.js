const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80&auto=format&fit=crop'

const FALLBACK_GRADIENT = 'linear-gradient(160deg, #4a1020 0%, #6b1d2e 45%, #2d5040 100%)'

/**
 * Build a guest-catalog property from an approved host submission (stored row).
 * @param {Record<string, unknown>} listing
 * @param {string} ownerEmailKey normalized email key
 */
export function hostSubmissionToCatalogProperty(listing, ownerEmailKey) {
  const id = Number(listing.id)
  const price = Math.max(0, Math.round(Number(listing.pricePerNight) || 0))
  const guests = Math.max(1, Math.min(24, Number(listing.guests) || 2))
  const bedrooms = Math.max(1, Number(listing.bedrooms) || 1)
  const baths = Math.max(1, Number(listing.bathrooms) || 1)
  const sqft = Math.max(200, Number(listing.sqft) || 2000)
  const amenities = Array.isArray(listing.amenities) ? listing.amenities.filter(Boolean) : []
  const photoDataUrls = Array.isArray(listing.photoDataUrls) ? listing.photoDataUrls.filter(Boolean) : []
  const image = photoDataUrls[0] || FALLBACK_IMAGE
  const desc = String(listing.description || '').trim() || 'Details coming soon — curated and verified by NammaStays.'
  const special = String(listing.specialFeature || '').trim()
  const tagline =
    special ||
    (desc.length > 120 ? `${desc.slice(0, 117)}…` : desc) ||
    'A personally inspected NammaStays home.'
  const tags = amenities.slice(0, 6)
  const year = new Date().getFullYear()

  return {
    id,
    name: String(listing.propertyName || 'Untitled stay').trim(),
    location: String(listing.location || '').trim(),
    tagline,
    price: price || 15000,
    rating: 5.0,
    reviews: 0,
    newListing: true,
    guests,
    bedrooms,
    baths,
    sqft,
    type: String(listing.type || 'Homestay'),
    image,
    gallery: photoDataUrls.length > 1 ? photoDataUrls : undefined,
    gradient: FALLBACK_GRADIENT,
    accent: '#c9883a',
    tags: tags.length ? tags : ['Curated', 'Host verified', 'NammaStays'],
    amenities: amenities.length ? amenities : ['Personally inspected', 'Host-approved amenities'],
    description: desc,
    owner: {
      name: String(listing.ownerName || 'Host').trim() || 'Host',
      since: String(year),
    },
    available: true,
    submittedListingId: id,
    hostOwnerEmail: ownerEmailKey,
  }
}

/**
 * All approved submissions as catalog-ready rows (IDs are submission timestamps — unique vs static 1..6).
 * @param {Record<string, unknown[]>} hostMap
 */
export function reconcileLiveCatalog(hostMap) {
  if (!hostMap || typeof hostMap !== 'object') return []
  const out = []
  const seen = new Set()
  Object.entries(hostMap).forEach(([email, list]) => {
    ;(list || []).forEach(l => {
      if (l.adminDecision !== 'approved') return
      const id = Number(l.id)
      if (!id || seen.has(id)) return
      seen.add(id)
      out.push(hostSubmissionToCatalogProperty(l, email))
    })
  })
  return out
}
