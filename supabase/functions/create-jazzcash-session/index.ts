import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// JazzCash API endpoints
const JAZZCASH_SANDBOX_URL = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
const JAZZCASH_LIVE_URL = 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'

// Generate secure hash for JazzCash
async function generateJazzCashHash(data: Record<string, string>, integritySalt: string): Promise<string> {
  // Sort keys and create hash string
  const sortedKeys = Object.keys(data).sort()
  let hashString = ''
  
  for (const key of sortedKeys) {
    if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
      hashString += `&${data[key]}`
    }
  }
  
  hashString += `&${integritySalt}`
  hashString = hashString.substring(1) // Remove first &
  
  console.log('Hash string:', hashString)
  
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

    const { prompt_id, test_mode } = await req.json()

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

    // Clean up any existing pending/incomplete purchase record for this buyer and prompt
    await supabaseClient
      .from('purchases')
      .delete()
      .eq('buyer_id', user.user.id)
      .eq('prompt_id', prompt.id)
      .neq('status', 'completed')

    // Create purchase record
    const purchaseId = crypto.randomUUID()
    const txnRefNo = `PV${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const sellerId = prompt.seller_id || user.user.id

    // Test mode: complete payment immediately and unlock prompt
    if (test_mode) {
      const { error: completeError } = await supabaseClient
        .from('purchases')
        .insert([{
          id: purchaseId,
          buyer_id: user.user.id,
          prompt_id: prompt.id,
          seller_id: sellerId,
          payment_method: 'jazzcash',
          amount: prompt.price,
          currency: 'PKR',
          status: 'completed',
          gateway_transaction_id: txnRefNo
        }])

      if (completeError) {
        return new Response(
          JSON.stringify({ error: `Failed to complete test purchase: ${completeError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          purchase_id: purchaseId,
          message: 'Payment completed successfully (Test Mode)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // JazzCash configuration (with sandbox defaults if not configured)
    const merchantId = Deno.env.get('JAZZCASH_MERCHANT_ID') || 'MC12345'
    const password = Deno.env.get('JAZZCASH_PASSWORD') || 'testpass'
    const integritySalt = Deno.env.get('JAZZCASH_INTEGRITY_SALT') || 'testsalt'
    const isLive = Deno.env.get('JAZZCASH_ENVIRONMENT') === 'live'
    
    const { error: purchaseError } = await supabaseClient
      .from('purchases')
      .insert([{
        id: purchaseId,
        buyer_id: user.user.id,
        prompt_id: prompt.id,
        seller_id: sellerId,
        payment_method: 'jazzcash',
        amount: prompt.price,
        currency: 'PKR',
        status: 'pending',
        gateway_transaction_id: txnRefNo
      }])

    if (purchaseError) {
      console.error('Purchase creation error:', purchaseError)
      return new Response(
        JSON.stringify({ 
          error: `Failed to create purchase record: ${purchaseError.message}`,
          details: purchaseError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Helper for PKT datetime (UTC+5) YYYYMMDDHHMMSS
    const now = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const expiry = new Date(Date.now() + (5 * 60 + 60) * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const txnDateTime = fmt(now)
    const expiryDateTime = fmt(expiry)
    const amount = (prompt.price * 100).toFixed(0) // paisa
    const origin = req.headers.get('origin') || 'https://prompt-vault-library.vercel.app'

    const paymentData: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: '', // Empty for Hosted Merchant Form
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_SubMerchantID: '',
      pp_Password: password,
      pp_BankID: 'TBANK',
      pp_ProductID: 'RETL',
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: `billRef${Date.now().toString().slice(-8)}`,
      pp_Description: 'PromptVaultPurchase',
      pp_TxnExpiryDateTime: expiryDateTime,
      pp_ReturnURL: `${origin}/prompt/${prompt.id}?payment=success`,
      pp_SecureHash: '',
      ppmpf_1: user.user.id,
      ppmpf_2: prompt.id,
      ppmpf_3: purchaseId,
      ppmpf_4: sellerId,
      ppmpf_5: ''
    }

    // Generate secure hash
    paymentData.pp_SecureHash = await generateJazzCashHash(paymentData, integritySalt)

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: isLive ? JAZZCASH_LIVE_URL : JAZZCASH_SANDBOX_URL,
        form_data: paymentData,
        purchase_id: purchaseId,
        transaction_ref: txnRefNo
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('JazzCash session creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})