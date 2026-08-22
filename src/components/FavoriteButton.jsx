import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { usePublicAuth } from '../context/PublicAuthContext'
import { toggleFavorite, getUserFavoriteStatus } from '../services/favoritesService'

export default function FavoriteButton({ 
  promptId, 
  initialCount = 0, 
  size = 16, 
  className = '',
  onAuthRequired 
}) {
  const { user, isAuthenticated } = usePublicAuth()
  const [isFavorited, setIsFavorited] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkFavoriteStatus()
  }, [isAuthenticated, user?.id, promptId])

  const checkFavoriteStatus = async () => {
    try {
      const status = await getUserFavoriteStatus(user?.id, [promptId])
      setIsFavorited(Boolean(status[promptId]))
    } catch (err) {
      console.error('Error checking favorite status:', err)
    }
  }

  const handleToggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated && onAuthRequired) {
      onAuthRequired()
      return
    }

    if (loading) return

    setLoading(true)
    
    try {
      const result = await toggleFavorite(promptId)
      setIsFavorited(result.favorited)
      setCount(prev => result.favorited ? prev + 1 : Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error toggling favorite:', err)
      setIsFavorited(prev => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
        transition-all duration-200 group
        ${isFavorited 
          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
          : 'bg-white/5 text-ink-muted border border-line hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
      title={isAuthenticated ? (isFavorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite'}
    >
      <Heart 
        size={size} 
        className={`
          transition-all duration-200
          ${isFavorited ? 'fill-red-400 scale-110' : 'group-hover:scale-110'}
          ${loading ? 'animate-pulse' : ''}
        `} 
      />
      {count > 0 && (
        <span className="text-xs font-mono">
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  )
}