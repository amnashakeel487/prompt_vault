import { supabase } from './supabaseClient'
import { formatGoogleDriveImageUrl, detectImageSource } from '../utils/googleDrive'

/**
 * Normalizes a prompt record from Supabase (snake_case) to match frontend properties (camelCase + snake_case).
 */
export function formatPrompt(raw) {
  if (!raw) return null

  // Process images array if present
  const rawImages = Array.isArray(raw.prompt_images)
    ? raw.prompt_images
    : Array.isArray(raw.images)
    ? raw.images
    : []

  const formattedImages = rawImages
    .map((img) => ({
      id: img.id,
      promptId: img.prompt_id || img.promptId,
      imageUrl: formatGoogleDriveImageUrl(img.image_url || img.imageUrl),
      source: img.source || detectImageSource(img.image_url || img.imageUrl),
      sortOrder: Number(img.sort_order || img.sortOrder || 0),
      isFeatured: Boolean(img.is_featured || img.isFeatured),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Primary featured image
  const featuredFromList = formattedImages.find((img) => img.isFeatured)?.imageUrl
  const primaryFeaturedImage =
    featuredFromList ||
    formatGoogleDriveImageUrl(raw.featured_image || raw.featuredImage) ||
    (formattedImages.length > 0 ? formattedImages[0].imageUrl : '')

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
    featuredImage: primaryFeaturedImage,
    featured_image: primaryFeaturedImage,
    outputImage: formatGoogleDriveImageUrl(raw.output_image || raw.outputImage || ''),
    output_image: formatGoogleDriveImageUrl(raw.output_image || raw.outputImage || ''),
    images: formattedImages,
    prompt_images: formattedImages,
    prompt: raw.prompt || '',
    variables: Array.isArray(raw.variables) ? raw.variables : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    author: raw.author || 'Admin',
    views: Number(raw.views || 0),
    copies: Number(raw.copies || 0),
    featured: Boolean(raw.featured),
    popular: Boolean(raw.popular),
    trending: Boolean(raw.trending),
    status: raw.status || 'published', // 'published' | 'draft' | 'pending' | 'rejected'
    rejectionReason: raw.rejection_reason || '',
    rejection_reason: raw.rejection_reason || '',
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
 * Normalizes an admin profile record.
 */
export function formatAdminProfile(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    role: raw.role || 'category_admin',
    assignedCategoryId: raw.assigned_category_id,
    assigned_category_id: raw.assigned_category_id,
    displayName: raw.display_name || '',
    display_name: raw.display_name || '',
    createdAt: raw.created_at,
    created_at: raw.created_at,
    category: raw.categories ? formatCategory(raw.categories) : undefined,
    email: raw.email || raw.user?.email || '',
  }
}

/**
 * Fetch all categories with published prompt counts.
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
 * Public: Fetch published prompts with flexible filtering, sorting, and pagination.
 */
export async function getPrompts({
  categoryId,
  subcategoryId,
  sort = 'created_at',
  order = 'desc',
  status = 'published',
  featured,
  popular,
  trending,
  search,
  page = 1,
  limit = 12,
} = {}) {
  let query = supabase.from('prompts').select('*, prompt_images(*)', { count: 'exact' })

  // Public site only shows published
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
 * Fetch a single prompt by slug (includes multi-images, categories, subcategories).
 */
export async function getPromptBySlug(slug) {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, categories(*), subcategories(*), prompt_images(*)')
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
 * Admin: Get all prompts (scoped by category if category_admin).
 */
export async function getAdminPrompts(userProfile = null) {
  let query = supabase
    .from('prompts')
    .select('*, categories(name), subcategories(name), prompt_images(*)')
    .order('created_at', { ascending: false })

  // Scope to category if user is a category admin
  if (userProfile && userProfile.role === 'category_admin' && userProfile.assigned_category_id) {
    query = query.eq('category_id', userProfile.assigned_category_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching admin prompts:', error)
    throw error
  }

  return (data || []).map(formatPrompt)
}

/**
 * Super Admin: Get all pending prompts awaiting review.
 */
export async function getPendingPrompts() {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, categories(name), subcategories(name), prompt_images(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending prompts:', error)
    throw error
  }

  return (data || []).map(formatPrompt)
}

/**
 * Super Admin: Approve a pending prompt (sets status to 'published').
 */
export async function approvePrompt(id) {
  const { data, error } = await supabase
    .from('prompts')
    .update({
      status: 'published',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error approving prompt:', error)
    throw error
  }

  return formatPrompt(data)
}

/**
 * Super Admin: Reject a pending prompt with optional reason.
 */
export async function rejectPrompt(id, reason = '') {
  const { data, error } = await supabase
    .from('prompts')
    .update({
      status: 'rejected',
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error rejecting prompt:', error)
    throw error
  }

  return formatPrompt(data)
}

/**
 * Admin: Fetch overview stats (scoped if category_admin).
 */
export async function getAdminStats(userProfile = null) {
  let promptQuery = supabase.from('prompts').select('views, copies, status, category_id')

  if (userProfile && userProfile.role === 'category_admin' && userProfile.assigned_category_id) {
    promptQuery = promptQuery.eq('category_id', userProfile.assigned_category_id)
  }

  const { data: promptData, error: promptError } = await promptQuery

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
      pendingCount: 0,
    }
  }

  const totalPrompts = promptData ? promptData.length : 0
  const totalViews = (promptData || []).reduce((acc, p) => acc + (p.views || 0), 0)
  const totalCopies = (promptData || []).reduce((acc, p) => acc + (p.copies || 0), 0)
  const pendingCount = (promptData || []).filter((p) => p.status === 'pending').length

  return {
    totalPrompts,
    totalCategories: catCount || 0,
    totalViews,
    totalCopies,
    pendingCount,
  }
}

/**
 * Admin: Create a prompt with multi-image support and role-scoped status enforcement.
 */
export async function createPrompt(payload, userProfile = null) {
  // Enforce pending status if category admin
  const isCatAdmin = userProfile && userProfile.role === 'category_admin'
  let targetStatus = payload.status || 'published'
  let targetCategory = payload.categoryId || payload.category_id || null

  if (isCatAdmin) {
    targetStatus = 'pending'
    targetCategory = userProfile.assigned_category_id || targetCategory
  }

  // Determine primary featured image
  const images = Array.isArray(payload.images) ? payload.images : []
  const featuredFromImages = images.find((img) => img.isFeatured)?.imageUrl || images[0]?.imageUrl
  const primaryFeaturedImage =
    payload.featuredImage ||
    payload.featured_image ||
    featuredFromImages ||
    ''

  const row = {
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    category_id: targetCategory,
    subcategory_id: payload.subcategoryId || payload.subcategory_id || null,
    featured_image: formatGoogleDriveImageUrl(primaryFeaturedImage),
    output_image: formatGoogleDriveImageUrl(payload.outputImage || payload.output_image || ''),
    prompt: payload.prompt,
    variables: payload.variables || [],
    tags: payload.tags || [],
    author: payload.author || userProfile?.display_name || 'Admin',
    featured: Boolean(payload.featured),
    popular: Boolean(payload.popular),
    trending: Boolean(payload.trending),
    status: targetStatus,
    rejection_reason: null,
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

  // Save multiple images to prompt_images table
  if (images.length > 0 && data.id) {
    await savePromptImages(data.id, images)
  }

  return formatPrompt(data)
}

/**
 * Admin: Update an existing prompt (resets status to 'pending' if category_admin).
 */
export async function updatePrompt(id, payload, userProfile = null) {
  const isCatAdmin = userProfile && userProfile.role === 'category_admin'
  let targetStatus = payload.status

  if (isCatAdmin) {
    // Category admin updates must force status back to 'pending' for review
    targetStatus = 'pending'
  }

  const images = Array.isArray(payload.images) ? payload.images : null
  let primaryFeaturedImage = payload.featuredImage ?? payload.featured_image

  if (images && images.length > 0) {
    const feat = images.find((img) => img.isFeatured)?.imageUrl || images[0]?.imageUrl
    if (feat) primaryFeaturedImage = feat
  }

  const row = {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.slug !== undefined && { slug: payload.slug }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.categoryId !== undefined && { category_id: payload.categoryId || null }),
    ...(payload.category_id !== undefined && { category_id: payload.category_id || null }),
    ...(payload.subcategoryId !== undefined && { subcategory_id: payload.subcategoryId || null }),
    ...(payload.subcategory_id !== undefined && { subcategory_id: payload.subcategory_id || null }),
    ...(primaryFeaturedImage !== undefined && {
      featured_image: formatGoogleDriveImageUrl(primaryFeaturedImage),
    }),
    ...(payload.outputImage !== undefined && {
      output_image: formatGoogleDriveImageUrl(payload.outputImage),
    }),
    ...(payload.output_image !== undefined && {
      output_image: formatGoogleDriveImageUrl(payload.output_image),
    }),
    ...(payload.prompt !== undefined && { prompt: payload.prompt }),
    ...(payload.variables !== undefined && { variables: payload.variables }),
    ...(payload.tags !== undefined && { tags: payload.tags }),
    ...(payload.featured !== undefined && { featured: Boolean(payload.featured) }),
    ...(payload.popular !== undefined && { popular: Boolean(payload.popular) }),
    ...(payload.trending !== undefined && { trending: Boolean(payload.trending) }),
    ...(targetStatus !== undefined && { status: targetStatus }),
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

  // Update prompt images if provided
  if (images !== null) {
    await savePromptImages(id, images)
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
 * Admin: Toggle prompt publish status (Super Admin only).
 */
export async function togglePromptStatus(id, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published'
  return updatePrompt(id, { status: newStatus })
}

/**
 * Fetch all images for a specific prompt.
 */
export async function getPromptImages(promptId) {
  if (!promptId) return []
  const { data, error } = await supabase
    .from('prompt_images')
    .select('*')
    .eq('prompt_id', promptId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching prompt images:', error)
    return []
  }

  return (data || []).map((img) => ({
    id: img.id,
    promptId: img.prompt_id,
    imageUrl: formatGoogleDriveImageUrl(img.image_url),
    source: img.source || detectImageSource(img.image_url),
    sortOrder: img.sort_order,
    isFeatured: img.is_featured,
  }))
}

/**
 * Save / sync multiple images for a prompt.
 */
export async function savePromptImages(promptId, images = []) {
  if (!promptId) return []

  try {
    // 1. Delete existing images for prompt
    await supabase.from('prompt_images').delete().eq('prompt_id', promptId)

    if (images.length === 0) return []

    // 2. Insert new batch
    const rows = images.map((img, index) => ({
      prompt_id: promptId,
      image_url: formatGoogleDriveImageUrl(img.imageUrl || img.image_url),
      source: img.source || detectImageSource(img.imageUrl || img.image_url),
      sort_order: img.sortOrder !== undefined ? img.sortOrder : index,
      is_featured: Boolean(img.isFeatured || img.is_featured || index === 0),
    }))

    const { data, error } = await supabase.from('prompt_images').insert(rows).select()
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error saving prompt images:', err)
    return []
  }
}

/**
 * Super Admin: Get all admin profiles.
 */
export async function getAdminProfiles() {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*, categories(id, name, slug)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin profiles:', error)
    throw error
  }

  return (data || []).map(formatAdminProfile)
}

/**
 * Super Admin: Create a new admin user + profile.
 */
export async function createAdminUser({ email, password, displayName, role = 'category_admin', assignedCategoryId = null }) {
  // 1. Sign up user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        display_name: displayName.trim(),
      },
    },
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    throw authError
  }

  const newUserId = authData.user?.id
  if (!newUserId) {
    throw new Error('User creation returned no ID.')
  }

  // 2. Insert into admin_profiles
  const profileRow = {
    id: newUserId,
    role: role || 'category_admin',
    assigned_category_id: role === 'super_admin' ? null : assignedCategoryId || null,
    display_name: displayName.trim() || email.split('@')[0],
  }

  const { data: profileData, error: profileError } = await supabase
    .from('admin_profiles')
    .insert([profileRow])
    .select('*, categories(id, name, slug)')
    .single()

  if (profileError) {
    console.error('Error creating admin profile record:', profileError)
    throw profileError
  }

  return formatAdminProfile({
    ...profileData,
    email: email.trim(),
  })
}

/**
 * Super Admin: Update an admin profile's role or assigned category.
 */
export async function updateAdminProfile(id, { role, assignedCategoryId, displayName }) {
  const row = {
    ...(role !== undefined && {
      role,
      assigned_category_id: role === 'super_admin' ? null : assignedCategoryId || null,
    }),
    ...(displayName !== undefined && { display_name: displayName.trim() }),
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .update(row)
    .eq('id', id)
    .select('*, categories(id, name, slug)')
    .single()

  if (error) {
    console.error('Error updating admin profile:', error)
    throw error
  }

  return formatAdminProfile(data)
}

/**
 * Super Admin: Delete an admin profile / revoke admin privileges.
 */
export async function deleteAdminProfile(id) {
  const { error } = await supabase.from('admin_profiles').delete().eq('id', id)
  if (error) {
    console.error('Error deleting admin profile:', error)
    throw error
  }
  return true
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
