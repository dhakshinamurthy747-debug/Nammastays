import { useMemo } from 'react'
import { getAllProperties, getPropertyByIdSync } from '../api/propertyApi'

export function useProperties() {
  return useMemo(
    () => ({
      properties: getAllProperties(),
      getById: getPropertyByIdSync,
    }),
    []
  )
}
