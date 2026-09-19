import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2022-11-15',
    })

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

    // Convert PKR to USD (using approximate rate - in production, use real-time rate)
    const PKR_TO_USD_RATE = 0.0036 // Approximate rate, should be fetched from API
    const priceInUSD = Math.max(Math.ceil(prompt.price * PKR_TO_USD_RATE * 100), 100) // Minimum $1.00

    // Clean up any existing pending/incomplete purchase record for this buyer and prompt
    await supabaseClient
      .from('purchases')
      .delete()
      .eq('buyer_id', user.user.id)
      .eq('prompt_id', prompt.id)
      .neq('status', 'completed')

    // Create purchase record
    const purchaseId = crypto.randomUUID()
    const sellerId = prompt.seller_id || user.user.id

    const { error: purchaseError } = await supabaseClient
      .from('purchases')
      .insert([{
        id: purchaseId,
        buyer_id: user.user.id,
        prompt_id: prompt.id,
        seller_id: sellerId,
        payment_method: 'stripe',
        amount: prompt.price, // Store original PKR amount
        currency: 'PKR',
        status: 'pending'
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: prompt.title,
              description: 'Premium AI Prompt from PromptVault',
            },
            unit_amount: priceInUSD,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/prompt/${prompt.id}?payment=success`,
      cancel_url: `${req.headers.get('origin')}/prompt/${prompt.id}?payment=cancelled`,
      metadata: {
        prompt_id: prompt.id,
        purchase_id: purchaseId,
        buyer_id: user.user.id,
        seller_id: prompt.seller_id,
        original_amount_pkr: prompt.price.toString(),
      },
    })

    return new Response(
      JSON.stringify({ 
        session_url: session.url,
        session_id: session.id,
        purchase_id: purchaseId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Stripe session creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})