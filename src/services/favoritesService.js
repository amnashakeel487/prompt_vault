import { supabase } from './supabaseClient'

/**
 * Toggle favorite status for a prompt
 */
export async function toggleFavorite(promptId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to favorite prompts')
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .single()

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('prompt_id', promptId)

    if (error) throw error
    return { favorited: false }
  } else {
    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert([{
        user_id: user.id,
        prompt_id: promptId
      }])

    if (error) throw error
    return { favorited: true }
  }
}

/**
 * Get user's favorite prompts
 */
export async function getUserFavorites(userId) {
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

  if (error) throw error

  return (data || []).map(fav => ({
    ...fav.prompts,
    favorited_at: fav.created_at
  }))
}

/**
 * Check if user has favorited specific prompts
 */
export async function getUserFavoriteStatus(userId, promptIds) {
  if (!promptIds?.length) return {}

  const { data, error } = await supabase
    .from('favorites')
    .select('prompt_id')
    .eq('user_id', userId)
    .in('prompt_id', promptIds)

  if (error) throw error

  const favoriteMap = {}
  data?.forEach(fav => {
    favoriteMap[fav.prompt_id] = true
  })

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