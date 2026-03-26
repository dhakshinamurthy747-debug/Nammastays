import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

/**
 * @typedef {Object} HostOperationsState
 * @property {Record<string, { nightly: number, minNights: number }>} ownerRates
 * @property {Record<string, number>} inventoryUnits
 * @property {Record<string, Array<{ id: string, from: string, to: string, units: number }>>} unitRangesByProp
 * @property {Record<string, Array<{ id: string, from: string, to: string, nightly: number|null, minNights: number|null }>>} rateRangesByProp
 * @property {Record<string, string[]>} blockedByProp
 * @property {Record<string, { cancellationText?: string, houseRulesText?: string, attachments?: { label: string, url: string }[] }>} listingPolicies
 * @property {Record<string, { urls: string[] }>} listingCdnGallery
 * @property {Record<string, { email: string, role: 'editor'|'viewer' }[]>} coHostsByProperty
 */

/** @returns {HostOperationsState} */
export function loadHostOperations() {
  const defaults = {
    ownerRates: {},
    inventoryUnits: {},
    unitRangesByProp: {},
    rateRangesByProp: {},
    blockedByProp: {},
    listingPolicies: {},
    listingCdnGallery: {},
    coHostsByProperty: {},
  }
  try {
    const raw = loadJson(STORAGE_KEYS.HOST_OPERATIONS, null)
    if (!raw || typeof raw !== 'object') return defaults
    return {
      ownerRates: raw.ownerRates && typeof raw.ownerRates === 'object' ? raw.ownerRates : {},
      inventoryUnits: raw.inventoryUnits && typeof raw.inventoryUnits === 'object' ? raw.inventoryUnits : {},
      unitRangesByProp:
        raw.unitRangesByProp && typeof raw.unitRangesByProp === 'object' ? raw.unitRangesByProp : {},
      rateRangesByProp:
        raw.rateRangesByProp && typeof raw.rateRangesByProp === 'object' ? raw.rateRangesByProp : {},
      blockedByProp: raw.blockedByProp && typeof raw.blockedByProp === 'object' ? raw.blockedByProp : {},
      listingPolicies: raw.listingPolicies && typeof raw.listingPolicies === 'object' ? raw.listingPolicies : {},
      listingCdnGallery:
        raw.listingCdnGallery && typeof raw.listingCdnGallery === 'object' ? raw.listingCdnGallery : {},
      coHostsByProperty:
        raw.coHostsByProperty && typeof raw.coHostsByProperty === 'object' ? raw.coHostsByProperty : {},
    }
  } catch {
    return defaults
  }
}

/** @param {HostOperationsState} state */
export function saveHostOperations(state) {
  try {
    saveJson(STORAGE_KEYS.HOST_OPERATIONS, state)
  } catch {
    /* ignore */
  }
}
