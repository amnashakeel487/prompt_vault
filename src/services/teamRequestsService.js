import { supabase } from './supabaseClient'

/**
 * Submit a team member request
 */
export async function submitTeamMemberRequest({ requestedCategoryId, message }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to submit team member request')
  }

  // Check if user already has a pending request
  const { data: existing, error: checkErr } = await supabase
    .from('team_member_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (checkErr && (checkErr.code === '42P01' || checkErr.message?.includes('schema cache'))) {
    throw new Error('Database table "team_member_requests" is not created in Supabase yet. Please run the SQL script provided in your Supabase SQL Editor.')
  }

  if (existing) {
    if (existing.status === 'approved') {
      throw new Error('You are already a team member')
    }
    throw new Error('You already have a pending request')
  }

  const payload = {
    user_id: user.id,
    user_email: user.email || '',
    requested_category_id: requestedCategoryId || null,
    message: message || '',
    status: 'pending'
  }

  const { data, error } = await supabase
    .from('team_member_requests')
    .insert([payload])
    .select()
    .maybeSingle()

  if (error) {
    // Retry without user_email column in case schema hasn't added user_email column yet
    if (error.message?.includes('user_email')) {
      delete payload.user_email
      const { data: retryData, error: retryErr } = await supabase
        .from('team_member_requests')
        .insert([payload])
        .select()
        .maybeSingle()

      if (retryErr) throw retryErr
      return retryData
    }

    if (error.code === '42P01' || error.message?.includes('schema cache')) {
      throw new Error('Database table "team_member_requests" is not created in Supabase yet. Please run the SQL script provided in your Supabase SQL Editor.')
    }
    throw error
  }
  return data
}

/**
 * Get team member requests (super admin only)
 */
export async function getTeamMemberRequests({ status = null } = {}) {
  try {
    let query = supabase
      .from('team_member_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error loading team member requests:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Fetch category names safely
    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = {}
    categories?.forEach(c => { categoryMap[c.id] = c.name })

    return data.map(req => ({
      ...req,
      category_name: categoryMap[req.requested_category_id] || 'General',
      user_email: req.user_email || req.email || 'Applicant'
    }))
  } catch (err) {
    console.warn('Failed to load team member requests:', err)
    return []
  }
}

/**
 * Approve team member request
 */
export async function approveTeamMemberRequest(requestId, assignedCategoryId = null) {
  if (!requestId) {
    throw new Error('Request ID is required to approve team member.')
  }

  const categoryId = typeof assignedCategoryId === 'string' 
    ? assignedCategoryId 
    : assignedCategoryId?.assignedCategoryId || null

  // 1. Try RPC call first if configured in Supabase
  try {
    const { error: rpcError } = await supabase.rpc('approve_team_member_request', {
      request_id: requestId,
      assigned_category_id: categoryId
    })
    if (!rpcError) return
  } catch (err) {
    console.warn('RPC approve_team_member_request not available, executing direct approval fallback:', err)
  }

  // 2. Direct fallback approval
  // Fetch request record
  const { data: request, error: fetchErr } = await supabase
    .from('team_member_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchErr || !request) {
    throw new Error(`Failed to locate request (${requestId}): ${fetchErr?.message || 'Request not found'}`)
  }

  const targetCategoryId = categoryId || request.requested_category_id || null
  const targetUserId = request.user_id

  // a. Update request status to approved
  const { error: updateErr } = await supabase
    .from('team_member_requests')
    .update({ 
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateErr) {
    throw new Error(`Could not update request status: ${updateErr.message}`)
  }

  // b. Create category_admin profile in admin_profiles table
  const displayName = request.user_email ? request.user_email.split('@')[0] : 'Team Member'
  const { error: profileErr } = await supabase
    .from('admin_profiles')
    .upsert({
      id: targetUserId,
      role: 'category_admin',
      assigned_category_id: targetCategoryId,
      display_name: displayName,
      created_at: new Date().toISOString()
    })

  if (profileErr) {
    throw new Error(`Request marked approved, but creating admin profile failed: ${profileErr.message}. Ensure RLS policy allows super_admin to insert into admin_profiles.`)
  }
}

/**
 * Reject team member request
 */
export async function rejectTeamMemberRequest(requestId, reason = '') {
  if (!requestId) {
    throw new Error('Request ID is required to reject team member.')
  }

  const { error } = await supabase
    .from('team_member_requests')
    .update({ 
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`)
  }
}

/**
 * Get user's own request status
 */
export async function getUserRequestStatus(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('team_member_requests')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return null
    return data
  } catch {
    return null
  }
}