import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { isAuthenticated, isSuperAdmin, loading, user, profile, session } = useAuth()
  const location = useLocation()
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    // Debug logging for troubleshooting
    if (!loading) {
      console.log('ProtectedRoute state:', {
        isAuthenticated,
        isSuperAdmin,
        hasUser: !!user,
        hasProfile: !!profile,
        hasSession: !!session,
        currentPath: location.pathname,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000) : null
      })
      setInitialLoadComplete(true)
    }
  }, [isAuthenticated, isSuperAdmin, loading, user, profile, session, location.pathname])

  // Show loading during initial authentication check
  if (loading || !initialLoadComplete) {
    return (
      <div className="section-pad flex min-h-[60vh] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
          <p className="text-xs text-ink-muted">Verifying admin session...</p>
        </div>
      </div>
    )
  }

  // If not authenticated at all, redirect to system login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to system login')
    return <Navigate to="/system-access/login" state={{ from: location }} replace />
  }

  // If super admin is required but user is not super admin, redirect to regular admin dashboard
  if (requireSuperAdmin && !isSuperAdmin) {
    console.log('Super admin required but user is not super admin, redirecting to admin dashboard')
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}
