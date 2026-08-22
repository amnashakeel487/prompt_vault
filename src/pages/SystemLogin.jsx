import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Mail, Loader2, Zap, ArrowRight, Eye, EyeOff } from 'lucide-react'
import SEO from '../components/SEO'
import { supabaseSystem } from '../services/supabaseSystemClient'
import { useAuth } from '../hooks/useAuth'

export default function SystemLogin() {
  const { register, handleSubmit } = useForm()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { refreshProfile, isAuthenticated, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated as super admin
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAuthenticated, isSuperAdmin, navigate])

  async function onSubmit(data) {
    setError('')
    if (!data.email || !data.password) {
      setError('Please enter your credentials.')
      return
    }

    try {
      setLoading(true)
      const { data: authData, error: authErr } = await supabaseSystem.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      })

      if (authErr) throw authErr

      const userId = authData.user?.id
      if (!userId) {
        throw new Error('Authentication failed.')
      }

      // Check admin_profiles table strictly for super_admin role using system client
      let { data: profileData } = await supabaseSystem
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // If no admin profile exists yet for super admin email or system has no super_admins, bootstrap
      if (!profileData) {
        const { count: superAdminCount } = await supabaseSystem
          .from('admin_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'super_admin')

        if (superAdminCount === 0 || authData.user?.email === 'amnashakeel2101@gmail.com') {
          const bootstrapProfile = {
            id: userId,
            role: 'super_admin',
            display_name: authData.user?.email?.split('@')[0] || 'Super Admin',
            created_at: new Date().toISOString()
          }

          const { data: inserted } = await supabaseSystem
            .from('admin_profiles')
            .upsert(bootstrapProfile)
            .select()
            .maybeSingle()

          profileData = inserted || bootstrapProfile
        }
      }

      if (!profileData || profileData.role !== 'super_admin') {
        // Sign out immediately from system client and block access
        await supabaseSystem.auth.signOut()
        throw new Error('Access denied: Super Admin credentials required.')
      }

      // Mark session as system admin for session isolation
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pv-system-auth-flag', 'true')
      }

      await refreshProfile()
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      console.error('System login error:', err)
      setError(err.message || 'Invalid credentials or access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <SEO title="Super Admin Login | PromptVault" description="Super Admin System Access Portal" />
      
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan shadow-glow">
              <Zap size={24} className="text-white" />
            </span>
            <div className="text-left">
              <span className="font-display text-xl font-bold text-ink block">PromptVault</span>
              <span className="text-xs text-violet font-medium">Super Admin Portal</span>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-violet/20 to-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-violet" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink mb-2">Welcome Back</h1>
            <p className="text-ink-muted text-sm">Sign in to access the admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  {...register('email', { required: true })}
                  disabled={loading}
                  className="w-full rounded-xl border border-line bg-white/[0.03] py-3 pl-11 pr-4 text-ink placeholder:text-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/20 disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password', { required: true })}
                  disabled={loading}
                  className="w-full rounded-xl border border-line bg-white/[0.03] py-3 pl-11 pr-12 text-ink placeholder:text-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/20 disabled:opacity-50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet to-violet-soft text-white py-3.5 rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-line/40">
            <p className="text-center text-sm text-ink-muted">
              Not a super admin?{' '}
              <Link to="/admin/login" className="text-violet hover:text-violet-soft transition-colors font-medium">
                Team member login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-ink-faint">
            Secure access for authorized administrators only
          </p>
        </div>
      </div>
    </div>
  )
}
