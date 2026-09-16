# Supabase Edge Functions - Payment Processing

This directory contains the Supabase Edge Functions for handling payment processing for the PromptVault marketplace.

## Functions Overview

### Stripe Integration
- **create-stripe-session**: Creates Stripe checkout sessions for international card payments
- **stripe-webhook**: Handles Stripe webhooks to confirm payment completion

### JazzCash Integration  
- **create-jazzcash-session**: Creates JazzCash payment sessions for local PKR payments
- **jazzcash-callback**: Handles JazzCash payment callbacks and verification

### Easypaisa Integration
- **create-easypaisa-session**: Creates Easypaisa payment sessions for local PKR payments  
- **easypaisa-callback**: Handles Easypaisa payment callbacks and verification

## Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to your project
```bash
supabase link --project-ref your-project-ref
```

### 4. Set up environment variables
Copy the `.env.example` file to `.env` and fill in your credentials:

```bash
cp supabase/.env.example supabase/.env
```

### 5. Deploy functions
```bash
supabase functions deploy create-stripe-session
supabase functions deploy stripe-webhook  
supabase functions deploy create-jazzcash-session
supabase functions deploy jazzcash-callback
supabase functions deploy create-easypaisa-session
supabase functions deploy easypaisa-callback
```

### 6. Set environment secrets
```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# JazzCash
supabase secrets set JAZZCASH_MERCHANT_ID=your_merchant_id
supabase secrets set JAZZCASH_PASSWORD=your_password
supabase secrets set JAZZCASH_INTEGRITY_SALT=your_integrity_salt
supabase secrets set JAZZCASH_ENVIRONMENT=sandbox

# Easypaisa
supabase secrets set EASYPAISA_STORE_ID=your_store_id
supabase secrets set EASYPAISA_SECRET_KEY=your_secret_key
supabase secrets set EASYPAISA_ENVIRONMENT=sandbox
```

## Payment Gateway Setup

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Set up webhooks pointing to your `stripe-webhook` function URL
4. Required webhook events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

### JazzCash Setup  
1. Apply for a JazzCash merchant account at https://jazzcash.com.pk
2. Complete business verification process
3. Get your merchant credentials (Merchant ID, Password, Integrity Salt)
4. Configure callback URL to point to your `jazzcash-callback` function

### Easypaisa Setup
1. Apply for an Easypaisa merchant account  
2. Complete business verification process
3. Get your merchant credentials (Store ID, Secret Key)
4. Configure callback URL to point to your `easypaisa-callback` function

## Security Notes

⚠️ **Important Security Requirements:**

1. **Never expose secret keys in client-side code**
2. **All payment amounts are validated server-side** - client cannot spoof prices
3. **Hash verification is mandatory** for JazzCash/Easypaisa callbacks
4. **Stripe webhook signatures must be verified** before processing
5. **Purchases can only be marked complete by verified callbacks/webhooks**

## Testing

### Local Development
```bash
supabase functions serve
```

### Test with curl
```bash
# Test Stripe session creation
curl -X POST http://localhost:54321/functions/v1/create-stripe-session \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt_id": "your-prompt-id"}'

# Test JazzCash session creation  
curl -X POST http://localhost:54321/functions/v1/create-jazzcash-session \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt_id": "your-prompt-id"}'
```

## Function URLs

After deployment, your functions will be available at:
- `https://your-project-ref.functions.supabase.co/create-stripe-session`
- `https://your-project-ref.functions.supabase.co/stripe-webhook`
- `https://your-project-ref.functions.supabase.co/create-jazzcash-session`
- `https://your-project-ref.functions.supabase.co/jazzcash-callback`
- `https://your-project-ref.functions.supabase.co/create-easypaisa-session`
- `https://your-project-ref.functions.supabase.co/easypaisa-callback`