import { supabase } from './supabaseClient'

export async function getSellerProfile(userId) {
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null
    }
    throw new Error(error.message)
  }

  return data
}

export async function createSellerProfile(userId, payoutDetails = {}) {
  const { data, error } = await supabase
    .from('seller_profiles')
    .insert([{
      id: userId,
      payout_details: payoutDetails,
      is_active: true
    }])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateSellerProfile(userId, updates) {
  const { data, error } = await supabase
    .from('seller_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getSellerPrompts(sellerId) {
  const { data, error } = await supabase
    .from('prompts')
    .select(`
      *,
      categories(name),
      subcategories(name)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getSellerEarnings(sellerId) {
  // Get seller profile with earnings
  const { data: profile, error: profileError } = await supabase
    .from('seller_profiles')
    .select('total_earnings, stripe_earnings, jazzcash_earnings, easypaisa_earnings')
    .eq('id', sellerId)
    .single()

  if (profileError) {
    throw new Error(profileError.message)
  }

  // Get recent purchases for this seller
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      *,
      prompts(title, slug)
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10)

  if (purchasesError) {
    throw new Error(purchasesError.message)
  }

  // Get total sales count
  const { count: totalSales, error: countError } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('status', 'completed')

  if (countError) {
    throw new Error(countError.message)
  }

  return {
    ...profile,
    recent_purchases: purchases,
    total_sales: totalSales
  }
}

export async function createPaidPrompt(promptData) {
  const { data, error } = await supabase
    .from('prompts')
    .insert([{
      ...promptData,
      is_paid: true,
      sale_status: 'pending_approval',
      status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updatePaidPrompt(promptId, updates) {
  const { data, error } = await supabase
    .from('prompts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', promptId)
    .eq('seller_id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getUserPurchases(userId) {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      prompts(id, title, slug, featured_image),
      seller_profiles!purchases_seller_id_fkey(id)
    `)
    .eq('buyer_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function checkPurchaseStatus(userId, promptId) {
  const { data, error } = await supabase
    .from('purchases')
    .select('id, status')
    .eq('buyer_id', userId)
    .eq('prompt_id', promptId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null
    }
    throw new Error(error.message)
  }

  return data
}