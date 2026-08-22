import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabaseSystem } from '../services/supabaseSystemClient'

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  role: null,
  assignedCategoryId: null,
  isSuperAdmin: false,
  isCategoryAdmin: false,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const isFetchingRef = useRef(false)

  // Fetch admin profile for the logged in user using system client
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    if (isFetchingRef.current) return profile
    isFetchingRef.current = true
    setProfileLoading(true)

    try {
      const { data, error } = await supabaseSystem
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching admin profile:', error)
        setProfile(null)
        return null
      }

      // If no admin profile found, user is not an admin
      setProfile(data || null)
      return data || null
    } catch (err) {
      console.warn('Error fetching admin profile:', err)
      setProfile(null)
      return null
    } finally {
      isFetchingRef.current = false
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // 1. Initial session load for system client
    supabaseSystem.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return
      
      if (error) {
        console.warn('Error getting initial session:', error)
      }

      console.log('Initial session check:', session?.user?.id)
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      
      if (isMounted) setLoading(false)
    })

    // 2. Auth state subscription for system client
    const { data: { subscription } } = supabaseSystem.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return
      
      console.log('Auth state changed:', event, newSession?.user?.id)
      
      setSession(newSession)
      const currentUser = newSession?.user ?? null
      setUser(currentUser)
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Clear session storage on explicit logout or token refresh failure
        if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
          window.localStorage.removeItem('pv-system-auth-flag')
        }
      }
      
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async ({ email, password }) => {
    setLoading(true)
    try {
      const { data, error } = await supabaseSystem.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      if (data.user) {
        await fetchProfile(data.user.id)
      }
      return data
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Clear local storage session identifier
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pv-system-auth-flag')
        window.localStorage.removeItem('pv-system-auth')
      }
      
      const { error } = await supabaseSystem.auth.signOut()
      setProfile(null)
      setUser(null)
      setSession(null)
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id)
    }
  }

  const role = profile?.role || null
  const isSuperAdmin = role === 'super_admin'
  const isCategoryAdmin = role === 'category_admin'
  const isAdmin = Boolean(profile && (isSuperAdmin || isCategoryAdmin))
  const assignedCategoryId = profile?.assigned_category_id || null

  // User is authenticated for admin access if:
  // 1. They have a valid session that hasn't expired
  // 2. They have a user object 
  // 3. Either profile is still loading OR they have an admin profile
  const isAuthenticated = Boolean(
    session && 
    user && 
    session.expires_at && 
    new Date(session.expires_at * 1000) > new Date() &&
    (profileLoading || isAdmin)
  )

  const value = {
    session,
    user,
    profile,
    role,
    assignedCategoryId,
    isSuperAdmin,
    isCategoryAdmin,
    isAdmin,
    loading: loading || profileLoading,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
