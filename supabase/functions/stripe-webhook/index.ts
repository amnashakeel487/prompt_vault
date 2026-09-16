import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const body = await request.text()
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )

    console.log('Received webhook event:', event.type)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('Checkout session completed:', session.id)
        console.log('Session metadata:', session.metadata)

        if (!session.metadata?.purchase_id) {
          console.error('No purchase_id in session metadata')
          return new Response('No purchase_id in metadata', { status: 400 })
        }

        // Update purchase record to completed
        const { error: updateError } = await supabaseClient
          .from('purchases')
          .update({
            status: 'completed',
            gateway_transaction_id: session.id,
            gateway_response: {
              stripe_session_id: session.id,
              payment_intent_id: session.payment_intent,
              customer_email: session.customer_details?.email,
              amount_total: session.amount_total,
              currency: session.currency,
              payment_status: session.payment_status,
              completed_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.purchase_id)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Error updating purchase:', updateError)
          return new Response('Database update failed', { status: 500 })
        }

        console.log('Purchase marked as completed:', session.metadata.purchase_id)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.metadata?.purchase_id) {
          // Mark purchase as failed
          await supabaseClient
            .from('purchases')
            .update({
              status: 'failed',
              gateway_response: {
                stripe_session_id: session.id,
                reason: 'checkout_session_expired',
                expired_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', session.metadata.purchase_id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Find purchase by payment intent and mark as failed
        const { data: purchases } = await supabaseClient
          .from('purchases')
          .select('id')
          .eq('gateway_transaction_id', paymentIntent.id)

        if (purchases && purchases.length > 0) {
          await supabaseClient
            .from('purchases')
            .update({
              status: 'failed',
              gateway_response: {
                payment_intent_id: paymentIntent.id,
                last_payment_error: paymentIntent.last_payment_error,
                failed_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', purchases[0].id)
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, { status: 400 })
  }
})