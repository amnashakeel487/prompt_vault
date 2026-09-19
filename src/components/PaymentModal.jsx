import { useState, useEffect, useRef } from 'react'
import { X, CreditCard, Smartphone, DollarSign, Lock, Loader2, AlertTriangle, CheckCircle2, Copy, Check, Upload, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  createStripeSession, 
  getSellerPaymentCredentials, 
  submitManualPaymentProof, 
  formatCurrency, 
  convertPKRToUSD 
} from '../services/paymentService'

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  prompt, 
  onPaymentSuccess 
}) {
  const [selectedMethod, setSelectedMethod] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  // Seller credentials
  const [sellerCredentials, setSellerCredentials] = useState(null)
  const [loadingCredentials, setLoadingCredentials] = useState(false)

  // Manual payment fields
  const [transactionId, setTransactionId] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [screenshotData, setScreenshotData] = useState(null)
  const fileInputRef = useRef(null)

  // Fetch seller credentials whenever modal opens for a prompt
  useEffect(() => {
    if (isOpen && prompt) {
      setSubmittedSuccess(false)
      setSelectedMethod('')
      setError('')
      setTransactionId('')
      setSenderNumber('')
      setNotes('')
      setScreenshotPreview(null)
      setScreenshotData(null)
      setLoadingCredentials(true)

      getSellerPaymentCredentials(prompt.id, prompt.seller_id || prompt.sellerId)
        .then((creds) => {
          setSellerCredentials(creds || {})
        })
        .catch((err) => {
          console.warn('Failed to load seller credentials:', err)
          setSellerCredentials({})
        })
        .finally(() => {
          setLoadingCredentials(false)
        })
    }
  }, [isOpen, prompt])

  const copyToClipboard = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(''), 2500)
  }

  // Client-side image compression
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, JPEG, etc.)')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image file is too large (maximum 15MB)')
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const maxDimension = 1200
        let width = img.width
        let height = img.height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        setScreenshotPreview(compressedBase64)
        setScreenshotData(compressedBase64)
      }
    }
    reader.readAsDataURL(file)
  }

  const paymentMethods = [
    {
      id: 'jazzcash',
      name: 'JazzCash',
      description: 'Transfer to seller\'s JazzCash wallet & upload receipt',
      icon: <Smartphone size={22} />,
      currency: 'PKR',
      available: true,
      displayPrice: formatCurrency(prompt?.price || 0)
    },
    {
      id: 'easypaisa',
      name: 'Easypaisa',
      description: 'Transfer to seller\'s Easypaisa wallet & upload receipt',
      icon: <Smartphone size={22} />,
      currency: 'PKR',
      available: true,
      displayPrice: formatCurrency(prompt?.price || 0)
    },
    {
      id: 'stripe',
      name: 'Credit / Debit Card',
      description: 'Instant card payment via Stripe checkout',
      icon: <CreditCard size={22} />,
      currency: 'USD',
      available: true,
      displayPrice: formatCurrency(convertPKRToUSD(prompt?.price || 0), 'USD')
    }
  ]

  // Submit manual proof (JazzCash / Easypaisa)
  const handleSubmitManualProof = async (e) => {
    e?.preventDefault()
    if (!transactionId.trim()) {
      setError('Please enter the Transaction ID (TID) from your payment receipt.')
      return
    }
    if (!screenshotData) {
      setError('Please upload a screenshot of your payment transfer.')
      return
    }

    setProcessing(true)
    setError('')

    try {
      await submitManualPaymentProof({
        promptId: prompt.id,
        paymentMethod: selectedMethod,
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotData,
        senderNumber: senderNumber.trim(),
        notes: notes.trim()
      })

      setSubmittedSuccess(true)
      onPaymentSuccess && onPaymentSuccess()
    } catch (err) {
      console.error('Failed to submit manual payment:', err)
      setError(err.message || 'Failed to submit payment verification. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  // Handle Stripe redirect
  const handleStripePayment = async () => {
    setProcessing(true)
    setError('')
    try {
      const result = await createStripeSession(prompt.id, false)
      window.location.href = result.session_url
    } catch (err) {
      console.error('Stripe initialization failed:', err)
      setError(err.message || 'Payment initialization failed. Please try again.')
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  // Active method details
  const isManualMethod = selectedMethod === 'jazzcash' || selectedMethod === 'easypaisa'
  const currentTitle = selectedMethod === 'jazzcash' 
    ? sellerCredentials?.jazzcash_title 
    : sellerCredentials?.easypaisa_title
  const currentNumber = selectedMethod === 'jazzcash' 
    ? sellerCredentials?.jazzcash_number 
    : sellerCredentials?.easypaisa_number
  const hasConfiguredAccount = Boolean(currentNumber && currentTitle)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-line bg-surface/50">
            <div className="flex items-center gap-3">
              {selectedMethod && !submittedSuccess && (
                <button
                  onClick={() => {
                    setSelectedMethod('')
                    setError('')
                  }}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
                  title="Back to payment methods"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="p-2 rounded-xl bg-violet/15 border border-violet/30 text-violet-soft">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-ink text-base sm:text-lg">
                  {submittedSuccess ? 'Proof Submitted' : selectedMethod ? `Pay with ${selectedMethod === 'jazzcash' ? 'JazzCash' : selectedMethod === 'easypaisa' ? 'Easypaisa' : 'Card'}` : 'Purchase Prompt'}
                </h3>
                <p className="text-xs text-ink-muted">
                  {submittedSuccess ? 'Waiting for seller verification' : 'Secure marketplace checkout'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
            {/* Success State Screen */}
            {submittedSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-ink">Payment Proof Submitted!</h4>
                  <p className="text-xs sm:text-sm text-ink-muted mt-2 max-w-sm mx-auto leading-relaxed">
                    The prompt owner has been notified of your payment with Transaction ID <span className="text-violet-soft font-mono font-medium">{transactionId}</span>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-violet/10 border border-violet/20 text-xs text-ink-muted text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span>Prompt:</span>
                    <span className="font-medium text-ink">{prompt?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium text-violet-soft">{formatCurrency(prompt?.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="chip !py-0.5 !px-2 !text-[11px] !border-amber/40 !bg-amber/15 !text-amber">
                      Pending Seller Approval
                    </span>
                  </div>
                </div>

                <p className="text-xs text-ink-faint">
                  Once the seller verifies your screenshot, this prompt will unlock for lifetime access on your account.
                </p>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="btn-primary w-full max-w-xs mx-auto py-2.5 text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : !selectedMethod ? (
              /* Step 1: Select Payment Method */
              <div className="space-y-5">
                {prompt && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-line">
                    <div className="font-medium text-ink text-sm sm:text-base line-clamp-1">{prompt.title}</div>
                    <div className="text-xs text-ink-muted line-clamp-2 mt-1">{prompt.description}</div>
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-line/60">
                      <span className="text-xs text-ink-muted font-medium">Price</span>
                      <span className="text-lg font-bold text-violet-soft">{formatCurrency(prompt.price)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Select How You Want to Pay
                  </label>

                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id)
                        setError('')
                      }}
                      className="w-full p-4 rounded-xl border border-line hover:border-violet/60 bg-white/[0.02] hover:bg-violet/[0.04] transition-all text-left group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-violet/10 border border-violet/20 text-violet-soft group-hover:scale-105 transition-transform">
                          {method.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink text-sm">{method.name}</span>
                            {(method.id === 'jazzcash' || method.id === 'easypaisa') && (
                              <span className="chip !py-0.2 !px-1.5 !text-[10px] !border-green-500/30 !bg-green-500/10 !text-green-400">
                                Direct Wallet
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ink-muted line-clamp-1 mt-0.5">{method.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-ink text-sm">{method.displayPrice}</div>
                          {method.currency === 'USD' && (
                            <div className="text-[11px] text-ink-muted">≈ {formatCurrency(prompt?.price || 0)}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-start gap-2">
                  <Lock size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Your payment details and screenshots are directly reviewed by the prompt seller for rapid approval.
                  </span>
                </div>
              </div>
            ) : isManualMethod ? (
              /* Step 2: Direct JazzCash / Easypaisa Manual Payment Form */
              <div className="space-y-5">
                {/* Method Header with Price */}
                <div className="p-4 rounded-xl bg-violet/10 border border-violet/25 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet/20 text-violet-soft">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">
                        {selectedMethod === 'jazzcash' ? 'JazzCash Direct Transfer' : 'Easypaisa Direct Transfer'}
                      </div>
                      <div className="text-xs text-ink-muted">Transfer exact amount to seller</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-muted">Amount Due</div>
                    <div className="text-base font-bold text-violet-soft">{formatCurrency(prompt?.price)}</div>
                  </div>
                </div>

                {/* Seller Account Credentials Card */}
                {loadingCredentials ? (
                  <div className="p-6 rounded-xl border border-line text-center text-xs text-ink-muted flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-violet-soft" />
                    <span>Loading seller account details...</span>
                  </div>
                ) : !hasConfiguredAccount ? (
                  <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 text-amber text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Seller Account Not Yet Configured
                    </div>
                    <p className="text-amber-200/80 leading-relaxed">
                      The seller has not yet added their {selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} mobile wallet number. You can still submit your payment details or choose another method.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-line space-y-3">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      Seller {selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Account
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Account Title */}
                      <div className="p-3 rounded-lg bg-surface border border-line/80">
                        <div className="text-[11px] text-ink-muted mb-1">Account Title (Name)</div>
                        <div className="font-medium text-ink text-sm select-all">{currentTitle}</div>
                      </div>

                      {/* Account Number with Copy Button */}
                      <div className="p-3 rounded-lg bg-surface border border-line/80 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-ink-muted mb-1">Mobile / Account Number</div>
                          <div className="font-mono font-bold text-violet-soft text-sm select-all">{currentNumber}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentNumber, 'account_num')}
                          className="btn-ghost !p-2 text-ink-muted hover:text-violet-soft"
                          title="Copy number"
                        >
                          {copiedField === 'account_num' ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-400 font-medium">
                              <Check size={14} /> Copied
                            </span>
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    {sellerCredentials?.payment_instructions && (
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-line/60 text-[11px] text-ink-muted">
                        <span className="font-medium text-ink">Instructions: </span>
                        {sellerCredentials.payment_instructions}
                      </div>
                    )}
                  </div>
                )}

                {/* Transfer Steps */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-line text-xs space-y-1.5 text-ink-muted">
                  <div className="font-medium text-ink mb-1">Instructions:</div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-violet/20 text-violet-soft flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span>Send <strong className="text-ink">{formatCurrency(prompt?.price)}</strong> to the account above via your {selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} app.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-violet/20 text-violet-soft flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span>Copy the <strong className="text-ink">Transaction ID (TID)</strong> from the confirmation SMS or receipt screen.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-violet/20 text-violet-soft flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <span>Upload a screenshot of the payment receipt and click Submit.</span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleSubmitManualProof} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Transaction ID (TID) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 14457891230"
                      className="input w-full font-mono text-sm"
                      required
                    />
                    <p className="text-[11px] text-ink-faint mt-1">Found in your payment SMS or confirmation screen</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Sender Mobile Number / Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="e.g. 0300-1234567 or Ali Khan"
                      className="input w-full text-sm"
                    />
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Payment Screenshot Receipt <span className="text-red-400">*</span>
                    </label>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {screenshotPreview ? (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-line flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={screenshotPreview}
                            alt="Receipt Preview"
                            className="w-14 h-14 object-cover rounded-lg border border-line"
                          />
                          <div>
                            <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-green-400" /> Screenshot Attached
                            </div>
                            <div className="text-[11px] text-ink-faint mt-0.5">Ready for verification</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotPreview(null)
                            setScreenshotData(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="btn-ghost !p-2 text-ink-muted hover:text-red-400 text-xs"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-5 rounded-xl border border-dashed border-line hover:border-violet/60 bg-white/[0.01] hover:bg-violet/[0.02] text-center transition-all group"
                      >
                        <Upload size={22} className="mx-auto text-ink-muted group-hover:text-violet-soft transition-colors mb-1.5" />
                        <div className="text-xs font-medium text-ink">Click to upload payment screenshot</div>
                        <div className="text-[11px] text-ink-faint mt-0.5">PNG, JPG, or JPEG (Max 15MB)</div>
                      </button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('')}
                      disabled={processing}
                      className="btn-ghost flex-1 text-xs sm:text-sm py-2.5"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={processing || !transactionId.trim() || !screenshotData}
                      className="btn-primary flex-1 text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Submit Payment Proof
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Stripe International Card Checkout */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-line space-y-2">
                  <div className="font-semibold text-ink text-sm">International Card Checkout</div>
                  <p className="text-xs text-ink-muted">
                    Pay securely with any Visa, Mastercard, or American Express credit/debit card via Stripe.
                  </p>
                  <div className="pt-2 flex justify-between items-center text-sm font-bold text-ink">
                    <span>Total USD:</span>
                    <span className="text-violet-soft">{formatCurrency(convertPKRToUSD(prompt?.price || 0), 'USD')}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('')}
                    disabled={processing}
                    className="btn-ghost flex-1 text-xs sm:text-sm py-2.5"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStripePayment}
                    disabled={processing}
                    className="btn-primary flex-1 text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Pay with Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}