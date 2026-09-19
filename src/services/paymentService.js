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