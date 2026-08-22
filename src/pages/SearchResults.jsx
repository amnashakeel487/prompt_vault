import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2, SlidersHorizontal } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { getPrompts } from '../services/promptService'

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const initialSort = params.get('sort') || 'created_at'
  const [query, setQuery] = useState(initialQ)
  const [sortBy, setSortBy] = useState(initialSort)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuery(initialQ)
    setSortBy(initialSort)
  }, [initialQ, initialSort])

  // Debounced URL param update and search execution
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        const newParams = { q: query.trim() }
        if (sortBy !== 'created_at') {
          newParams.sort = sortBy
        }
        setParams(newParams)
        
        try {
          setLoading(true)
          const res = await getPrompts({
            search: query.trim(),
            status: 'published',
            sort: sortBy,
            order: 'desc',
            limit: 30,
          })
          setResults(res.prompts)
        } catch (err) {
          console.error('Search error:', err)
          setResults([])
        } finally {
          setLoading(false)
        }
      } else {
        setParams({})
        setResults([])
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSortChange(newSort) {
    setSortBy(newSort)
  }

  return (
    <section className="section-pad py-8 sm:py-14">
      <SEO title="Search" description="Search the PromptVault prompt library." />
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Search prompts</h1>

      <div className="relative mt-5 sm:mt-6 max-w-xl">
        <Search size={18} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, category, tag..."
          className="w-full rounded-full border border-line bg-white/[0.03] py-2.5 sm:py-3 pl-10 sm:pl-11 pr-10 text-xs sm:text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-violet/50 focus:bg-white/[0.06]"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-soft" />
        )}
      </div>

      {/* Sort Controls */}
      {query.trim() && (
        <div className="mt-4 sm:mt-6 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
            <SlidersHorizontal size={14} />
            <span>Sort by:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'created_at', label: 'Latest' },
              { value: 'favorites', label: 'Most Favorited' },
              { value: 'copies', label: 'Most Copied' },
              { value: 'views', label: 'Most Viewed' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleSortChange(value)}
                className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                  sortBy === value
                    ? 'bg-violet/20 text-violet-soft border border-violet/30'
                    : 'bg-white/[0.03] text-ink-muted border border-line hover:bg-white/[0.06] hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 sm:mt-10">
        {!query.trim() ? (
          <EmptyState
            title="Start typing to search"
            description="Results update as you type — no need to press enter."
            icon={Search}
          />
        ) : loading && results.length === 0 ? (
          <GridSkeleton count={6} />
        ) : results.length === 0 ? (
          <EmptyState
            title={`No results for "${query}"`}
            description="Try a different keyword, tag, or category name."
            icon={Search}
          />
        ) : (
          <>
            <p className="mb-4 sm:mb-5 text-xs sm:text-sm text-ink-muted">
              {results.length} result{results.length !== 1 && 's'}
            </p>
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p, i) => (
                <PromptCard key={p.id} prompt={p} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
