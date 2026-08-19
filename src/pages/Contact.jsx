import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import SEO from '../components/SEO'
import { sendContactMessage } from '../services/promptService'

export default function Contact() {
  const { register, handleSubmit, reset } = useForm()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(data) {
    try {
      setSubmitting(true)
      setError('')
      await sendContactMessage({
        name: data.name,
        email: data.email,
        message: data.message,
      })
      setSent(true)
      reset()
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      console.error('Contact error:', err)
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-pad py-16 max-w-2xl mx-auto">
      <SEO title="Contact" description="Get in touch with the PromptVault team." />
      <h1 className="font-display text-3xl font-semibold text-ink">Contact us</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Questions, prompt requests, or partnership ideas — send them over.
      </p>

      {sent && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-cyan/40 bg-cyan/10 p-4 text-xs text-cyan animate-fadeIn">
          <CheckCircle2 size={18} />
          <span>Thank you! Your message has been received and our team will get back to you soon.</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300 animate-fadeIn">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="glass-card mt-8 p-6 space-y-4 shadow-glow">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Name *</label>
            <input
              {...register('name', { required: true })}
              required
              disabled={submitting}
              placeholder="Your name"
              className="rounded-lg border border-line bg-white/[0.03] px-3.5 py-2.5 text-xs text-ink outline-none focus:border-violet/50 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Email *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                {...register('email', { required: true })}
                required
                disabled={submitting}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-line bg-white/[0.03] py-2.5 pl-9 pr-3.5 text-xs text-ink outline-none focus:border-violet/50 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Message *</label>
          <textarea
            rows={5}
            {...register('message', { required: true })}
            required
            disabled={submitting}
            placeholder="Tell us what's on your mind, request a prompt, or suggest a new category..."
            className="rounded-lg border border-line bg-white/[0.03] px-3.5 py-2.5 text-xs text-ink outline-none focus:border-violet/50 disabled:opacity-50"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Sending message...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send size={16} /> Send message
            </span>
          )}
        </button>
      </form>
    </section>
  )
}
