import { useState, useEffect, useRef } from 'react'
import { getPromptBySlug, getPrompts, incrementPromptViews } from '../services/promptService'

export function usePromptBySlug(slug) {
  const [prompt, setPrompt] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const viewCountedRef = useRef({})

  useEffect(() => {
    let isMounted = true

    async function load() {
      if (!slug) return
      try {
        setLoading(true)
        const data = await getPromptBySlug(slug)
        if (!isMounted) return

        setPrompt(data)

        if (data) {
          // Increment view count once per mount/slug session
          if (!viewCountedRef.current[data.id]) {
            viewCountedRef.current[data.id] = true
            incrementPromptViews(data.id).catch((e) => console.warn('Could not increment view count:', e))
          }

          // Fetch related prompts
          if (data.categoryId) {
            const relData = await getPrompts({
              categoryId: data.categoryId,
              limit: 4,
              status: 'published',
            })
            if (isMounted) {
              setRelated(relData.prompts.filter((p) => p.id !== data.id).slice(0, 3))
            }
          }
        }
        setError(null)
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching prompt by slug:', err)
          setError(err)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [slug])

  return { prompt, related, loading, error, setPrompt }
}
