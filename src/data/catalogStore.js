import { properties as staticCatalog } from './properties'

/** Guest-visible rows from approved host submissions only (not the full merge). */
let approvedCatalogRows = []

/**
 * Updated synchronously from AppProvider each render so sync APIs see current catalog.
 * @param {unknown[]} rows
 */
export function setApprovedCatalogRows(rows) {
  approvedCatalogRows = Array.isArray(rows) ? rows : []
}

export function getMergedCatalog() {
  return [...staticCatalog, ...approvedCatalogRows]
}
