import { supabase } from './supabaseClient'

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

async function callFunction(functionName, payload) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Payment processing failed')
  }

  return data
}

export async function createStripeSession(promptId, testMode = false) {
  try {
    const data = await callFunction('create-stripe-session', { prompt_id: promptId, test_mode: testMode })
    return data
  } catch (error) {
    console.error('Stripe session creation failed:', error)
    throw error
  }
}

export async function createJazzCashSession(promptId, testMode = false) {
  try {
    const data = await callFunction('create-jazzcash-session', { prompt_id: promptId, test_mode: testMode })
    return data
  } catch (error) {
    console.error('JazzCash session creation failed:', error)
    throw error
  }
}

export async function createEasypaisaSession(promptId, testMode = false) {
  try {
    const data = await callFunction('create-easypaisa-session', { prompt_id: promptId, test_mode: testMode })
    return data
  } catch (error) {
    console.error('Easypaisa session creation failed:', error)
    throw error
  }
}

export async function getSellerPaymentCredentials(promptId, sellerId) {
  try {
    // Try via edge function first
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const data = await callFunction('manage-manual-payment', {
        action: 'get-seller-credentials',
        prompt_id: promptId,
        seller_id: sellerId
      })
      return data?.payout_details || {}
    }

    // Fallback: direct public query if unauthenticated
    let targetSellerId = sellerId
    if (!targetSellerId && promptId) {
      const { data: prompt } = await supabase
        .from('prompts')
        .select('seller_id')
        .eq('id', promptId)
        .single()
      targetSellerId = prompt?.seller_id
    }

    if (!targetSellerId) return {}

    const { data: profile } = await supabase
      .from('seller_profiles')
      .select('payout_details')
      .eq('id', targetSellerId)
      .maybeSingle()

    return profile?.payout_details || {}
  } catch (err) {
    console.warn('Could not fetch seller credentials:', err)
    return {}
  }
}

export async function submitManualPaymentProof({
  promptId,
  paymentMethod,
  transactionId,
  screenshotUrl,
  senderNumber,
  notes
}) {
  return await callFunction('manage-manual-payment', {
    action: 'submit-payment',
    prompt_id: promptId,
    payment_method: paymentMethod,
    transaction_id: transactionId,
    screenshot_url: screenshotUrl,
    sender_number: senderNumber,
    notes: notes
  })
}

export async function getSellerOrders() {
  const data = await callFunction('manage-manual-payment', {
    action: 'get-seller-orders'
  })
  return data?.orders || []
}

export async function approveManualOrder(purchaseId) {
  return await callFunction('manage-manual-payment', {
    action: 'approve-order',
    purchase_id: purchaseId
  })
}

export async function rejectManualOrder(purchaseId, reason) {
  return await callFunction('manage-manual-payment', {
    action: 'reject-order',
    purchase_id: purchaseId,
    reason: reason
  })
}

export async function redirectToPaymentGateway(paymentData, paymentMethod) {
  // Create a form and submit it programmatically for JazzCash/Easypaisa
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = paymentData.payment_url
  form.target = '_self'

  Object.keys(paymentData.form_data).forEach(key => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = paymentData.form_data[key]
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

export function getPaymentMethods() {
  return [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Pay with international credit or debit card',
      icon: '💳',
      currency: 'USD',
      available: true
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      description: 'Pay with JazzCash mobile wallet',
      icon: '📱',
      currency: 'PKR',
      available: true
    },
    {
      id: 'easypaisa',
      name: 'Easypaisa',
      description: 'Pay with Easypaisa mobile wallet',
      icon: '📲',
      currency: 'PKR',
      available: true
    }
  ]
}

export function formatCurrency(amount, currency = 'PKR') {
  if (currency === 'PKR') {
    return `Rs. ${amount.toLocaleString()}`
  } else if (currency === 'USD') {
    return `$${amount.toLocaleString()}`
  }
  return `${amount.toLocaleString()} ${currency}`
}

export function convertPKRToUSD(pkrAmount, rate = 0.0036) {
  return Math.max(Math.ceil(pkrAmount * rate * 100) / 100, 1) // Minimum $1.00
}