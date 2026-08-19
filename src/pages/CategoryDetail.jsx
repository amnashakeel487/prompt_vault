import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { getCategoryBySlug, getSubcategories, getPrompts } from '../services/promptService'

export default function CategoryDetail() {
  const { slug } = useParams()
  const [category, setCategory] = useState(null)
  const [subcategories, setSubcategories] = useState([])
  const [prompts, setPrompts] = useState([])
  const [activeSub, setActiveSub] = useState('all')
  const [loadingCategory, setLoadingCategory] = useState(true)
  const [loadingPrompts, setLoadingPrompts] = useState(true)

  // 1. Fetch Category
  useEffect(() => {
    let isMounted = true
    async function loadCategory() {
      try {
        setLoadingCategory(true)
        const cat = await getCategoryBySlug(slug)
        if (isMounted) {
          setCategory(cat)
          if (cat) {
            const subs = await getSubcategories(cat.id)
            if (isMounted) setSubcategories(subs)
          }
        }
      } catch (err) {
        console.error('Error fetching category:', err)
      } finally {
        if (isMounted) setLoadingCategory(false)
      }
    }

    loadCategory()
    return () => {
      isMounted = false
    }
  }, [slug])

  // 2. Fetch Prompts for Category + active Subcategory
  useEffect(() => {
    let isMounted = true
    async function loadPrompts() {
      if (!category) return
      try {
        setLoadingPrompts(true)
        const res = await getPrompts({
          categoryId: category.id,
          subcategoryId: activeSub,
          status: 'published',
          limit: 50,
        })
        if (isMounted) {
          setPrompts(res.prompts)
        }
      } catch (err) {
        console.error('Error fetching category prompts:', err)
      } finally {
        if (isMounted) setLoadingPrompts(false)
      }
    }

    loadPrompts()
    return () => {
      isMounted = false
    }
  }, [category, activeSub])

  if (loadingCategory) {
    return (
      <section className="section-pad py-14">
        <div className="h-8 w-48 skeleton mb-4 rounded" />
        <div className="h-4 w-32 skeleton mb-8 rounded" />
        <GridSkeleton count={6} />
      </section>
    )
  }

  if (!category) {
    return (
      <section className="section-pad py-20">
        <EmptyState title="Category not found" description="This category may have been renamed or removed." />
      </section>
    )
  }

  return (
    <section className="section-pad py-14">
      <SEO
        title={category.name}
        description={`Browse ${category.name} prompts in the PromptVault library.`}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      <nav className="mb-6 flex items-center gap-1.5 text-xs text-ink-faint">
        <Link to="/" className="hover:text-ink-muted">Home</Link>
        <ChevronRight size={12} />
        <Link to="/categories" className="hover:text-ink-muted">Categories</Link>
        <ChevronRight size={12} />
        <span className="text-ink-muted">{category.name}</span>
      </nav>

      <h1 className="font-display text-3xl font-semibold text-ink">{category.name}</h1>
      <p className="mt-2 text-sm text-ink-muted">{prompts.length} prompts in this view.</p>

      {subcategories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSub('all')}
            className={`chip transition-colors cursor-pointer ${
              activeSub === 'all'
                ? '!border-violet/40 !bg-violet/15 !text-violet-soft'
                : 'hover:text-white'
            }`}
          >
            All
          </button>
          {subcategories.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSub(s.id)}
              className={`chip transition-colors cursor-pointer ${
                activeSub === s.id
                  ? '!border-violet/40 !bg-violet/15 !text-violet-soft'
                  : 'hover:text-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {loadingPrompts ? (
          <GridSkeleton count={6} />
        ) : prompts.length === 0 ? (
          <EmptyState title="No prompts yet" description="Check back soon — new prompts are added weekly." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map((p, i) => (
              <PromptCard key={p.id} prompt={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
