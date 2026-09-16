import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify Easypaisa response hash
async function verifyEasypaisaResponse(data: Record<string, string>, secretKey: string, receivedHash: string): Promise<boolean> {
  // Easypaisa verification hash format (response)
  const hashFields = [
    data.orderId,
    data.storeId, 
    data.amount,
    data.transactionType,
    data.transactionId || '',
    data.responseCode || '',
    secretKey
  ].filter(field => field !== null && field !== undefined && field !== '')
  
  const hashString = hashFields.join('')
  console.log('Easypaisa verification hash string:', hashString)
  
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
    console.log('Easypaisa callback received')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const secretKey = Deno.env.get('EASYPAISA_SECRET_KEY')!

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

    console.log('Easypaisa response data:', responseData)

    const {
      orderId,
      transactionId,
      responseCode,
      responseDesc,
      merchantHashedResp,
      amount,
      storeId,
      transactionType,
      customField1, // buyer_id
      customField2, // prompt_id  
      customField3, // purchase_id
      customField4  // seller_id
    } = responseData

    if (!orderId || !merchantHashedResp) {
      console.error('Missing required Easypaisa response parameters')
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the hash - CRITICAL for security
    const isValidHash = await verifyEasypaisaResponse(responseData, secretKey, merchantHashedResp)
    
    if (!isValidHash) {
      console.error('Invalid Easypaisa hash verification')
      return new Response(
        JSON.stringify({ error: 'Invalid hash verification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Easypaisa hash verification successful')

    // Find the purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('purchases')
      .select('*')
      .eq('gateway_transaction_id', orderId)
      .eq('payment_method', 'easypaisa')
      .single()

    if (purchaseError || !purchase) {
      console.error('Purchase not found:', orderId)
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if payment was successful (Easypaisa success codes may vary)
    const isSuccess = responseCode === '0000' || responseCode === '00' // Common success codes
    const newStatus = isSuccess ? 'completed' : 'failed'

    console.log(`Payment ${isSuccess ? 'successful' : 'failed'} for purchase:`, purchase.id)

    // Update purchase record
    const { error: updateError } = await supabaseClient
      .from('purchases')
      .update({
        status: newStatus,
        gateway_response: {
          orderId,
          transactionId,
          responseCode,
          responseDesc,
          amount,
          storeId,
          transactionType,
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
        : `${req.headers.get('origin') || 'https://promptvault.com'}/prompt/${purchase.prompt_id}?payment=failed&error=${encodeURIComponent(responseDesc || 'Payment failed')}`
      
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
        message: responseDesc || 'Payment processed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Easypaisa callback error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})