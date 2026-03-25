import { getMergedCatalog } from '../data/catalogStore'

export function fetchAllProperties() {
  return Promise.resolve(getMergedCatalog())
}

export function fetchPropertyById(id) {
  const n = Number(id)
  const p = getMergedCatalog().find(x => x.id === n)
  return Promise.resolve(p ?? null)
}

/** Sync helpers (existing code paths often need sync access) */
export function getAllProperties() {
  return getMergedCatalog()
}

export function getPropertyByIdSync(id) {
  return getMergedCatalog().find(x => x.id === Number(id)) ?? null
}
