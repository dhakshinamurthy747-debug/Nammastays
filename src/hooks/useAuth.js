import { useApp } from '../context/AppContext'

export function useAuth() {
  const { user, login, logout } = useApp()
  return {
    user,
    login,
    logout,
    isAuthenticated: Boolean(user),
  }
}
