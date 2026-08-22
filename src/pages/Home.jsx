import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Heart } from 'lucide-react'
import SEO from '../components/SEO'
import HeroTerminal from '../components/HeroTerminal'
import TrustedBy from '../components/TrustedBy'
import HowItWorks from '../components/HowItWorks'
import CategoryCard from '../components/CategoryCard'
import PromptCard from '../components/PromptCard'
import FAQ from '../components/FAQ'
import { GridSkeleton } from '../components/Skeletons'
import { useCategories } from '../hooks/useCategories'
import { usePrompts } from '../hooks/usePrompts'

export default function Home() {
  const { categories, loading: loadingCats } = useCategories()
  const { prompts: featured, loading: loadingFeatured } = usePrompts({
    featured: true,
    limit: 6,
    status: 'published',
  })
  const { prompts: mostFavorited, loading: loadingFavorited } = usePrompts({
    sort: 'favorites',
    order: 'desc',
    limit: 6,
    status: 'published',
  })
  const { prompts: latest, total, loading: loadingLatest } = usePrompts({
    sort: 'created_at',
    order: 'desc',
    limit: 6,
    status: 'published',
  })

  const featuredList = featured.length > 0 ? featured : latest.slice(0, 6)
  const mostFavoritedList = mostFavorited.length > 0 ? mostFavorited : latest.slice(0, 6)

  const totalPromptCount = total > 0 ? `${total}+` : (latest.length > 0 ? `${latest.length}+` : '120+')
  const totalCategoriesCount = categories.length > 0 ? categories.length : 6

  return (
    <>
      <SEO
        title="Ready-to-run AI prompts"
        description="Browse, customize, and copy production-ready AI prompts. Fill in the variables, generate your copy, and ship faster."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid-glow">
        <div className="section-pad grid items-center gap-8 sm:gap-12 py-12 sm:py-16 md:py-24 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="chip !border-violet/30 !bg-violet/10 !text-violet-soft mb-4 sm:mb-5 inline-flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Sparkles size={12} /> Curated prompts, updated weekly
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.15] sm:leading-[1.1] tracking-tight text-ink">
              Every prompt is a{' '}
              <span className="bg-gradient-to-r from-violet-soft to-cyan bg-clip-text text-transparent">fill-in-the-blank</span>{' '}
              shortcut.
            </h1>
            <p className="mt-4 sm:mt-5 max-w-lg text-sm sm:text-base text-ink-muted leading-relaxed font-normal">
              Browse a library of production-tested AI prompts. Swap in your business, audience, and tone —
              PromptVault detects the variables and builds the form for you.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/categories" className="btn-primary w-full sm:w-auto justify-center">
                Browse categories <ArrowRight size={16} />
              </Link>
              <Link to="/latest" className="btn-ghost w-full sm:w-auto justify-center">
                See latest prompts
              </Link>
            </div>
            <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-6 pt-4 border-t border-line/40 sm:border-0 sm:pt-0">
              <div>
                <p className="font-display text-xl sm:text-2xl font-semibold text-ink">{totalPromptCount}</p>
                <p className="text-xs sm:text-sm text-ink-muted">Prompts</p>
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl font-semibold text-ink">{totalCategoriesCount}</p>
                <p className="text-xs sm:text-sm text-ink-muted">Categories</p>
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl font-semibold text-ink">40k+</p>
                <p className="text-xs sm:text-sm text-ink-muted">Copies</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="w-full">
            <HeroTerminal />
          </motion.div>
        </div>
      </section>

      {/* 1. Trusted By Bar */}
      <TrustedBy />

      {/* 2. How It Works */}
      <HowItWorks />

      {/* 3. Categories */}
      <section id="categories" className="section-pad py-12 sm:py-16">
        <div className="mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Browse by category</h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">Find the right prompt family for the job.</p>
          </div>
          <Link to="/categories" className="hidden sm:flex items-center gap-1 text-sm text-violet-soft hover:text-violet transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loadingCats ? (
          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Featured carousel (scrollable row) */}
      <section id="popular" className="section-pad py-12 sm:py-16">
        <div className="mb-6 sm:mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Featured prompts</h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">Hand-picked for consistently strong output.</p>
        </div>
        {loadingFeatured && loadingLatest ? (
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[260px] sm:min-w-[300px] max-w-[280px] sm:max-w-[300px] glass-card h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory">
            {featuredList.map((p, i) => (
              <div key={p.id} className="min-w-[260px] sm:min-w-[300px] max-w-[280px] sm:max-w-[300px] snap-start shrink-0">
                <PromptCard prompt={p} index={i} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Most Loved Prompts */}
      <section className="section-pad py-12 sm:py-16">
        <div className="mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink flex items-center gap-2">
              <Heart size={24} className="text-red-400" />
              Most loved prompts
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">Community favorites with the most hearts.</p>
          </div>
          <Link to="/search?sort=favorites" className="hidden sm:flex items-center gap-1 text-sm text-violet-soft hover:text-violet transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loadingFavorited && loadingLatest ? (
          <GridSkeleton count={6} />
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mostFavoritedList.map((p, i) => (
              <PromptCard key={p.id} prompt={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Latest grid */}
      <section id="latest" className="section-pad py-12 sm:py-16">
        <div className="mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Latest prompts</h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">Fresh additions to the library.</p>
          </div>
          <Link to="/latest" className="hidden sm:flex items-center gap-1 text-sm text-violet-soft hover:text-violet transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loadingLatest ? (
          <GridSkeleton count={6} />
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((p, i) => (
              <PromptCard key={p.id} prompt={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* 4. FAQ Accordion */}
      <FAQ />
    </>
  )
}
