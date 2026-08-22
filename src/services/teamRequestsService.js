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

  const { data, error } = await supabase
    .from('team_member_requests')
    .insert([{
      user_id: user.id,
      requested_category_id: requestedCategoryId,
      message: message || '',
      status: 'pending'
    }])
    .select()
    .maybeSingle()

  if (error) {
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
      .select(`
        *,
        categories(name)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error loading team member requests:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('Failed to load team member requests:', err)
    return []
  }
}

/**
 * Approve team member request
 */
export async function approveTeamMemberRequest(requestId, assignedCategoryId = null) {
  const { error } = await supabase.rpc('approve_team_member_request', {
    request_id: requestId,
    assigned_category_id: assignedCategoryId
  })

  if (error) throw error
}

/**
 * Reject team member request
 */
export async function rejectTeamMemberRequest(requestId) {
  const { error } = await supabase
    .from('team_member_requests')
    .update({ 
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) throw error
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