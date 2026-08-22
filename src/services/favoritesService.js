import { supabase } from './supabaseClient'

const LOCAL_FAVORITES_KEY = 'pv_local_favorites'

function getStoredFavorites(userId = 'guest') {
  try {
    const raw = localStorage.getItem(`${LOCAL_FAVORITES_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredFavorites(userId = 'guest', list = []) {
  try {
    localStorage.setItem(`${LOCAL_FAVORITES_KEY}_${userId}`, JSON.stringify(list))
  } catch (err) {
    console.warn('Could not save to localStorage:', err)
  }
}

/**
 * Toggle favorite status for a prompt
 */
export async function toggleFavorite(promptId) {
  let userId = 'guest'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch {
    // continue as guest or local user
  }

  // 1. Try Supabase if user is logged in
  if (userId !== 'guest') {
    try {
      const { data: existing, error: selError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('prompt_id', promptId)
        .maybeSingle()

      if (!selError && existing) {
        // Remove favorite
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('prompt_id', promptId)

        const localList = getStoredFavorites(userId).filter(id => id !== promptId)
        saveStoredFavorites(userId, localList)

        return { favorited: false }
      } else if (!selError) {
        // Add favorite
        await supabase
          .from('favorites')
          .insert([{ user_id: userId, prompt_id: promptId }])

        const localList = getStoredFavorites(userId)
        if (!localList.includes(promptId)) {
          localList.push(promptId)
          saveStoredFavorites(userId, localList)
        }

        return { favorited: true }
      }
    } catch (err) {
      console.warn('Supabase favorite toggle fallback to local:', err)
    }
  }

  // 2. Fallback to localStorage
  const localList = getStoredFavorites(userId)
  const isAlready = localList.includes(promptId)
  if (isAlready) {
    const updated = localList.filter(id => id !== promptId)
    saveStoredFavorites(userId, updated)
    return { favorited: false }
  } else {
    localList.push(promptId)
    saveStoredFavorites(userId, localList)
    return { favorited: true }
  }
}

/**
 * Get user's favorite prompts
 */
export async function getUserFavorites(userId) {
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        prompts!inner(
          *,
          categories(*),
          subcategories(*),
          prompt_images(*)
        )
      `)
      .eq('user_id', userId)
      .eq('prompts.status', 'published')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(fav => ({
        ...fav.prompts,
        favorited_at: fav.created_at
      }))
    }
  } catch (err) {
    console.warn('Could not fetch from favorites table, checking local:', err)
  }

  // Fallback: get IDs from localStorage and fetch prompts
  const localIds = getStoredFavorites(userId)
  if (!localIds.length) return []

  try {
    const { data: promptsData } = await supabase
      .from('prompts')
      .select('*, categories(*), subcategories(*), prompt_images(*)')
      .in('id', localIds)
      .eq('status', 'published')

    return promptsData || []
  } catch {
    return []
  }
}

/**
 * Check if user has favorited specific prompts
 */
export async function getUserFavoriteStatus(userId, promptIds) {
  if (!promptIds?.length) return {}

  const favoriteMap = {}
  const localIds = getStoredFavorites(userId || 'guest')
  localIds.forEach(id => {
    favoriteMap[id] = true
  })

  if (userId && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('prompt_id')
        .eq('user_id', userId)
        .in('prompt_id', promptIds)

      if (!error && data) {
        data.forEach(fav => {
          favoriteMap[fav.prompt_id] = true
        })
      }
    } catch {
      // return map with local items
    }
  }

  return favoriteMap
}

/**
 * Get prompts sorted by favorites count
 */
export async function getMostFavoritedPrompts({ 
  limit = 12, 
  categoryId = null, 
  subcategoryId = null 
} = {}) {
  let query = supabase
    .from('prompts')
    .select('*, categories(*), subcategories(*), prompt_images(*)')
    .eq('status', 'published')
    .order('favorites_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (subcategoryId && subcategoryId !== 'all') {
    query = query.eq('subcategory_id', subcategoryId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}