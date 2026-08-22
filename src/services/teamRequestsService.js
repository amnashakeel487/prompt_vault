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
  const { data: existing } = await supabase
    .from('team_member_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .single()

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
    .single()

  if (error) throw error
  return data
}

/**
 * Get team member requests (super admin only)
 */
export async function getTeamMemberRequests() {
  const { data, error } = await supabase
    .from('team_member_requests')
    .select(`
      *,
      categories(name),
      user_email:user_id
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch user emails separately since we can't join auth.users directly
  const userIds = data?.map(req => req.user_id) || []
  const { data: users } = await supabase.auth.admin.listUsers()
  
  const userEmailMap = {}
  users?.users?.forEach(user => {
    userEmailMap[user.id] = user.email
  })

  return (data || []).map(request => ({
    ...request,
    user_email: userEmailMap[request.user_id] || 'Unknown'
  }))
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
  const { data, error } = await supabase
    .from('team_member_requests')
    .select('*, categories(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
  return data
}