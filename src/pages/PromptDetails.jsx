import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { ChevronRight, Eye, Copy, Calendar, Share2, Clock, User, Loader2 } from 'lucide-react'
import SEO from '../components/SEO'
import CopyButton from '../components/CopyButton'
import VariableForm from '../components/VariableForm'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { usePromptBySlug } from '../hooks/usePromptBySlug'
import { incrementPromptCopies } from '../services/promptService'
import {
  extractVariables,
  generatePrompt,
  tokenizePrompt,
  estimateTokens,
  readingTime,
} from '../utils/variableParser'

export default function PromptDetails() {
  const { slug } = useParams()
  const { prompt, related, loading, error } = usePromptBySlug(slug)
  const [values, setValues] = useState({})
  const [localCopyCount, setLocalCopyCount] = useState(null)
  const [toast, setToast] = useState(false)

  const copyCount = localCopyCount !== null ? localCopyCount : prompt?.copies ?? 0

  const variables = useMemo(() => {
    if (Array.isArray(prompt?.variables) && prompt.variables.length > 0) {
      return prompt.variables
    }
    return extractVariables(prompt?.prompt ?? '')
  }, [prompt])

  const finalPrompt = useMemo(
    () => generatePrompt(prompt?.prompt ?? '', values),
    [prompt, values]
  )
  const tokens = useMemo(() => tokenizePrompt(finalPrompt), [finalPrompt])

  if (loading) {
    return (
      <section className="section-pad py-16">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 size={24} className="animate-spin text-violet-soft" />
          <p className="text-xs text-ink-muted">Loading prompt details...</p>
        </div>
      </section>
    )
  }

  if (error || !prompt) {
    return (
      <section className="section-pad py-20">
        <EmptyState title="Prompt not found" description="This prompt may have been unpublished or moved." />
      </section>
    )
  }

  const category = prompt.category || (prompt.categories ? prompt.categories : null)
  const formattedDate = prompt.updatedAt || prompt.createdAt || 'Recently'
  const promptImage =
    prompt.featuredImage ||
    prompt.featured_image ||
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop'

  function handleGenerate(formValues) {
    setValues(formValues)
  }

  function handleCopied() {
    setLocalCopyCount((c) => (c !== null ? c + 1 : (prompt.copies || 0) + 1))
    incrementPromptCopies(prompt.id).catch((e) => console.warn('Could not increment copy count:', e))
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: prompt.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    }
  }

  return (
    <section className="section-pad py-8 sm:py-12">
      <SEO
        title={prompt.seoTitle || prompt.title}
        description={prompt.seoDescription || prompt.description}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        image={promptImage}
        type="article"
        publishedTime={prompt.created_at || prompt.createdAt}
        modifiedTime={prompt.updated_at || prompt.updatedAt}
        author={prompt.author || 'Admin'}
      />

      <nav className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-ink-faint">
        <Link to="/" className="hover:text-ink-muted">Home</Link>
        <ChevronRight size={12} />
        {category && (
          <>
            <Link to={`/category/${category.slug}`} className="hover:text-ink-muted">
              {category.name}
            </Link>
            <ChevronRight size={12} />
          </>
        )}
        <span className="text-ink-muted truncate max-w-[200px] sm:max-w-none">{prompt.title}</span>
      </nav>

      <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-ink leading-tight break-words">
              {prompt.title}
            </h1>

            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] sm:text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><User size={13} /> {prompt.author || 'Admin'}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Updated {formattedDate}</span>
              <span className="flex items-center gap-1.5"><Eye size={13} /> {(prompt.views || 0).toLocaleString()} views</span>
              <span className="flex items-center gap-1.5"><Copy size={13} /> {copyCount.toLocaleString()} copies</span>
              <span className="flex items-center gap-1.5"><Clock size={13} /> {readingTime(prompt.prompt)} min read</span>
            </div>

            {prompt.tags && prompt.tags.length > 0 && (
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1 sm:gap-1.5">
                {prompt.tags.map((t) => (
                  <span key={t} className="chip !text-[10px] sm:!text-xs !py-0.5">#{t}</span>
                ))}
              </div>
            )}
          </motion.div>

          {promptImage && (
            <div className="mt-5 sm:mt-6 overflow-hidden rounded-xl2 border border-line aspect-[16/9] w-full">
              <img
                src={promptImage}
                alt={prompt.title}
                loading="lazy"
                width={800}
                height={450}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="mt-5 sm:mt-6 prose prose-invert max-w-none text-xs sm:text-sm prose-p:text-ink-muted prose-headings:font-display">
            <ReactMarkdown>{prompt.description}</ReactMarkdown>
          </div>

          <div className="mt-6 sm:mt-8">
            <VariableForm variables={variables} onGenerate={handleGenerate} />
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-display font-semibold text-ink text-base sm:text-lg">Generated prompt</h3>
            <div className="glass-card p-4 sm:p-5">
              <div className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-ink/90 break-words overflow-x-hidden">
                {tokens.map((tok, i) =>
                  tok.type === 'text' ? (
                    <span key={i}>{tok.value}</span>
                  ) : (
                    <span key={i} className="var-highlight">
                      {values[tok.value] || `{{${tok.value}}}`}
                    </span>
                  )
                )}
              </div>
              <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <CopyButton text={finalPrompt} onCopied={handleCopied} />
                <button onClick={handleShare} className="btn-ghost justify-center">
                  <Share2 size={16} /> Share
                </button>
                <span className="text-center sm:text-left sm:ml-auto text-[11px] sm:text-xs text-ink-faint font-mono mt-1 sm:mt-0">
                  ~{estimateTokens(finalPrompt)} tokens
                </span>
              </div>
            </div>
          </div>

          {(prompt.outputImage || prompt.output_image) && (
            <div className="mt-6 sm:mt-8">
              <h3 className="mb-3 font-display font-semibold text-ink text-base sm:text-lg">Example output</h3>
              <div className="overflow-hidden rounded-xl2 border border-line aspect-video w-full">
                <img
                  src={prompt.outputImage || prompt.output_image}
                  alt="Example output"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="glass-card p-4 sm:p-5">
            <h4 className="font-display font-semibold text-ink mb-3 text-sm sm:text-base">At a glance</h4>
            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Category</dt>
                <dd className="text-ink-muted">{category?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Variables</dt>
                <dd className="text-ink-muted">{variables.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Created</dt>
                <dd className="text-ink-muted">{prompt.createdAt || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Status</dt>
                <dd className="capitalize text-ink-muted">{prompt.status}</dd>
              </div>
            </dl>
          </div>

          {related && related.length > 0 && (
            <div>
              <h4 className="font-display font-semibold text-ink mb-3 text-sm sm:text-base">Related prompts</h4>
              <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {related.map((p, i) => (
                  <PromptCard key={p.id} prompt={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: toast ? 1 : 0, y: toast ? 0 : 16 }}
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-[90vw]"
      >
        <div className="glass-card px-4 py-2 text-xs sm:text-sm text-ink shadow-glow text-center">
          Copied successfully
        </div>
      </motion.div>
    </section>
  )
}
