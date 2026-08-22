import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Mail, Loader2, ShieldCheck, Zap, AlertTriangle, ArrowRight } from 'lucide-react'
import SEO from '../components/SEO'
import { supabaseSystem } from '../services/supabaseSystemClient'
import { useAuth } from '../hooks/useAuth'

export default function SystemLogin() {
  const { register, handleSubmit } = useForm()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()

  async function onSubmit(data) {
    setError('')
    if (!data.email || !data.password) {
      setError('Please enter your Super Admin credentials.')
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
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden" 
         style={{
           background: `#0A0A12 url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237C5CFF' fill-opacity='0.03'%3E%3Cpath d='M22 0h1v44h-1V0zM0 22h44v1H0v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
         }}>
      
      <SEO title="System Access" description="Super Admin System Portal." />

      {/* Ambient Background Blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-violet/20 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan/20 rounded-full blur-3xl opacity-25" />
      
      {/* Animated Scan Line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet to-transparent animate-scan-line opacity-40" />
      </div>

      <div className="relative w-full max-w-sm z-10">
        
        {/* Status Strip */}
        <div className="mb-6 flex items-center justify-between text-xs font-mono text-ink-faint">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-blink" />
            <span className="uppercase tracking-wider">SECURE CHANNEL</span>
          </div>
          <span className="uppercase tracking-wider">V2.1.0 · RESTRICTED</span>
        </div>

        {/* Logo */}
        <div className="mb-5 sm:mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 sm:mb-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan shadow-glow">
              <Zap size={18} className="text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-ink">
              PromptVault
            </span>
          </Link>
        </div>

        {/* Main Login Card */}
        <div className="relative glass-card p-6 sm:p-8 shadow-glow border-t-2 border-gradient-to-r from-transparent via-violet to-transparent">
          
          {/* Lock Icon Badge */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet to-violet-soft shadow-glow flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mt-2 mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink mb-1">System Access</h1>
            <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">
              PromptVault Core · Super Admin Only
            </p>
          </div>

          {/* Security Warning */}
          <div className="mb-6 p-3 rounded-lg border border-amber/30 bg-amber/10 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />
            <p className="text-xs text-amber/90 leading-relaxed">
              This console is restricted to the primary system administrator. All access attempts are logged.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="email"
                  placeholder="superadmin@domain.com"
                  {...register('email', { required: true })}
                  disabled={loading}
                  className="w-full rounded-lg border border-line bg-surface/70 py-3 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/20 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
                Passphrase
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  placeholder="Enter secure passphrase"
                  {...register('password', { required: true })}
                  disabled={loading}
                  className="w-full rounded-lg border border-line bg-surface/70 py-3 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/20 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet to-violet-soft text-white py-3 rounded-full font-medium shadow-glow hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Authenticate
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-base px-3 text-ink-faint font-mono uppercase tracking-wider">
                Not an Admin?
              </span>
            </div>
          </div>

          {/* Public User Redirect */}
          <p className="text-center text-xs text-ink-muted leading-relaxed">
            Team members and public users should{' '}
            <Link to="/admin/login" className="text-violet hover:text-violet-soft transition-colors">
              sign in from the main portal
            </Link>{' '}
            instead.
          </p>
        </div>

        {/* Footer Warning */}
        <p className="mt-6 text-center text-xs font-mono text-ink-faint uppercase tracking-wider">
          Unauthorized access attempts are logged & reported
        </p>
      </div>
    </div>
  )
}
