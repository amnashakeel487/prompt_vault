import { supabase } from './supabaseClient'

/**
 * Normalizes a prompt record from Supabase (snake_case) to match frontend properties (camelCase + snake_case).
 */
export function formatPrompt(raw) {
  if (!raw) return null
  return {
    ...raw,
    id: raw.id,
    title: raw.title || '',
    slug: raw.slug || '',
    description: raw.description || '',
    categoryId: raw.category_id,
    category_id: raw.category_id,
    subcategoryId: raw.subcategory_id,
    subcategory_id: raw.subcategory_id,
    featuredImage: raw.featured_image || '',
    featured_image: raw.featured_image || '',
    outputImage: raw.output_image || '',
    output_image: raw.output_image || '',
    prompt: raw.prompt || '',
    variables: Array.isArray(raw.variables) ? raw.variables : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    author: raw.author || 'Admin',
    views: Number(raw.views || 0),
    copies: Number(raw.copies || 0),
    featured: Boolean(raw.featured),
    popular: Boolean(raw.popular),
    trending: Boolean(raw.trending),
    status: raw.status || 'published',
    seoTitle: raw.seo_title || raw.title || '',
    seo_title: raw.seo_title || raw.title || '',
    seoDescription: raw.seo_description || raw.description || '',
    seo_description: raw.seo_description || raw.description || '',
    createdAt: raw.created_at ? new Date(raw.created_at).toISOString().split('T')[0] : '',
    created_at: raw.created_at,
    updatedAt: raw.updated_at ? new Date(raw.updated_at).toISOString().split('T')[0] : '',
    updated_at: raw.updated_at,
    category: raw.categories ? formatCategory(raw.categories) : undefined,
    subcategory: raw.subcategories ? formatSubcategory(raw.subcategories) : undefined,
  }
}

/**
 * Normalizes a category record.
 */
export function formatCategory(raw) {
  if (!raw) return null
  return {
    ...raw,
    id: raw.id,
    name: raw.name || '',
    slug: raw.slug || '',
    icon: raw.icon || 'Sparkles',
    count: raw.count ?? (raw.prompts ? raw.prompts.length : 0),
    createdAt: raw.created_at,
    created_at: raw.created_at,
  }
}

/**
 * Normalizes a subcategory record.
 */
export function formatSubcategory(raw) {
  if (!raw) return null
  return {
    ...raw,
    id: raw.id,
    categoryId: raw.category_id,
    category_id: raw.category_id,
    name: raw.name || '',
    slug: raw.slug || '',
    createdAt: raw.created_at,
    created_at: raw.created_at,
  }
}

/**
 * Fetch all categories with prompt counts.
 */
export async function getCategories() {
  const { data: categoriesData, error: catError } = await supabase
    .from('categories')
    .select('*, prompts(id, status)')
    .order('name', { ascending: true })

  if (catError) {
    console.error('Error fetching categories:', catError)
    throw catError
  }

  return (categoriesData || []).map((cat) => {
    const publishedCount = (cat.prompts || []).filter((p) => p.status === 'published').length
    return formatCategory({
      ...cat,
      count: publishedCount,
    })
  })
}

/**
 * Fetch a single category by slug.
 */
export async function getCategoryBySlug(slug) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching category by slug:', error)
    return null
  }

  return formatCategory(data)
}

/**
 * Fetch subcategories for a category ID.
 */
export async function getSubcategories(categoryId) {
  let query = supabase.from('subcategories').select('*').order('name', { ascending: true })
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching subcategories:', error)
    throw error
  }

  return (data || []).map(formatSubcategory)
}

/**
 * Admin: Create a new Category.
 */
export async function createCategory(payload) {
  const row = {
    name: payload.name.trim(),
    slug: payload.slug.trim() || payload.name.toLowerCase().replace(/\s+/g, '-'),
    icon: payload.icon || 'Sparkles',
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([row])
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    throw error
  }

  return formatCategory(data)
}

/**
 * Admin: Update a Category.
 */
export async function updateCategory(id, payload) {
  const row = {
    ...(payload.name !== undefined && { name: payload.name.trim() }),
    ...(payload.slug !== undefined && { slug: payload.slug.trim() }),
    ...(payload.icon !== undefined && { icon: payload.icon }),
  }

  const { data, error } = await supabase
    .from('categories')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    throw error
  }

  return formatCategory(data)
}

