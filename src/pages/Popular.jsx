import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { usePrompts } from '../hooks/usePrompts'
import { Loader2 } from 'lucide-react'

export default function Popular() {
  const { prompts, loading, hasMore, loadMore } = usePrompts({
    sort: 'views',
    order: 'desc',
    limit: 12,
    infinite: true,
  })

  return (
    <section className="section-pad py-14">
      <SEO title="Popular Prompts" description="The most-viewed prompts on PromptVault." />
      <h1 className="font-display text-3xl font-semibold text-ink">Popular prompts</h1>
      <p className="mt-2 text-sm text-ink-muted">Ranked by views.</p>

      <div className="mt-8">
        {loading && prompts.length === 0 ? (
          <GridSkeleton count={6} />
        ) : prompts.length === 0 ? (
          <EmptyState title="No popular prompts found" description="Prompts will rank here as they receive views." />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {prompts.map((p, i) => (
                <PromptCard key={p.id} prompt={p} index={i} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-ghost !px-6 !py-2.5 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Loading more...
                    </span>
                  ) : (
                    'Load more prompts'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
