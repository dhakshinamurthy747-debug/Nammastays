import { properties as staticCatalog } from './properties'
import { attachHostOperationsToProperty } from '../utils/hostCatalogMerge'

/** Guest-visible rows from approved host submissions only (not the full merge). */
let approvedCatalogRows = []
/** Mirrors AppContext operational state so sync APIs (propertyApi, placeSuggestions) match guest UI. */
let hostOperationsCatalogSnapshot = null

/**
 * Updated synchronously from AppProvider each render so sync APIs see current catalog.
 * @param {unknown[]} rows
 */
export function setApprovedCatalogRows(rows) {
  approvedCatalogRows = Array.isArray(rows) ? rows : []
}

/** @param {unknown} ops */
export function setHostOperationsCatalogSnapshot(ops) {
  hostOperationsCatalogSnapshot = ops && typeof ops === 'object' ? ops : null
}

export function getMergedCatalog() {
  return [...staticCatalog, ...approvedCatalogRows].map(p =>
    attachHostOperationsToProperty(p, hostOperationsCatalogSnapshot)
  )
}
