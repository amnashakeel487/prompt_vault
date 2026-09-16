import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, DollarSign, TrendingUp, Filter, Search, X, ArrowUpDown, CreditCard, Smartphone } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { usePrompts } from '../hooks/usePrompts'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../services/paymentService'

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories } = useCategories()
  
  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'created_at',
    order: searchParams.get('order') || 'desc'
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch paid prompts only
  const { prompts, total, loading, totalPages } = usePrompts({
    search: filters.search,
    categoryId: filters.category,
    sort: filters.sort,
    order: filters.order,
    page,
    limit: 12,
    // Add marketplace-specific filters
    isPaid: true,
    status: 'published',
    saleStatus: 'approved'
  })

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: 'created_at',
      order: 'desc'
    })
    setPage(1)
  }

  const sortOptions = [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'price:asc', label: 'Price: Low to High' },
    { value: 'price:desc', label: 'Price: High to Low' },
    { value: 'purchase_count:desc', label: 'Most Popular' },
    { value: 'views:desc', label: 'Most Viewed' },
  ]

  const priceRanges = [
    { label: 'Under Rs. 500', min: '', max: '500' },
    { label: 'Rs. 500 - Rs. 1,000', min: '500', max: '1000' },
    { label: 'Rs. 1,000 - Rs. 2,500', min: '1000', max: '2500' },
    { label: 'Rs. 2,500 - Rs. 5,000', min: '2500', max: '5000' },
    { label: 'Over Rs. 5,000', min: '5000', max: '' },
  ]

  const handleSortChange = (value) => {
    const [sortField, sortOrder] = value.split(':')
    setFilters(prev => ({
      ...prev,
      sort: sortField,
      order: sortOrder
    }))
    setPage(1)
  }

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'created_at' && v !== 'desc').length

  return (
    <section className="section-pad py-8 sm:py-12">
      <SEO
        title="Premium Prompts Marketplace | PromptVault"
        description="Browse and purchase premium AI prompts from expert creators. High-quality, tested prompts with commercial licenses."
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-violet/20 border border-violet/30">
            <ShoppingBag size={24} className="text-violet-soft" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
              Premium Marketplace
            </h1>
            <p className="text-sm sm:text-base text-ink-muted">
              High-quality prompts from expert creators, ready for commercial use
            </p>
          </div>
        </div>

        {/* Payment Methods Supported */}
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-6">
          <span>Payment methods:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CreditCard size={14} />
              <span>Cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone size={14} />
              <span>JazzCash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone size={14} />
              <span>Easypaisa</span>
            </div>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search premium prompts..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-line bg-white/[0.03] text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={`${filters.sort}:${filters.order}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-line bg-white/[0.03] text-ink focus:border-violet focus:outline-none min-w-[180px]"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost flex items-center gap-2 ${showFilters ? '!bg-violet/20 !border-violet/30 !text-violet-soft' : ''}`}
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-violet/20 text-violet-soft px-2 py-0.5 rounded-full text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="p-4 rounded-xl border border-line bg-white/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-ink">Filters</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-violet-soft hover:text-violet transition-colors flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line bg-white/[0.03] text-ink focus:border-violet focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Price Range</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-line bg-white/[0.03] text-ink focus:border-violet focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-line bg-white/[0.03] text-ink focus:border-violet focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {priceRanges.map((range, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleFilterChange('minPrice', range.min)
                            handleFilterChange('maxPrice', range.max)
                          }}
                          className="text-xs px-2 py-1 rounded bg-white/[0.05] hover:bg-violet/20 border border-line hover:border-violet/30 text-ink-muted hover:text-violet-soft transition-colors"
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between text-sm text-ink-muted">
        <span>
          {loading ? 'Loading...' : `${total} premium prompts found`}
        </span>
        {prompts.length > 0 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <GridSkeleton count={12} />
      ) : prompts.length === 0 ? (
        <EmptyState
          title="No premium prompts found"
          description="Try adjusting your search criteria or browse all categories."
          action={
            <div className="flex gap-3">
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
              <Link to="/categories" className="btn-ghost">
                Browse Categories
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt, index) => (
            <PromptCard key={prompt.id} prompt={prompt} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost disabled:opacity-50"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-violet/20 border border-violet/30 text-violet-soft'
                    : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-ghost disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Marketplace CTA */}
      <div className="mt-16 text-center glass-card p-8">
        <div className="max-w-md mx-auto">
          <TrendingUp size={32} className="text-violet-soft mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-ink mb-2">
            Want to sell your prompts?
          </h3>
          <p className="text-sm text-ink-muted mb-6">
            Join our marketplace and start earning from your expertise. Create premium prompts and reach thousands of users.
          </p>
          <Link to="/account" className="btn-primary">
            Become a Seller
          </Link>
        </div>
      </div>
    </section>
  )
}