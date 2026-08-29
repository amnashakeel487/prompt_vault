import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

const PublicAuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isCategoryAdmin: false,
  assignedCategoryId: null,
  assignedCategoryName: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  sendPasswordReset: async () => {},
  refreshProfile: async () => {},
})

export function PublicAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch admin profile for category admin check
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    try {
      const { data: profileData, error } = await supabase
        .from('admin_profiles')
        .select(`
          *,
          categories:assigned_category_id(name)
        `)
        .eq('id', userId)
        .eq('role', 'category_admin')
        .maybeSingle()

      if (error) {
        console.warn('Error fetching public user profile:', error)
        setProfile(null)
        return null
      }

      setProfile(profileData)
      return profileData
    } catch (err) {
      console.warn('Error fetching admin profile:', err)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (session?.access_token) {
        localStorage.setItem('pv-user-token', session.access_token)
      } else {
        localStorage.removeItem('pv-user-token')
      }
      
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      
      if (isMounted) setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      const currentUser = newSession?.user ?? null
      setUser(currentUser)
      if (newSession?.access_token) {
        localStorage.setItem('pv-user-token', newSession.access_token)
      } else {
        localStorage.removeItem('pv-user-token')
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

  const signUp = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setProfile(null)
    if (error) throw error
  }

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id)
    }
  }

  const value = {
    session,
    user,
    profile,
    loading,
    isCategoryAdmin: Boolean(profile && profile.role === 'category_admin'),
    assignedCategoryId: profile?.assigned_category_id || null,
    assignedCategoryName: profile?.categories?.name || null,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    refreshProfile,
    isAuthenticated: Boolean(session && user),
  }

  return <PublicAuthContext.Provider value={value}>{children}</PublicAuthContext.Provider>
}

export function usePublicAuth() {
  const context = useContext(PublicAuthContext)
  if (!context) {
    throw new Error('usePublicAuth must be used within a PublicAuthProvider')
  }
  return context
}