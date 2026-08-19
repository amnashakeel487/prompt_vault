import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { usePrompts } from '../hooks/usePrompts'
import { Loader2 } from 'lucide-react'

export default function Latest() {
  const { prompts, loading, hasMore, loadMore } = usePrompts({
    sort: 'created_at',
    order: 'desc',
    limit: 12,
    infinite: true,
  })

  return (
    <section className="section-pad py-14">
      <SEO title="Latest Prompts" description="The newest prompts added to PromptVault." />
      <h1 className="font-display text-3xl font-semibold text-ink">Latest prompts</h1>
      <p className="mt-2 text-sm text-ink-muted">Freshly added, newest first.</p>

      <div className="mt-8">
        {loading && prompts.length === 0 ? (
          <GridSkeleton count={6} />
        ) : prompts.length === 0 ? (
          <EmptyState title="No prompts found" description="New prompts will appear here as soon as they are published." />
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
