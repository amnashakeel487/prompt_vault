import { useState, useEffect, useCallback } from 'react'
import { getPrompts } from '../services/promptService'

export function usePrompts(options = {}) {
  const {
    categoryId,
    subcategoryId,
    sort = 'created_at',
    order = 'desc',
    status = 'published',
    featured,
    popular,
    trending,
    search,
    limit = 12,
    initialPage = 1,
    infinite = false,
  } = options

  const [prompts, setPrompts] = useState([])
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPromptsData = useCallback(async (targetPage = 1, isAppend = false) => {
    try {
      setLoading(true)
      const res = await getPrompts({
        categoryId,
        subcategoryId,
        sort,
        order,
        status,
        featured,
        popular,
        trending,
        search,
        page: targetPage,
        limit,
      })

      setTotal(res.total)
      setTotalPages(res.totalPages)
      setPage(targetPage)

      if (isAppend) {
        setPrompts((prev) => [...prev, ...res.prompts])
      } else {
        setPrompts(res.prompts)
      }
      setError(null)
    } catch (err) {
      console.error('Error in usePrompts:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [categoryId, subcategoryId, sort, order, status, featured, popular, trending, search, limit])

  useEffect(() => {
    fetchPromptsData(1, false)
  }, [fetchPromptsData])

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) {
      fetchPromptsData(page + 1, infinite)
    }
  }, [loading, page, totalPages, fetchPromptsData, infinite])

  const refetch = useCallback(() => {
    return fetchPromptsData(page, false)
  }, [fetchPromptsData, page])

  return {
    prompts,
    loading,
    error,
    total,
    totalPages,
    page,
    setPage: (p) => fetchPromptsData(p, false),
    loadMore,
    hasMore: page < totalPages,
    refetch,
  }
}