/**
 * Admin: Delete a Category.
 */
export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    console.error('Error deleting category:', error)
    throw error
  }
  return true
}

/**
 * Admin: Create a Subcategory.
 */
export async function createSubcategory(payload) {
  const row = {
    category_id: payload.categoryId || payload.category_id,
    name: payload.name.trim(),
    slug: payload.slug.trim() || payload.name.toLowerCase().replace(/\s+/g, '-'),
  }

  const { data, error } = await supabase
    .from('subcategories')
    .insert([row])
    .select()
    .single()

  if (error) {
    console.error('Error creating subcategory:', error)
    throw error
  }

  return formatSubcategory(data)
}

/**
 * Admin: Delete a Subcategory.
 */
export async function deleteSubcategory(id) {
  const { error } = await supabase.from('subcategories').delete().eq('id', id)
  if (error) {
    console.error('Error deleting subcategory:', error)
    throw error
  }
  return true
}

/**
 * Fetch prompts with flexible filtering, sorting, and pagination.
 */
export async function getPrompts({
  categoryId,
  subcategoryId,
  sort = 'created_at', // 'created_at' | 'views' | 'copies'
  order = 'desc',
  status = 'published',
  featured,
  popular,
  trending,
  search,
  page = 1,
  limit = 12,
} = {}) {
  let query = supabase.from('prompts').select('*', { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  if (subcategoryId && subcategoryId !== 'all') {
    query = query.eq('subcategory_id', subcategoryId)
  }
  if (featured !== undefined) {
    query = query.eq('featured', featured)
  }
  if (popular !== undefined) {
    query = query.eq('popular', popular)
  }
  if (trending !== undefined) {
    query = query.eq('trending', trending)
  }
  if (search && search.trim()) {
    const s = search.trim()
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,prompt.ilike.%${s}%`)
  }

  // Sorting
  const sortCol = sort === 'createdAt' ? 'created_at' : sort
  query = query.order(sortCol, { ascending: order === 'asc' })

  // Range pagination
  if (limit) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
  }

  const { data, count, error } = await query
  if (error) {
    console.error('Error fetching prompts:', error)
    throw error
  }

  return {
    prompts: (data || []).map(formatPrompt),
    total: count || 0,
    page,
    limit,
    totalPages: limit ? Math.ceil((count || 0) / limit) : 1,
  }
}

/**
 * Fetch a prompt by slug.
 */
export async function getPromptBySlug(slug) {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, categories(*), subcategories(*)')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching prompt by slug:', error)
    return null
  }

  return formatPrompt(data)
}

/**
 * Atomic Increment of View Count via RPC.
 */
export async function incrementPromptViews(promptId) {
  if (!promptId) return
  const { error } = await supabase.rpc('increment_views', { prompt_id: promptId })
  if (error) {
    console.warn('RPC increment_views failed, falling back to direct update:', error.message)
    const { data } = await supabase.from('prompts').select('views').eq('id', promptId).single()
    if (data) {
      await supabase.from('prompts').update({ views: (data.views || 0) + 1 }).eq('id', promptId)
    }
  }
}

/**
 * Atomic Increment of Copy Count via RPC.
 */
export async function incrementPromptCopies(promptId) {
  if (!promptId) return
  const { error } = await supabase.rpc('increment_copies', { prompt_id: promptId })
  if (error) {
    console.warn('RPC increment_copies failed, falling back to direct update:', error.message)
    const { data } = await supabase.from('prompts').select('copies').eq('id', promptId).single()
    if (data) {
      await supabase.from('prompts').update({ copies: (data.copies || 0) + 1 }).eq('id', promptId)
    }
  }
}

/**
 * Admin: Get all prompts (all statuses) with limit.
 */
export async function getAdminPrompts() {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, categories(name), subcategories(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin prompts:', error)
    throw error
  }

  return (data || []).map(formatPrompt)
}

/**
 * Admin: Fetch overview stats.
 */
export async function getAdminStats() {
  const { data: promptData, error: promptError } = await supabase
    .from('prompts')
    .select('views, copies')

  const { count: catCount, error: catError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  if (promptError || catError) {
    console.error('Error fetching stats:', promptError || catError)
    return {
      totalPrompts: 0,
      totalCategories: 0,
      totalViews: 0,
      totalCopies: 0,
    }
  }

  const totalPrompts = promptData ? promptData.length : 0
  const totalViews = (promptData || []).reduce((acc, p) => acc + (p.views || 0), 0)
  const totalCopies = (promptData || []).reduce((acc, p) => acc + (p.copies || 0), 0)

  return {
    totalPrompts,
    totalCategories: catCount || 0,
    totalViews,
    totalCopies,
  }
}

/**
 * Admin: Create a new prompt.
 */
export async function createPrompt(payload) {
  const row = {
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    category_id: payload.categoryId || payload.category_id || null,
    subcategory_id: payload.subcategoryId || payload.subcategory_id || null,
    featured_image: payload.featuredImage || payload.featured_image || '',
    output_image: payload.outputImage || payload.output_image || '',
    prompt: payload.prompt,
    variables: payload.variables || [],
    tags: payload.tags || [],
    author: payload.author || 'Admin',
    featured: Boolean(payload.featured),
    popular: Boolean(payload.popular),
    trending: Boolean(payload.trending),
    status: payload.status || 'published',
    seo_title: payload.seoTitle || payload.seo_title || payload.title,
    seo_description: payload.seoDescription || payload.seo_description || payload.description,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert([row])
    .select()
    .single()

  if (error) {
    console.error('Error creating prompt:', error)
    throw error
  }

  return formatPrompt(data)
}

/**
 * Admin: Update an existing prompt.
 */
export async function updatePrompt(id, payload) {
  const row = {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.slug !== undefined && { slug: payload.slug }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.categoryId !== undefined && { category_id: payload.categoryId || null }),
    ...(payload.category_id !== undefined && { category_id: payload.category_id || null }),
    ...(payload.subcategoryId !== undefined && { subcategory_id: payload.subcategoryId || null }),
    ...(payload.subcategory_id !== undefined && { subcategory_id: payload.subcategory_id || null }),
    ...(payload.featuredImage !== undefined && { featured_image: payload.featuredImage }),
    ...(payload.featured_image !== undefined && { featured_image: payload.featured_image }),
    ...(payload.outputImage !== undefined && { output_image: payload.outputImage }),
    ...(payload.output_image !== undefined && { output_image: payload.output_image }),
    ...(payload.prompt !== undefined && { prompt: payload.prompt }),
    ...(payload.variables !== undefined && { variables: payload.variables }),
    ...(payload.tags !== undefined && { tags: payload.tags }),
    ...(payload.featured !== undefined && { featured: Boolean(payload.featured) }),
    ...(payload.popular !== undefined && { popular: Boolean(payload.popular) }),
    ...(payload.trending !== undefined && { trending: Boolean(payload.trending) }),
    ...(payload.status !== undefined && { status: payload.status }),
    ...(payload.seoTitle !== undefined && { seo_title: payload.seoTitle }),
    ...(payload.seo_title !== undefined && { seo_title: payload.seo_title }),
    ...(payload.seoDescription !== undefined && { seo_description: payload.seoDescription }),
    ...(payload.seo_description !== undefined && { seo_description: payload.seo_description }),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('prompts')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating prompt:', error)
    throw error
  }

  return formatPrompt(data)
}

/**
 * Admin: Delete a prompt.
 */
export async function deletePrompt(id) {
  const { error } = await supabase.from('prompts').delete().eq('id', id)
  if (error) {
    console.error('Error deleting prompt:', error)
    throw error
  }
  return true
}

/**
 * Admin: Toggle prompt publish status.
 */
export async function togglePromptStatus(id, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published'
  return updatePrompt(id, { status: newStatus })
}

/**
 * Public: Send a contact message.
 */
export async function sendContactMessage({ name, email, message }) {
  const row = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .insert([row])
    .select()
    .single()

  if (error) {
    console.error('Error sending contact message:', error)
    throw error
  }

  return data
}

/**
 * Admin: Get all contact messages.
 */
export async function getContactMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contact messages:', error)
    throw error
  }

  return data || []
}

/**
 * Admin: Mark a message as read/unread.
 */
export async function markContactMessageAsRead(id, read = true) {
  const { data, error } = await supabase
    .from('contact_messages')
    .update({ read })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error marking message read status:', error)
    throw error
  }

  return data
}

/**
 * Admin: Delete a contact message.
 */
export async function deleteContactMessage(id) {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) {
    console.error('Error deleting contact message:', error)
    throw error
  }
  return true
}

