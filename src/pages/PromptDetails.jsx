import { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { ChevronRight, Eye, Copy, Calendar, Share2, Clock, User, Loader2, ImageIcon, Sparkles, Lock, CreditCard, DollarSign, ShoppingBag, CheckCircle } from 'lucide-react'
import SEO from '../components/SEO'
import CopyButton from '../components/CopyButton'
import VariableForm from '../components/VariableForm'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import FavoriteButton from '../components/FavoriteButton'
import PublicAuthModal from '../components/PublicAuthModal'
import PaymentModal from '../components/PaymentModal'
import { usePromptBySlug } from '../hooks/usePromptBySlug'
import { incrementPromptCopies } from '../services/promptService'
import { checkPurchaseStatus } from '../services/sellerService'
import { formatCurrency } from '../services/paymentService'
import { usePublicAuth } from '../context/PublicAuthContext'
import {
  extractVariables,
  generatePrompt,
  tokenizePrompt,
  estimateTokens,
  readingTime,
} from '../utils/variableParser'

export default function PromptDetails() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = usePublicAuth()
  const { prompt, related, loading, error } = usePromptBySlug(slug)
  const [values, setValues] = useState({})
  const [localCopyCount, setLocalCopyCount] = useState(null)
  const [toast, setToast] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [purchaseStatus, setPurchaseStatus] = useState(null)
  const [checkingPurchase, setCheckingPurchase] = useState(false)

  // Check for payment success/failure from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    const paymentError = searchParams.get('error')
    
    if (paymentStatus === 'success') {
      setToast('Payment completed! Verifying access...')
      if (prompt?.id && user?.id) {
        checkPurchaseStatus(user.id, prompt.id).then((status) => {
          setPurchaseStatus(status)
          if (status?.status === 'completed') {
            setToast('Purchase verified! Prompt unlocked.')
          }
        }).catch(console.error)
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      setToast(paymentError || 'Payment was not completed. Please try again.')
    }
  }, [searchParams, prompt?.id, user?.id])

  // Check purchase status for paid prompts
  useEffect(() => {
    async function checkUserPurchase() {
      if (!prompt?.isPaid || !user?.id || checkingPurchase) return
      
      setCheckingPurchase(true)
      try {
        const status = await checkPurchaseStatus(user.id, prompt.id)
        setPurchaseStatus(status)
      } catch (err) {
        console.error('Error checking purchase status:', err)
      } finally {
        setCheckingPurchase(false)
      }
    }

    checkUserPurchase()
  }, [prompt?.isPaid, prompt?.id, user?.id])

  const copyCount = localCopyCount !== null ? localCopyCount : prompt?.copies ?? 0
  const canAccessPrompt =
    !prompt?.isPaid ||
    prompt?.canAccess ||
    (user?.id && user.id === prompt?.sellerId) ||
    purchaseStatus?.status === 'completed'

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

  // Extract all available images (from multi-image table or fallback single fields)
  const allImages = useMemo(() => {
    if (!prompt) return []
    const list = []

    if (Array.isArray(prompt.images) && prompt.images.length > 0) {
      prompt.images.forEach((img) => {
        if (img.imageUrl && !list.includes(img.imageUrl)) {
          list.push(img.imageUrl)
        }
      })
    }

    if (prompt.featuredImage && !list.includes(prompt.featuredImage)) {
      list.unshift(prompt.featuredImage)
    }

    if (prompt.outputImage && !list.includes(prompt.outputImage)) {
      list.push(prompt.outputImage)
    }

    return list.length > 0
      ? list
      : ['https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop']
  }, [prompt])

  // Reset active image on prompt change
  useEffect(() => {
    setActiveImageIndex(0)
  }, [slug])

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
  const currentMainImage = allImages[activeImageIndex] || allImages[0]

  function handleGenerate(formValues) {
    setValues(formValues)
  }

  function handleCopied() {
    if (!canAccessPrompt) {
      if (!user) {
        setShowAuthModal(true)
      } else {
        setShowPaymentModal(true)
      }
      return
    }

    setLocalCopyCount((c) => (c !== null ? c + 1 : (prompt.copies || 0) + 1))
    incrementPromptCopies(prompt.id).catch((e) => console.warn('Could not increment copy count:', e))
    setToast('Copied successfully')
    setTimeout(() => setToast(''), 2000)
  }

  function handleUnlockPrompt() {
    if (!user) {
      setShowAuthModal(true)
    } else {
      setShowPaymentModal(true)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: prompt.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setToast('Link copied to clipboard')
      setTimeout(() => setToast(''), 2000)
    }
  }

  return (
    <section className="section-pad py-8 sm:py-12">
      <SEO
        title={prompt.seoTitle || prompt.title}
        description={prompt.seoDescription || prompt.description}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        image={currentMainImage}
        type="article"
        publishedTime={prompt.created_at || prompt.createdAt}
        modifiedTime={prompt.updated_at || prompt.updatedAt}
        author={prompt.author || 'Admin'}
      />

      <nav className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-ink-faint">
        <Link to="/" className="hover:text-ink transition-colors">Home</Link>
        <ChevronRight size={12} />
        {category && (
          <>
            <Link to={`/category/${category.slug}`} className="hover:text-ink transition-colors">
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
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {prompt.status !== 'published' && (
                <span className={`chip text-[10px] font-semibold uppercase ${
                  prompt.status === 'pending'
                    ? '!border-amber/40 !bg-amber/15 !text-amber'
                    : prompt.status === 'rejected'
                    ? '!border-red-500/40 !bg-red-500/15 !text-red-400'
                    : '!border-line !bg-white/[0.05] !text-ink-muted'
                }`}>
                  {prompt.status === 'pending' ? 'Pending Review' : prompt.status}
                </span>
              )}
              {prompt.featured && (
                <span className="chip !border-violet/30 !bg-violet/10 !text-violet-soft text-[10px] flex items-center gap-1">
                  <Sparkles size={11} /> Featured
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-ink leading-tight break-words">
              {prompt.title}
            </h1>

            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] sm:text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><User size={13} /> {prompt.author || 'Admin'}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Updated {formattedDate}</span>
              <span className="flex items-center gap-1.5"><Eye size={13} /> {(prompt.views || 0).toLocaleString()} views</span>
              <span className="flex items-center gap-1.5"><Copy size={13} /> {copyCount.toLocaleString()} copies</span>
              <span className="flex items-center gap-1.5"><Clock size={13} /> {readingTime(prompt.prompt)} min read</span>
              {prompt.isPaid && (
                <span className="flex items-center gap-1.5 text-violet-soft">
                  <ShoppingBag size={13} />
                  {prompt.purchaseCount || 0} sales
                </span>
              )}
              <div className="ml-auto">
                <FavoriteButton 
                  promptId={prompt.id} 
                  initialCount={prompt.favoritesCount || prompt.favorites_count || 0}
                  onAuthRequired={() => setShowAuthModal(true)} 
                />
              </div>
            </div>

            {/* Price Tag for Paid Prompts */}
            {prompt.isPaid && (
              <div className="mt-3 sm:mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet/20 border border-violet/30">
                  <DollarSign size={14} className="text-violet-soft" />
                  <span className="text-violet-soft font-medium">{formatCurrency(prompt.price)}</span>
                  <span className="text-xs text-violet-soft/70">Premium</span>
                </div>
              </div>
            )}

            {prompt.tags && prompt.tags.length > 0 && (
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1 sm:gap-1.5">
                {prompt.tags.map((t) => (
                  <span key={t} className="chip !text-[10px] sm:!text-xs !py-0.5">#{t}</span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Multi-Image Hero Gallery */}
          {currentMainImage && (
            <div className="mt-5 sm:mt-6 space-y-3">
              <div className="overflow-hidden rounded-xl2 border border-line aspect-[16/9] w-full bg-surface-2 shadow-card relative">
                <img
                  src={currentMainImage}
                  alt={prompt.title}
                  loading="lazy"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>

              {/* Multi-Image Thumbnails Bar */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-violet shadow-glow scale-[1.03]'
                          : 'border-line/60 opacity-60 hover:opacity-100 hover:border-violet-soft'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.2 text-[8px] text-white">
                          Cover
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 sm:mt-6 prose prose-invert max-w-none text-xs sm:text-sm prose-p:text-ink-muted prose-headings:font-display prose-headings:text-ink">
            <ReactMarkdown>{prompt.description}</ReactMarkdown>
          </div>

          <div className="mt-6 sm:mt-8">
            {canAccessPrompt ? (
              <VariableForm variables={variables} onGenerate={handleGenerate} />
            ) : (
              <div className="glass-card p-6 text-center border border-violet/30 bg-violet/5">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-violet/20 border border-violet/30">
                  <Lock size={24} className="text-violet-soft" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink mb-2">
                  Premium Prompt - {formatCurrency(prompt.price)}
                </h3>
                <p className="text-sm text-ink-muted mb-6 max-w-sm mx-auto">
                  This is a premium prompt. Purchase to access the interactive variable form and full prompt content.
                </p>
                <button
                  onClick={handleUnlockPrompt}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <CreditCard size={16} />
                  Unlock Prompt
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-display font-semibold text-ink text-base sm:text-lg">
              {canAccessPrompt ? 'Generated prompt' : 'Prompt Preview'}
            </h3>
            <div className="glass-card p-4 sm:p-5 relative">
              {/* Blur overlay for paid prompts */}
              {!canAccessPrompt && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/95 backdrop-blur-sm z-10 rounded-xl flex items-end justify-center pb-8">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet/20 border border-violet/30 text-violet-soft font-medium mb-3">
                      <Lock size={16} />
                      Content Locked
                    </div>
                    <div className="text-sm text-ink-muted mb-4 max-w-xs">
                      Purchase this premium prompt to see the full content and use interactive variables.
                    </div>
                    <button
                      onClick={handleUnlockPrompt}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CreditCard size={16} />
                      Buy for {formatCurrency(prompt.price)}
                    </button>
                  </div>
                </div>
              )}
              
              <div className={`font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-ink break-words overflow-x-hidden ${!canAccessPrompt ? 'filter blur-sm' : ''}`}>
                {canAccessPrompt ? (
                  tokens.map((tok, i) =>
                    tok.type === 'text' ? (
                      <span key={i}>{tok.value}</span>
                    ) : (
                      <span key={i} className="var-highlight">
                        {values[tok.value] || `{{${tok.value}}}`}
                      </span>
                    )
                  )
                ) : (
                  // Show truncated preview for paid prompts
                  <span>
                    {prompt.prompt.length > 200 ? `${prompt.prompt.substring(0, 200)}...` : prompt.prompt}
                  </span>
                )}
              </div>
              
              {canAccessPrompt && (
                <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <CopyButton text={finalPrompt} onCopied={handleCopied} />
                  <button onClick={handleShare} className="btn-ghost justify-center">
                    <Share2 size={16} /> Share
                  </button>
                  <span className="text-center sm:text-left sm:ml-auto text-[11px] sm:text-xs text-ink-faint font-mono mt-1 sm:mt-0">
                    ~{estimateTokens(finalPrompt)} tokens
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="glass-card p-4 sm:p-5">
            <h4 className="font-display font-semibold text-ink mb-3 text-sm sm:text-base">
              At a glance
            </h4>
            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Category</dt>
                <dd className="text-ink-muted">{category?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Variables</dt>
                <dd className="text-ink-muted">{variables.length}</dd>
              </div>
              {prompt.isPaid && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Price</dt>
                    <dd className="text-violet-soft font-semibold">{formatCurrency(prompt.price)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Sales</dt>
                    <dd className="text-ink-muted">{prompt.purchaseCount || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Type</dt>
                    <dd className="text-violet-soft">Premium</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-faint">Created</dt>
                <dd className="text-ink-muted">{prompt.createdAt || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Status</dt>
                <dd className="capitalize text-ink-muted">{prompt.status}</dd>
              </div>
              {allImages.length > 1 && (
                <div className="flex justify-between">
                  <dt className="text-ink-faint">Gallery</dt>
                  <dd className="text-cyan font-mono">{allImages.length} images</dd>
                </div>
              )}
            </dl>

            {/* Purchase Status for Logged In Users */}
            {prompt.isPaid && user && (
              <div className="mt-4 pt-4 border-t border-line">
                {canAccessPrompt ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle size={16} />
                    <span>You own this prompt</span>
                  </div>
                ) : checkingPurchase ? (
                  <div className="flex items-center gap-2 text-ink-muted text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Checking purchase...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleUnlockPrompt}
                    className="w-full btn-primary flex items-center gap-2 justify-center"
                  >
                    <Lock size={16} />
                    Buy for {formatCurrency(prompt.price)}
                  </button>
                )}
              </div>
            )}

            {/* Login CTA for Non-logged Users */}
            {prompt.isPaid && !user && (
              <div className="mt-4 pt-4 border-t border-line">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full btn-primary flex items-center gap-2 justify-center"
                >
                  <User size={16} />
                  Sign in to Purchase
                </button>
              </div>
            )}
          </div>

          {related && related.length > 0 && (
            <div>
              <h4 className="font-display font-semibold text-ink mb-3 text-sm sm:text-base">
                Related prompts
              </h4>
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
          {toast}
        </div>
      </motion.div>

      <PublicAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        prompt={prompt}
        onPaymentSuccess={() => {
          setShowPaymentModal(false)
          setToast('Payment successful! Reloading prompt...')
          setTimeout(() => window.location.reload(), 1000)
        }}
      />
    </section>
  )
}
