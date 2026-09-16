import { useState } from 'react'
import { X, CreditCard, Smartphone, DollarSign, Lock, Loader2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createStripeSession, createJazzCashSession, createEasypaisaSession, redirectToPaymentGateway, formatCurrency, convertPKRToUSD } from '../services/paymentService'

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  prompt, 
  onPaymentSuccess 
}) {
  const [selectedMethod, setSelectedMethod] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Pay with international credit or debit card',
      icon: <CreditCard size={24} />,
      currency: 'USD',
      available: true,
      displayPrice: formatCurrency(convertPKRToUSD(prompt?.price || 0), 'USD')
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      description: 'Pay with JazzCash mobile wallet',
      icon: <Smartphone size={24} />,
      currency: 'PKR',
      available: true,
      displayPrice: formatCurrency(prompt?.price || 0)
    },
    {
      id: 'easypaisa',
      name: 'Easypaisa',
      description: 'Pay with Easypaisa mobile wallet',
      icon: <Smartphone size={24} />,
      currency: 'PKR',
      available: true,
      displayPrice: formatCurrency(prompt?.price || 0)
    }
  ]

  const handlePayment = async () => {
    if (!selectedMethod || !prompt) return

    setProcessing(true)
    setError('')

    try {
      let result

      switch (selectedMethod) {
        case 'stripe':
          result = await createStripeSession(prompt.id)
          // Redirect to Stripe Checkout
          window.location.href = result.session_url
          break

        case 'jazzcash':
          result = await createJazzCashSession(prompt.id)
          // Redirect to JazzCash payment page
          redirectToPaymentGateway(result, 'jazzcash')
          break

        case 'easypaisa':
          result = await createEasypaisaSession(prompt.id)
          // Redirect to Easypaisa payment page
          redirectToPaymentGateway(result, 'easypaisa')
          break

        default:
          throw new Error('Invalid payment method')
      }

      // For successful session creation, we close the modal
      // The actual payment completion will be handled by webhooks/callbacks
      onClose()

    } catch (err) {
      console.error('Payment initialization failed:', err)
      setError(err.message || 'Payment initialization failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-surface border border-line rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet/20 border border-violet/30">
                <Lock size={18} className="text-violet-soft" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-ink">Purchase Prompt</h3>
                <p className="text-sm text-ink-muted">Choose your payment method</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {prompt && (
              <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-line">
                <div className="font-medium text-ink mb-1">{prompt.title}</div>
                <div className="text-sm text-ink-muted mb-3">{prompt.description}</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-violet-soft">{formatCurrency(prompt.price)}</span>
                  <span className="text-xs text-ink-muted">• Premium Prompt</span>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-ink mb-3">
                Select Payment Method
              </label>
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={!method.available || processing}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedMethod === method.id
                      ? 'border-violet bg-violet/10'
                      : 'border-line hover:border-violet/50 bg-white/[0.02]'
                  } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-ink-muted ${selectedMethod === method.id ? 'text-violet-soft' : ''}`}>
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-ink">{method.name}</div>
                      <div className="text-xs text-ink-muted">{method.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-ink">{method.displayPrice}</div>
                      {method.currency === 'USD' && (
                        <div className="text-xs text-ink-muted">
                          ≈ {formatCurrency(prompt?.price || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Security Notice */}
            <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-start gap-2">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>
                Your payment is secured with industry-standard encryption. After successful payment, 
                you'll have instant access to the full prompt.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={processing}
                className="flex-1 btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={!selectedMethod || processing}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    Pay Now
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}