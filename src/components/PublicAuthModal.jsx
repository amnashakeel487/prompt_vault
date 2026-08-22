import { useState } from 'react'
import { X, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react'
import { usePublicAuth } from '../context/PublicAuthContext'

export default function PublicAuthModal({ isOpen, onClose, defaultMode = 'signin' }) {
  const [mode, setMode] = useState(defaultMode) // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const { signIn, signUp, sendPasswordReset } = usePublicAuth()

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        await signIn({ email, password })
        onClose()
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        const data = await signUp({ email, password })
        if (data?.session) {
          onClose()
        } else {
          // If session wasn't auto-returned, attempt direct sign in
          try {
            await signIn({ email, password })
            onClose()
          } catch {
            onClose()
          }
        }
      } else if (mode === 'reset') {
        await sendPasswordReset(email)
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleModeSwitch = (newMode) => {
    setMode(newMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-lg border border-cyan/30 bg-cyan/10 text-cyan text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ink-muted mb-2 text-sm font-medium">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-line bg-surface/50 pl-11 pr-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-ink-muted mb-2 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface/50 pl-11 pr-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-ink-muted mb-2 text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface/50 pl-11 pr-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Email'}
              </>
            )}
          </button>
        </form>

        <div className="space-y-2 text-center text-sm">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => handleModeSwitch('reset')}
                className="text-ink-muted hover:text-violet-soft transition-colors"
              >
                Forgot your password?
              </button>
              <div className="text-ink-muted">
                Don't have an account?{' '}
                <button
                  onClick={() => handleModeSwitch('signup')}
                  className="text-violet-soft hover:text-ink transition-colors font-medium"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-ink-muted">
              Already have an account?{' '}
              <button
                onClick={() => handleModeSwitch('signin')}
                className="text-violet-soft hover:text-ink transition-colors font-medium"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="text-ink-muted">
              Remember your password?{' '}
              <button
                onClick={() => handleModeSwitch('signin')}
                className="text-violet-soft hover:text-ink transition-colors font-medium"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}