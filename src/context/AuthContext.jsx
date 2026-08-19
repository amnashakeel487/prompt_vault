import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

  // Fetch admin profile for the logged in user
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*, categories(id, name, slug)')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('Could not fetch admin profile:', error.message)
        // If table doesn't exist yet or query fails, treat existing authenticated admin as super_admin
        setProfile({
          id: userId,
          role: 'super_admin',
          assigned_category_id: null,
          display_name: 'Admin',
        })
        return null
      }

      if (data) {
        setProfile(data)
        return data
      } else {
        // If user is authenticated but has no admin_profile entry yet,
        // create or default to super_admin for backwards compatibility
        const defaultProfile = {
          id: userId,
          role: 'super_admin',
          assigned_category_id: null,
          display_name: user?.email?.split('@')[0] || 'Super Admin',
        }
        setProfile(defaultProfile)
        // Attempt to lazily save the bootstrap super_admin profile
        supabase
          .from('admin_profiles')
          .insert([defaultProfile])
          .then(() => {})
          .catch(() => {})
        return defaultProfile
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err)
      return null
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      }
      setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
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
