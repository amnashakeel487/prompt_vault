import { useState, useEffect } from 'react'
import { getSubcategories } from '../services/promptService'

export function useSubcategories(categoryId) {
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      if (!categoryId) {
        setSubcategories([])
        return
      }
      try {
        setLoading(true)
        const data = await getSubcategories(categoryId)
        if (isMounted) {
          setSubcategories(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load subcategories:', err)
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
  }, [categoryId])

  return { subcategories, loading, error }
}
