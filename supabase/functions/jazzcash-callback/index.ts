import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate secure hash for verification
async function verifyJazzCashResponse(data: Record<string, string>, integritySalt: string, receivedHash: string): Promise<boolean> {
  // Remove the hash from data for verification
  const verificationData = { ...data }
  delete verificationData.pp_SecureHash

  // Sort keys and create hash string
  const sortedKeys = Object.keys(verificationData).sort()
  let hashString = ''
  
  for (const key of sortedKeys) {
    if (verificationData[key] !== null && verificationData[key] !== undefined && verificationData[key] !== '') {
      hashString += `&${verificationData[key]}`
    }
  }
  
  hashString += `&${integritySalt}`
  hashString = hashString.substring(1) // Remove first &
  
  console.log('Verification hash string:', hashString)
  
  // Create SHA256 hash
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashString))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  
  console.log('Computed hash:', computedHash)
  console.log('Received hash:', receivedHash)
  
  return computedHash === receivedHash
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('JazzCash callback received')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const integritySalt = Deno.env.get('JAZZCASH_INTEGRITY_SALT')!

    let responseData: Record<string, string>

    // Handle both POST (callback) and GET (return URL) requests
    if (req.method === 'POST') {
      const formData = await req.formData()
      responseData = {}
      for (const [key, value] of formData.entries()) {
        responseData[key] = value.toString()
      }
    } else {
      const url = new URL(req.url)
      responseData = {}
      for (const [key, value] of url.searchParams.entries()) {
        responseData[key] = value
      }
    }

    console.log('JazzCash response data:', responseData)

    const {
      pp_TxnRefNo,
      pp_ResponseCode,
      pp_ResponseMessage,
      pp_SecureHash,
      pp_Amount,
      pp_TxnCurrency,
      pp_BillReference,
      ppmpf_1, // buyer_id
      ppmpf_2, // prompt_id  
      ppmpf_3, // purchase_id
      ppmpf_4  // seller_id
    } = responseData

    if (!pp_TxnRefNo || !pp_SecureHash) {
      console.error('Missing required JazzCash response parameters')
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the hash - CRITICAL for security
    const isValidHash = await verifyJazzCashResponse(responseData, integritySalt, pp_SecureHash)
    
    if (!isValidHash) {
      console.error('Invalid JazzCash hash verification')
      return new Response(
        JSON.stringify({ error: 'Invalid hash verification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('JazzCash hash verification successful')

    // Find the purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('purchases')
      .select('*')
      .eq('gateway_transaction_id', pp_TxnRefNo)
      .eq('payment_method', 'jazzcash')
      .single()

    if (purchaseError || !purchase) {
      console.error('Purchase not found:', pp_TxnRefNo)
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if payment was successful
    const isSuccess = pp_ResponseCode === '000' // JazzCash success code
    const newStatus = isSuccess ? 'completed' : 'failed'

    console.log(`Payment ${isSuccess ? 'successful' : 'failed'} for purchase:`, purchase.id)

    // Update purchase record
    const { error: updateError } = await supabaseClient
      .from('purchases')
      .update({
        status: newStatus,
        gateway_response: {
          pp_TxnRefNo,
          pp_ResponseCode,
          pp_ResponseMessage,
          pp_Amount,
          pp_TxnCurrency,
          pp_BillReference,
          full_response: responseData,
          processed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', purchase.id)

    if (updateError) {
      console.error('Error updating purchase:', updateError)
      return new Response(
        JSON.stringify({ error: 'Database update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Purchase updated successfully:', purchase.id)

    // If this is a GET request (return URL), redirect to success/failure page
    if (req.method === 'GET') {
      const redirectUrl = isSuccess 
        ? `${req.headers.get('origin') || 'https://promptvault.com'}/prompt/${purchase.prompt_id}?payment=success`
        : `${req.headers.get('origin') || 'https://promptvault.com'}/prompt/${purchase.prompt_id}?payment=failed&error=${encodeURIComponent(pp_ResponseMessage || 'Payment failed')}`
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl,
          ...corsHeaders
        }
      })
    }

    // For POST requests (server-to-server callback), return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        purchase_id: purchase.id,
        status: newStatus,
        message: pp_ResponseMessage || 'Payment processed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('JazzCash callback error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})