import { useState, useEffect } from 'react'
import { getCategories } from '../services/promptService'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await getCategories()
        if (isMounted) {
          setCategories(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load categories:', err)
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
  }, [])

  return { categories, loading, error }
}
