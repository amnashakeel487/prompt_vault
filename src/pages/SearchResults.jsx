import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { getPrompts } from '../services/promptService'

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuery(initialQ)
  }, [initialQ])

  // Debounced URL param update and search execution
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        setParams({ q: query.trim() })
        try {
          setLoading(true)
          const res = await getPrompts({
            search: query.trim(),
            status: 'published',
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
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="section-pad py-14">
      <SEO title="Search" description="Search the PromptVault prompt library." />
      <h1 className="font-display text-3xl font-semibold text-ink">Search prompts</h1>

      <div className="relative mt-6 max-w-xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, category, tag, or description…"
          className="w-full rounded-full border border-line bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-violet/50 focus:bg-white/[0.06]"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-soft" />
        )}
      </div>

      <div className="mt-10">
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
            <p className="mb-5 text-sm text-ink-muted">
              {results.length} result{results.length !== 1 && 's'}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
