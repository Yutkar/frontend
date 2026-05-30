import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useGlobalStore } from '@store/global'

export function ProtectedRoute() {
  const user = useGlobalStore((state) => state.user)
  const initializeAuth = useGlobalStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}