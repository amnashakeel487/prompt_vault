import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  role: 'super_admin',
  assignedCategoryId: null,
  isSuperAdmin: true,
  isCategoryAdmin: false,
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
  const fetchProfile = useCallback(async (userId, userEmail = '') => {
    if (!userId) {
      setProfile(null)
      return null
    }

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('Could not fetch admin profile:', error.message)
        const fallbackProfile = {
          id: userId,
          role: 'super_admin',
          assigned_category_id: null,
          display_name: 'Admin',
        }
        setProfile((prev) => (prev?.id === userId && prev?.role === 'super_admin' ? prev : fallbackProfile))
        return fallbackProfile
      }

      if (data) {
        setProfile(data)
        return data
      } else {
        const defaultProfile = {
          id: userId,
          role: 'super_admin',
          assigned_category_id: null,
          display_name: userEmail ? userEmail.split('@')[0] : 'Super Admin',
        }
        setProfile((prev) => (prev?.id === userId ? prev : defaultProfile))

        // Attempt silent insert for bootstrap profile without blocking
        supabase
          .from('admin_profiles')
          .insert([defaultProfile])
          .then(() => {})
          .catch(() => {})

        return defaultProfile
      }
    } catch (err) {
      console.warn('Error fetching admin profile:', err)
      const fallback = {
        id: userId,
        role: 'super_admin',
        assigned_category_id: null,
        display_name: 'Admin',
      }
      setProfile((prev) => (prev?.id === userId ? prev : fallback))
      return fallback
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
        await fetchProfile(currentUser.id, currentUser.email)
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
        await fetchProfile(currentUser.id, currentUser.email)
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
      await fetchProfile(data.user.id, data.user.email)
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
      return await fetchProfile(user.id, user.email)
    }
  }

  const role = profile?.role || 'super_admin'
  const isSuperAdmin = role === 'super_admin'
  const isCategoryAdmin = role === 'category_admin'
  const assignedCategoryId = profile?.assigned_category_id || null

  const value = {
    session,
    user,
    profile,
    role,
    assignedCategoryId,
    isSuperAdmin,
    isCategoryAdmin,
    loading,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated: Boolean(session && user),
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
