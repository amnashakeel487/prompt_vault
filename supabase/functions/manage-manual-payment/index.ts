import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = userData.user
    const body = await req.json()
    const { action } = body

    // 1. ACTION: get-seller-credentials
    if (action === 'get-seller-credentials') {
      const { seller_id, prompt_id } = body
      let targetSellerId = seller_id

      if (!targetSellerId && prompt_id) {
        const { data: prompt } = await supabaseClient
          .from('prompts')
          .select('seller_id')
          .eq('id', prompt_id)
          .single()
        targetSellerId = prompt?.seller_id
      }

      if (!targetSellerId) {
        return new Response(
          JSON.stringify({
            payout_details: {
              jazzcash_title: '',
              jazzcash_number: '',
              easypaisa_title: '',
              easypaisa_number: '',
              payment_instructions: ''
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: profile } = await supabaseClient
        .from('seller_profiles')
        .select('payout_details')
        .eq('id', targetSellerId)
        .maybeSingle()

      return new Response(
        JSON.stringify({
          payout_details: profile?.payout_details || {}
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. ACTION: submit-payment
    if (action === 'submit-payment') {
      const { prompt_id, payment_method, transaction_id, screenshot_url, sender_number, notes } = body

      if (!prompt_id) throw new Error('Prompt ID is required')
      if (!payment_method) throw new Error('Payment method is required')
      if (!transaction_id) throw new Error('Transaction ID is required')

      // Fetch prompt details
      const { data: prompt, error: promptErr } = await supabaseClient
        .from('prompts')
        .select('id, title, price, seller_id, is_paid')
        .eq('id', prompt_id)
        .single()

      if (promptErr || !prompt) {
        throw new Error('Prompt not found')
      }

      const sellerId = prompt.seller_id || user.id
      const amount = prompt.price || 0

      // Check if user already has an active or completed purchase
      const { data: existingPurchases } = await supabaseClient
        .from('purchases')
        .select('id, status')
        .eq('buyer_id', user.id)
        .eq('prompt_id', prompt_id)

      if (existingPurchases && existingPurchases.length > 0) {
        const completedPurchase = existingPurchases.find((p: any) => p.status === 'completed')
        if (completedPurchase) {
          return new Response(
            JSON.stringify({ error: 'You have already purchased this prompt and have full access.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete previous pending or failed attempts
        await supabaseClient
          .from('purchases')
          .delete()
          .eq('buyer_id', user.id)
          .eq('prompt_id', prompt_id)
      }

      // Insert new purchase with status 'pending'
      const purchaseData = {
        buyer_id: user.id,
        prompt_id: prompt_id,
        seller_id: sellerId,
        payment_method: payment_method,
        gateway_transaction_id: transaction_id.trim(),
        amount: amount,
        currency: 'PKR',
        status: 'pending',
        gateway_response: {
          screenshot_url: screenshot_url || '',
          sender_number: sender_number || '',
          notes: notes || '',
          buyer_email: user.email,
          submitted_at: new Date().toISOString()
        }
      }

      const { data: newPurchase, error: insertErr } = await supabaseClient
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single()

      if (insertErr) {
        console.error('Error inserting manual purchase:', insertErr)
        throw new Error(insertErr.message || 'Failed to submit payment verification')
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment proof submitted successfully. Waiting for seller approval.',
          purchase: newPurchase
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. ACTION: get-seller-orders
    if (action === 'get-seller-orders') {
      const { data: orders, error: ordersErr } = await supabaseClient
        .from('purchases')
        .select(`
          *,
          prompts(id, title, slug, price, featured_image)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        throw new Error(ordersErr.message)
      }

      return new Response(
        JSON.stringify({ orders: orders || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. ACTION: approve-order
    if (action === 'approve-order') {
      const { purchase_id } = body
      if (!purchase_id) throw new Error('Purchase ID is required')

      const { data: purchase, error: pErr } = await supabaseClient
        .from('purchases')
        .select('*, prompts(id, title, purchase_count)')
        .eq('id', purchase_id)
        .single()

      if (pErr || !purchase) {
        throw new Error('Purchase record not found')
      }

      // Check authorization (seller or super admin)
      if (purchase.seller_id !== user.id) {
        const { data: adminProfile } = await supabaseClient
          .from('admin_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (adminProfile?.role !== 'super_admin') {
          throw new Error('You are not authorized to approve this purchase')
        }
      }

      if (purchase.status === 'completed') {
        return new Response(
          JSON.stringify({ success: true, message: 'Purchase is already approved' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update purchase status to 'completed'
      const { error: updateErr } = await supabaseClient
        .from('purchases')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', purchase_id)

      if (updateErr) throw new Error(updateErr.message)

      // Increment purchase count on the prompt
      try {
        const currentCount = purchase.prompts?.purchase_count || 0
        await supabaseClient
          .from('prompts')
          .update({ purchase_count: currentCount + 1 })
          .eq('id', purchase.prompt_id)
      } catch (countErr) {
        console.warn('Could not increment prompt count:', countErr)
      }

      // Update seller profile earnings
      try {
        const { data: sellerProf } = await supabaseClient
          .from('seller_profiles')
          .select('total_earnings, jazzcash_earnings, easypaisa_earnings')
          .eq('id', purchase.seller_id)
          .maybeSingle()

        if (sellerProf) {
          const currentTotal = Number(sellerProf.total_earnings || 0)
          const currentMethodEarnings = purchase.payment_method === 'jazzcash'
            ? Number(sellerProf.jazzcash_earnings || 0)
            : Number(sellerProf.easypaisa_earnings || 0)

          const updatePayload: Record<string, number> = {
            total_earnings: currentTotal + Number(purchase.amount || 0)
          }

          if (purchase.payment_method === 'jazzcash') {
            updatePayload.jazzcash_earnings = currentMethodEarnings + Number(purchase.amount || 0)
          } else if (purchase.payment_method === 'easypaisa') {
            updatePayload.easypaisa_earnings = currentMethodEarnings + Number(purchase.amount || 0)
          }

          await supabaseClient
            .from('seller_profiles')
            .update(updatePayload)
            .eq('id', purchase.seller_id)
        }
      } catch (earnErr) {
        console.warn('Could not update seller earnings:', earnErr)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment approved successfully. Buyer now has full access.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. ACTION: reject-order
    if (action === 'reject-order') {
      const { purchase_id, reason } = body
      if (!purchase_id) throw new Error('Purchase ID is required')

      const { data: purchase, error: pErr } = await supabaseClient
        .from('purchases')
        .select('*')
        .eq('id', purchase_id)
        .single()

      if (pErr || !purchase) {
        throw new Error('Purchase record not found')
      }

      if (purchase.seller_id !== user.id) {
        const { data: adminProfile } = await supabaseClient
          .from('admin_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (adminProfile?.role !== 'super_admin') {
          throw new Error('You are not authorized to reject this purchase')
        }
      }

      const updatedResponse = {
        ...(purchase.gateway_response || {}),
        rejection_reason: reason || 'Payment could not be verified by seller',
        rejected_at: new Date().toISOString()
      }

      const { error: rejectErr } = await supabaseClient
        .from('purchases')
        .update({
          status: 'failed',
          gateway_response: updatedResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchase_id)

      if (rejectErr) throw new Error(rejectErr.message)

      return new Response(
        JSON.stringify({ success: true, message: 'Order rejected.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error: any) {
    console.error('Error in manage-manual-payment function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
