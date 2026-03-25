import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../utils/constants'

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.roles] - if set, user.role must be one of these
 */
export function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return children
}
