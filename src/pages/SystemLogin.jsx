import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Mail, Loader2, ShieldCheck, Zap } from 'lucide-react'
import SEO from '../components/SEO'
import { supabase } from '../services/supabaseClient'
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
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      })

      if (authErr) throw authErr

      const userId = authData.user?.id
      if (!userId) {
        throw new Error('Authentication failed.')
      }

      // Check admin_profiles table strictly for super_admin role
      let { data: profileData } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // If no admin profile exists yet for super admin email or system has no super_admins, bootstrap
      if (!profileData) {
        const { count: superAdminCount } = await supabase
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

          const { data: inserted } = await supabase
            .from('admin_profiles')
            .upsert(bootstrapProfile)
            .select()
            .maybeSingle()

          profileData = inserted || bootstrapProfile
        }
      }

      if (!profileData || profileData.role !== 'super_admin') {
        // Sign out immediately and block access
        await supabase.auth.signOut()
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-8 sm:py-12">
      <SEO title="System Access" description="Super Admin System Portal." />

      <div className="w-full max-w-sm">
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

        <div className="glass-card p-5 sm:p-7 shadow-glow border-violet/30">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-violet-soft" />
            <h1 className="font-display text-lg sm:text-xl font-semibold text-ink">System Access</h1>
          </div>
          <p className="text-[11px] sm:text-xs text-ink-muted leading-relaxed">
            Restricted portal for Super Admin operations.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 sm:mt-6 space-y-3.5 sm:space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                placeholder="superadmin@example.com"
                {...register('email', { required: true })}
                disabled={loading}
                className="w-full rounded-lg border border-line bg-surface/50 py-2.5 pl-10 pr-3 text-xs sm:text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet/50 disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password"
                placeholder="Password"
                {...register('password', { required: true })}
                disabled={loading}
                className="w-full rounded-lg border border-line bg-surface/50 py-2.5 pl-10 pr-3 text-xs sm:text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet/50 disabled:opacity-50"
              />
            </div>
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center !py-2.5 text-xs sm:text-sm min-h-[44px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" /> Verifying credentials...
                </span>
              ) : (
                'System Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
