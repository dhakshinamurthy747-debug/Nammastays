import React, { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, X, MapPin, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  AMENITY_FACETS,
  deriveTypes,
  deriveLocations,
  deriveStates,
} from '../data/browseFacets'
import PropertyCard from '../components/PropertyCard'
import Footer from '../components/Footer'
import { LocationSearchField } from '../components/LocationSearchField'
import styles from './Properties.module.css'

const PRICE_RANGES = [
  { label: 'Any price', min: 0, max: Infinity },
  { label: 'Under ₹20k', min: 0, max: 20000 },
  { label: '₹20k – ₹35k', min: 20000, max: 35000 },
  { label: 'Over ₹35k', min: 35000, max: Infinity },
]

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name A–Z' },
]

const GUEST_OPTIONS = [
  { value: 0, label: 'Any guests' },
  ...Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    return { value: n, label: `${n}+ guest${n === 1 ? '' : 's'}` }
  }),
]

const BED_OPTIONS = [
  { value: 0, label: 'Any bedrooms' },
  { value: 2, label: '2+ beds' },
  { value: 3, label: '3+ beds' },
  { value: 4, label: '4+ beds' },
  { value: 5, label: '5+ beds' },
]

export default function Properties() {
  const { mergedCatalogProperties: properties } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const types = useMemo(() => deriveTypes(properties), [properties])
  const locations = useMemo(() => deriveLocations(properties), [properties])
  const states = useMemo(() => deriveStates(properties), [properties])

  const [typeFilter, setTypeFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState('All states')
  const [cityFilter, setCityFilter] = useState('all')
  const [priceRange, setPriceRange] = useState(0)
  const [showAvailable, setShowAvailable] = useState(false)
  const [minGuests, setMinGuests] = useState(0)
  const [minBedrooms, setMinBedrooms] = useState(0)
  const [tripCheckIn, setTripCheckIn] = useState('')
  const [tripCheckOut, setTripCheckOut] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [amenityPick, setAmenityPick] = useState(() => {
    const raw = searchParams.get('amenities')
    return raw ? raw.split(',').filter(Boolean) : []
  })

  useEffect(() => {
    if (location.state?.browseQ == null) return
    setSearch(String(location.state.browseQ))
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.state, location.pathname, location.search, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const g = parseInt(params.get('guests') || '0', 10)
    setMinGuests(Number.isFinite(g) && g > 0 ? g : 0)
    const ci = params.get('checkIn') || ''
    const co = params.get('checkOut') || ''
    setTripCheckIn(ci)
    setTripCheckOut(co)
  }, [location.search])

  const toggleAmenity = id => {
    setAmenityPick(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const range = PRICE_RANGES[priceRange]

    return properties.filter(p => {
      const hay = `${p.name} ${p.location} ${p.tagline} ${p.type} ${p.tags.join(' ')}`.toLowerCase()
      const matchSearch = !q || hay.includes(q) || p.amenities.some(a => a.toLowerCase().includes(q))

      const matchType = typeFilter === 'All' || p.type === typeFilter

      const locParts = p.location.split(',').map(s => s.trim())
      const statePart = locParts.length > 1 ? locParts.slice(1).join(', ') : ''
      const matchState = stateFilter === 'All states' || statePart === stateFilter

      const matchCity = cityFilter === 'all' || p.location === cityFilter

      const matchPrice = p.price >= range.min && p.price <= range.max
      const matchAvail = !showAvailable || p.available
      const matchGuests = minGuests === 0 || p.guests >= minGuests
      const matchBeds = minBedrooms === 0 || p.bedrooms >= minBedrooms

      const matchAmenities =
        amenityPick.length === 0 ||
        amenityPick.every(fid => {
          const facet = AMENITY_FACETS.find(f => f.id === fid)
          return facet ? facet.test(p) : true
        })

      return (
        matchSearch &&
        matchType &&
        matchState &&
        matchCity &&
        matchPrice &&
        matchAvail &&
        matchGuests &&
        matchBeds &&
        matchAmenities
      )
    })
  }, [
    properties,
    search,
    typeFilter,
    stateFilter,
    cityFilter,
    priceRange,
    showAvailable,
    minGuests,
    minBedrooms,
    amenityPick,
  ])

  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price)
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price)
      case 'rating-desc':
        return list.sort((a, b) => b.rating - a.rating)
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return list.sort((a, b) => a.id - b.id)
    }
  }, [filtered, sortBy])

  const panelFilterCount =
    (typeFilter !== 'All' ? 1 : 0) +
    (stateFilter !== 'All states' ? 1 : 0) +
    (cityFilter !== 'all' ? 1 : 0) +
    (priceRange !== 0 ? 1 : 0) +
    (showAvailable ? 1 : 0) +
    (minGuests > 0 ? 1 : 0) +
    (minBedrooms > 0 ? 1 : 0) +
    amenityPick.length

  const tripFromUrl = Boolean(tripCheckIn && tripCheckOut)
  const activeFilterCount =
    panelFilterCount +
    (search.trim() ? 1 : 0) +
    (sortBy !== 'featured' ? 1 : 0) +
    (tripFromUrl ? 1 : 0)

  const clearAll = () => {
    setSearch('')
    setTypeFilter('All')
    setStateFilter('All states')
    setCityFilter('all')
    setPriceRange(0)
    setShowAvailable(false)
    setMinGuests(0)
    setMinBedrooms(0)
    setSortBy('featured')
    setAmenityPick([])
    setTripCheckIn('')
    setTripCheckOut('')
    setSearchParams({}, { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className="section-label animate-fade-up">The collection</div>
          <h1 className={`${styles.title} animate-fade-up-delay-1`}>Find your stay</h1>
          <p className={`${styles.sub} animate-fade-up-delay-2`}>
            Search anything — or open <strong>Filters</strong> only when you want to narrow by place, price, or amenities.
          </p>
        </div>
      </div>

      <div className={styles.filters}>
        {tripFromUrl && (
          <div className={styles.tripBar} role="status">
            <span>
              Trip: <strong>{tripCheckIn}</strong> → <strong>{tripCheckOut}</strong>
              {minGuests > 0 && (
                <>
                  {' '}
                  · <strong>{minGuests}+</strong> guests
                </>
              )}
            </span>
            <span className={styles.tripBarNote}>Showing properties that can host your group. Dates are for your planning — pick exact nights on the listing.</span>
          </div>
        )}
        <div className={styles.topBar}>
          <div className={styles.searchWrap}>
            <Search size={18} color="var(--muted)" aria-hidden />
            <LocationSearchField
              value={search}
              onChange={setSearch}
              minChars={1}
              maxSuggestions={10}
              type="search"
              className={styles.searchFieldRoot}
              inputClassName={styles.search}
              placeholder="City, name, or vibe — e.g. Delhi, Goa, pool…"
              aria-label="Search properties"
            />
            {search && (
              <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className={styles.topBarRight}>
            <div className={styles.sortBox}>
              <label className={styles.sortLabel} htmlFor="sort-select">
                Sort
              </label>
              <div className={styles.selectWrap}>
                <select id="sort-select" className={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className={styles.selectIcon} aria-hidden />
              </div>
            </div>

            <button
              type="button"
              className={`${styles.filtersToggle} ${filtersOpen ? styles.filtersToggleOpen : ''}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(o => !o)}
            >
              <SlidersHorizontal size={18} aria-hidden />
              <span>Filters</span>
              {panelFilterCount > 0 && <span className={styles.filterBadge}>{panelFilterCount}</span>}
              <ChevronDown size={18} className={styles.filtersChevron} aria-hidden />
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className={styles.filtersPanel} id="browse-filters-panel">
            <p className={styles.panelIntro}>All optional — mix as you like. Amenities use &ldquo;match all&rdquo; when several are on.</p>

            <div className={styles.panelRow}>
              <div className={styles.panelField}>
                <span className={styles.filterLabel}>
                  <MapPin size={12} aria-hidden /> State
                </span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={stateFilter}
                    onChange={e => {
                      setStateFilter(e.target.value)
                      setCityFilter('all')
                    }}
                    aria-label="State or region"
                  >
                    {states.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} aria-hidden />
                </div>
              </div>
              <div className={styles.panelField}>
                <span className={styles.filterLabel}>Destination</span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)}
                    aria-label="Destination"
                  >
                    <option value="all">Everywhere</option>
                    {locations
                      .filter(
                        l => stateFilter === 'All states' || l.state === stateFilter || l.value.includes(stateFilter)
                      )
                      .map(l => (
                        <option key={l.value} value={l.value}>
                          {l.city}
                          {l.state ? ` — ${l.state}` : ''}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} aria-hidden />
                </div>
              </div>
            </div>

            <div className={styles.panelSection}>
              <span className={styles.filterLabel}>Property type</span>
              <div className={styles.chipScroll}>
                {types.map(t => (
                  <button
                    type="button"
                    key={t}
                    className={`${styles.chip} ${typeFilter === t ? styles.chipActive : ''}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.panelSection}>
              <span className={styles.filterLabel}>Price</span>
              <div className={styles.chipScroll}>
                {PRICE_RANGES.map((r, i) => (
                  <button
                    type="button"
                    key={r.label}
                    className={`${styles.chip} ${priceRange === i ? styles.chipActive : ''}`}
                    onClick={() => setPriceRange(i)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.panelRow}>
              <div className={styles.panelField}>
                <span className={styles.filterLabel}>Guests</span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={minGuests}
                    onChange={e => setMinGuests(Number(e.target.value))}
                    aria-label="Minimum guests"
                  >
                    {GUEST_OPTIONS.map(o => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} aria-hidden />
                </div>
              </div>
              <div className={styles.panelField}>
                <span className={styles.filterLabel}>Bedrooms</span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={minBedrooms}
                    onChange={e => setMinBedrooms(Number(e.target.value))}
                    aria-label="Minimum bedrooms"
                  >
                    {BED_OPTIONS.map(o => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} aria-hidden />
                </div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={showAvailable} onChange={e => setShowAvailable(e.target.checked)} />
                <span>Available only</span>
              </label>
            </div>

            <div className={styles.panelSection}>
              <span className={styles.filterLabel}>Amenities &amp; experiences</span>
              <div className={styles.amenityGrid}>
                {AMENITY_FACETS.map(f => (
                  <button
                    type="button"
                    key={f.id}
                    className={`${styles.amenityChip} ${amenityPick.includes(f.id) ? styles.amenityChipOn : ''}`}
                    onClick={() => toggleAmenity(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={styles.filterActions}>
          {activeFilterCount > 0 ? (
            <span className={styles.activeCount}>
              {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className={styles.activeCountMuted}>Showing full collection</span>
          )}
          <button type="button" className={styles.clearBtn} onClick={clearAll}>
            Reset everything
          </button>
          <Link to="/" className={styles.backHome}>
            Home
          </Link>
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.resultsCount}>
          {sorted.length} {sorted.length === 1 ? 'property' : 'properties'}
          {filtered.length !== properties.length ? ' match' : ' in the collection'}
        </div>

        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>∅</div>
            <p>No properties match these filters.</p>
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {sorted.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
