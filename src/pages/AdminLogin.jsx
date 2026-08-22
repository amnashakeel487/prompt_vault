import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Mail, Loader2, ArrowLeft, Zap, Users } from 'lucide-react'
import SEO from '../components/SEO'
import { supabase } from '../services/supabaseClient'
import { usePublicAuth } from '../context/PublicAuthContext'

export default function AdminLogin() {
  const { register, handleSubmit } = useForm()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshProfile } = usePublicAuth()
  const navigate = useNavigate()

  async function onSubmit(data) {
    setError('')
    if (!data.email || !data.password) {
      setError('Please enter your email and password.')
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
        throw new Error('Sign in failed.')
      }

      // Check admin_profiles table
      const { data: profileData } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // Block Super Admin from logging in via public portal
      if (profileData?.role === 'super_admin') {
        await supabase.auth.signOut()
        throw new Error('Super Admin accounts must log in via the dedicated portal.')
      }

      // Route category admin to team dashboard, public user to account
      if (profileData?.role === 'category_admin') {
        await refreshProfile()
        navigate('/team/dashboard', { replace: true })
      } else {
        navigate('/account', { replace: true })
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err.message || 'Invalid login credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-8 sm:py-12">
      <SEO title="Portal Sign In" description="PromptVault member & team sign in." />

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

        <div className="glass-card p-5 sm:p-7 shadow-glow border-violet/20">
          <h1 className="font-display text-lg sm:text-xl font-semibold text-ink">Portal Sign In</h1>
          <p className="mt-1 text-[11px] sm:text-xs text-ink-muted leading-relaxed">
            Sign in to access your user account or category admin dashboard.
          </p>

          {/* Team Member Notice */}
          <div className="mt-3.5 rounded-xl border border-violet/30 bg-violet/10 p-2.5 text-[11px] text-violet-soft flex items-center gap-2">
            <Users size={14} className="shrink-0 text-cyan" />
            <span>
              <strong>Team member? Log in here</strong> — category admins use this form to access their dashboard.
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3.5 sm:space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                placeholder="you@example.com"
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
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-2.5 text-xs sm:text-sm min-h-[44px]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" /> Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 pt-4 border-t border-line/60 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors min-h-[36px]"
            >
              <ArrowLeft size={13} /> Back to PromptVault
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
