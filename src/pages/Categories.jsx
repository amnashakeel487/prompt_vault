import SEO from '../components/SEO'
import CategoryCard from '../components/CategoryCard'
import EmptyState from '../components/EmptyState'
import { useCategories } from '../hooks/useCategories'

export default function Categories() {
  const { categories, loading, error } = useCategories()

  return (
    <section className="section-pad py-14">
      <SEO title="Categories" description="Browse all prompt categories in the PromptVault library." />
      <div className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Categories</h1>
        <p className="mt-2 text-sm text-ink-muted">Every prompt organized by use case.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-24 animate-pulse" />
          ))}
        </div>
      ) : error || categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Categories will appear here once configured in the database."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
