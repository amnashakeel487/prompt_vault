import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Easypaisa API endpoints
const EASYPAISA_SANDBOX_URL = 'https://easypaisa.sandbox.com/easypay'
const EASYPAISA_LIVE_URL = 'https://easypaisa.com.pk/easypay'

// Generate secure hash for Easypaisa (similar to JazzCash but different format)
async function generateEasypaisaHash(data: Record<string, string>, secretKey: string): Promise<string> {
  // Easypaisa hash format: concatenate specific fields in order
  const hashFields = [
    data.orderId,
    data.storeId, 
    data.amount,
    data.transactionType,
    data.mobileAccountNumber || '',
    data.emailAddress || '',
    secretKey
  ].filter(field => field !== null && field !== undefined && field !== '')
  
  const hashString = hashFields.join('')
  console.log('Easypaisa hash string:', hashString)
  
  // Create SHA256 hash
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashString))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex.toUpperCase()
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt_id } = await req.json()

    if (!prompt_id) {
      return new Response(
        JSON.stringify({ error: 'prompt_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get prompt details from database - NEVER trust client-side price
    const { data: prompt, error: promptError } = await supabaseClient
      .from('prompts')
      .select('id, title, price, seller_id, is_paid, sale_status, status')
      .eq('id', prompt_id)
      .eq('status', 'published')
      .eq('is_paid', true)
      .eq('sale_status', 'approved')
      .single()

    if (promptError || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt not found or not available for purchase' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!prompt.price || prompt.price <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already purchased this prompt
    const { data: existingPurchase } = await supabaseClient
      .from('purchases')
      .select('id')
      .eq('buyer_id', user.user.id)
      .eq('prompt_id', prompt_id)
      .eq('status', 'completed')
      .single()

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: 'You have already purchased this prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Easypaisa configuration
    const storeId = Deno.env.get('EASYPAISA_STORE_ID')!
    const secretKey = Deno.env.get('EASYPAISA_SECRET_KEY')!
    const isLive = Deno.env.get('EASYPAISA_ENVIRONMENT') === 'live'

    // Create purchase record first
    const purchaseId = crypto.randomUUID()
    const orderId = `EP${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const { error: purchaseError } = await supabaseClient
      .from('purchases')
      .insert([{
        id: purchaseId,
        buyer_id: user.user.id,
        prompt_id: prompt.id,
        seller_id: prompt.seller_id,
        payment_method: 'easypaisa',
        amount: prompt.price,
        currency: 'PKR',
        status: 'pending',
        gateway_transaction_id: orderId
      }])

    if (purchaseError) {
      console.error('Purchase creation error:', purchaseError)
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Easypaisa payment parameters
    const amount = prompt.price.toFixed(2)
    
    const paymentData = {
      orderId: orderId,
      storeId: storeId,
      amount: amount,
      transactionType: 'MA', // Mobile Account
      mobileAccountNumber: '', // Will be filled by customer
      emailAddress: user.user.email || '',
      merchantHashedReq: '', // Will be calculated below
      postBackURL: `${req.headers.get('origin')}/api/easypaisa-callback`,
      customerName: user.user.user_metadata?.full_name || 'Customer',
      productName: `PromptVault - ${prompt.title.substring(0, 50)}`,
      expiryDate: new Date(Date.now() + (30 * 60 * 1000)).toISOString(), // 30 minutes from now
      // Custom fields for our use
      customField1: user.user.id, // Buyer ID
      customField2: prompt.id, // Prompt ID
      customField3: purchaseId, // Purchase ID
      customField4: prompt.seller_id, // Seller ID
    }

    // Generate secure hash
    paymentData.merchantHashedReq = await generateEasypaisaHash(paymentData, secretKey)

    console.log('Easypaisa payment data:', paymentData)

    // Return payment form data for client-side submission
    return new Response(
      JSON.stringify({
        success: true,
        payment_url: isLive ? EASYPAISA_LIVE_URL : EASYPAISA_SANDBOX_URL,
        form_data: paymentData,
        purchase_id: purchaseId,
        order_id: orderId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Easypaisa session creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})