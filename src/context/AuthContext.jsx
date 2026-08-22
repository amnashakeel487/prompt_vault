import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../services/supabaseClient'

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
  const isFetchingRef = useRef(false)

  // Fetch admin profile for the logged in user
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    if (isFetchingRef.current) return null
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) {
        setProfile(null)
        return null
      }

      setProfile(data)
      return data
    } catch (err) {
      console.warn('Error fetching admin profile:', err)
      setProfile(null)
      return null
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // 1. Initial session load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
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

    // 2. Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      const currentUser = newSession?.user ?? null
      setUser(currentUser)
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (data.user) {
      await fetchProfile(data.user.id)
    }
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    setSession(null)
    if (error) throw error
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

  const value = {
    session,
    user,
    profile,
    role,
    assignedCategoryId,
    isSuperAdmin,
    isCategoryAdmin,
    isAdmin,
    loading,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated: Boolean(session && user && isAdmin),
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
