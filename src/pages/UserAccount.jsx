import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, LogOut, Heart, Send, AlertCircle, CheckCircle2, Users, ShieldCheck, DollarSign, ShoppingBag, ToggleLeft, ToggleRight, TrendingUp, Package, Plus, X, Loader2, ExternalLink, Tag } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import { usePublicAuth } from '../context/PublicAuthContext'
import { getUserFavorites } from '../services/favoritesService'
import { getUserRequestStatus, submitTeamMemberRequest } from '../services/teamRequestsService'
import { getCategories, getSubcategories, formatPrompt } from '../services/promptService'
import { getSellerProfile, createSellerProfile, getSellerEarnings, getUserPurchases, getSellerPrompts, createPaidPrompt } from '../services/sellerService'
import { formatCurrency } from '../services/paymentService'
import { extractVariables } from '../utils/variableParser'

export default function UserAccount() {
  const { user, signOut, isCategoryAdmin, assignedCategoryName, refreshProfile } = usePublicAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [purchases, setPurchases] = useState([])
  const [categories, setCategories] = useState([])
  const [teamRequest, setTeamRequest] = useState(null)
  const [sellerProfile, setSellerProfile] = useState(null)
  const [sellerEarnings, setSellerEarnings] = useState(null)
  const [sellerPrompts, setSellerPrompts] = useState([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showCreatePromptModal, setShowCreatePromptModal] = useState(false)
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [activeTab, setActiveTab] = useState('favorites') // favorites, purchases, seller
  const [requestForm, setRequestForm] = useState({
    categoryId: '',
    message: ''
  })
  const [promptForm, setPromptForm] = useState({
    title: '',
    slug: '',
    categoryId: '',
    subcategoryId: '',
    price: '',
    description: '',
    prompt: '',
    tags: '',
    featuredImage: ''
  })
  const [loading, setLoading] = useState({
    favorites: true,
    purchases: false,
    teamRequest: true,
    seller: false,
    sellerPrompts: false,
    submitting: false,
    becomingSeller: false,
    submittingPrompt: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Don't automatically redirect approved team members - let them choose when to go to dashboard
  // useEffect(() => {
  //   if (isCategoryAdmin && user) {
  //     navigate('/team/dashboard', { replace: true })
  //   }
  // }, [isCategoryAdmin, user, navigate])

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      const [favoritesData, categoriesData, requestData, sellerData] = await Promise.all([
        getUserFavorites(user.id).catch(() => []),
        getCategories().catch(() => []),
        getUserRequestStatus(user.id).catch(() => null),
        getSellerProfile(user.id).catch(() => null)
      ])

      setFavorites(favoritesData.map(formatPrompt))
      setCategories(categoriesData)
      setTeamRequest(requestData)
      setSellerProfile(sellerData)

      // Refresh the PublicAuth profile to check if user became a category admin
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setLoading(prev => ({ ...prev, favorites: false, teamRequest: false }))
    }
  }

  const loadPurchases = async () => {
    if (!user || loading.purchases) return

    setLoading(prev => ({ ...prev, purchases: true }))
    try {
      const purchasesData = await getUserPurchases(user.id)
      setPurchases(purchasesData)
    } catch (err) {
      console.error('Error loading purchases:', err)
    } finally {
      setLoading(prev => ({ ...prev, purchases: false }))
    }
  }

  const loadSellerEarnings = async () => {
    if (!user || !sellerProfile || loading.seller) return

    setLoading(prev => ({ ...prev, seller: true }))
    try {
      const earningsData = await getSellerEarnings(user.id)
      setSellerEarnings(earningsData)
    } catch (err) {
      console.error('Error loading seller earnings:', err)
    } finally {
      setLoading(prev => ({ ...prev, seller: false }))
    }
  }

  const loadSellerPrompts = async () => {
    if (!user) return
    setLoading(prev => ({ ...prev, sellerPrompts: true }))
    try {
      const data = await getSellerPrompts(user.id)
      setSellerPrompts(data || [])
    } catch (err) {
      console.error('Error loading seller prompts:', err)
    } finally {
      setLoading(prev => ({ ...prev, sellerPrompts: false }))
    }
  }

  const handleCategoryChange = async (categoryId) => {
    setPromptForm(prev => ({ ...prev, categoryId, subcategoryId: '' }))
    if (!categoryId) {
      setSubcategoriesList([])
      return
    }
    try {
      const subs = await getSubcategories(categoryId)
      setSubcategoriesList(subs || [])
    } catch (err) {
      console.warn('Error fetching subcategories:', err)
      setSubcategoriesList([])
    }
  }

  const handleCreatePaidPrompt = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const priceNum = Number(promptForm.price)
    if (!promptForm.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!promptForm.categoryId) {
      setError('Please select a category.')
      return
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price in PKR (greater than 0).')
      return
    }
    if (!promptForm.prompt.trim()) {
      setError('Prompt content cannot be empty.')
      return
    }

    setLoading(prev => ({ ...prev, submittingPrompt: true }))

    try {
      const baseSlug = (promptForm.slug.trim() || promptForm.title.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      const slug = baseSlug ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}` : `prompt-${Date.now()}`

      const parsedVars = extractVariables(promptForm.prompt)
      const parsedTags = promptForm.tags
        ? promptForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : []

      await createPaidPrompt({
        title: promptForm.title.trim(),
        slug,
        category_id: promptForm.categoryId,
        subcategory_id: promptForm.subcategoryId || null,
        description: promptForm.description.trim() || promptForm.title.trim(),
        prompt: promptForm.prompt.trim(),
        price: priceNum,
        seller_id: user.id,
        variables: parsedVars,
        tags: parsedTags,
        featured_image: promptForm.featuredImage.trim() || null,
        author: user.email?.split('@')[0] || 'Seller'
      })

      setSuccess('🎉 Your paid prompt has been submitted for admin review! Once approved, it will be listed in the Marketplace.')
      setShowCreatePromptModal(false)
      setPromptForm({
        title: '',
        slug: '',
        categoryId: '',
        subcategoryId: '',
        price: '',
        description: '',
        prompt: '',
        tags: '',
        featuredImage: ''
      })
      await loadSellerPrompts()
    } catch (err) {
      console.error('Error creating paid prompt:', err)
      setError(err.message || 'Failed to submit paid prompt. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, submittingPrompt: false }))
    }
  }

  const handleBecomeSeller = async () => {
    setLoading(prev => ({ ...prev, becomingSeller: true }))
    setError('')
    setSuccess('')

    try {
      const newSellerProfile = await createSellerProfile(user.id)
      setSellerProfile(newSellerProfile)
      setSuccess('Congratulations! You are now a seller. You can start creating paid prompts.')
    } catch (err) {
      console.error('Error becoming seller:', err)
      setError('Failed to become a seller. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, becomingSeller: false }))
    }
  }

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'purchases' && purchases.length === 0) {
      loadPurchases()
    } else if (activeTab === 'seller' && sellerProfile) {
      if (!sellerEarnings) loadSellerEarnings()
      loadSellerPrompts()
    }
  }, [activeTab, user, sellerProfile])

  const handleTeamRequest = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(prev => ({ ...prev, submitting: true }))

    try {
      await submitTeamMemberRequest({
        requestedCategoryId: requestForm.categoryId || null,
        message: requestForm.message
      })
      
      setSuccess('Team member request submitted successfully!')
      setShowRequestForm(false)
      setRequestForm({ categoryId: '', message: '' })
      await loadData() // Refresh request status
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }))
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (!user) {
    return (
      <section className="section-pad py-20">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink mb-4">
            Please sign in to access your account
          </h1>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad py-8 sm:py-12">
      <SEO 
        title="My Account | PromptVault" 
        description="Manage your PromptVault account, favorites, and team member requests" 
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Account Header */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet/20 border border-violet/30 text-violet-soft">
                <User size={24} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-ink">My Account</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Mail size={16} className="text-ink-muted" />
                  <span className="text-ink-muted">{user.email}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="btn-ghost flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

          {/* Team Member Status/Request */}
          <div className="border-t border-line pt-6 mb-6">
            <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
              <Users size={20} />
              Team Member Status
            </h3>
            
            {loading.teamRequest ? (
              <div className="text-ink-muted text-sm">Loading...</div>
            ) : isCategoryAdmin || (teamRequest && teamRequest.status === 'approved') ? (
              <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span className="font-medium text-green-400">🎉 Congratulations! You're Now a Team Member</span>
                </div>
                <p className="text-sm text-ink-muted mb-4">
                  Your team member request has been approved! You now have access to the contributor dashboard where you can:
                </p>
                <ul className="text-xs text-ink-muted mb-4 space-y-1 pl-4">
                  <li>• Create and submit new prompts for review</li>
                  <li>• Manage your submitted prompts</li>
                  <li>• Track approval status and feedback</li>
                  <li>• Contribute to the {assignedCategoryName || teamRequest?.categories?.name || 'assigned'} category</li>
                </ul>
                <Link 
                  to="/team/dashboard" 
                  className="inline-flex items-center gap-1.5 btn-primary !py-2 !px-4 text-xs"
                >
                  Open Team Dashboard →
                </Link>
              </div>
            ) : teamRequest ? (
              <div className={`p-4 rounded-xl border ${
                teamRequest.status === 'pending'
                  ? 'border-amber/30 bg-amber/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {teamRequest.status === 'pending' && <AlertCircle size={16} className="text-amber" />}
                  {teamRequest.status === 'rejected' && <AlertCircle size={16} className="text-red-400" />}
                  <span className={`font-medium capitalize ${
                    teamRequest.status === 'pending' ? 'text-amber' : 'text-red-400'
                  }`}>
                    {teamRequest.status}
                  </span>
                </div>
                <p className="text-sm text-ink-muted mb-3">
                  {teamRequest.status === 'pending' && 'Your request is being reviewed. '}
                  {teamRequest.status === 'rejected' && 'Your previous request was not approved. '}
                  Category: {teamRequest.categories?.name || 'Any'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-ink-muted text-sm">
                  Want to contribute prompts and help grow the community? Request to become a team member.
                </p>
                
                {!showRequestForm ? (
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Send size={16} />
                    Request Team Member Access
                  </button>
                ) : (
                  <form onSubmit={handleTeamRequest} className="space-y-4 border border-line rounded-xl p-4">
                    <div>
                      <label className="block text-ink-muted mb-2 text-sm font-medium">
                        Preferred Category (Optional)
                      </label>
                      <select
                        value={requestForm.categoryId}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink"
                      >
                        <option value="">Any Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-ink-muted mb-2 text-sm font-medium">
                        Message (Optional)
                      </label>
                      <textarea
                        value={requestForm.message}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us about your experience or why you'd like to contribute..."
                        rows={3}
                        className="w-full rounded-xl border border-line px-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none resize-none bg-white/[0.03]"
                      />
                    </div>

                    {error && (
                      <div className="text-red-400 text-sm">{error}</div>
                    )}

                    {success && (
                      <div className="text-cyan text-sm">{success}</div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading.submitting}
                        className="btn-primary flex items-center gap-2"
                      >
                        {loading.submitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRequestForm(false)}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Seller Status — only shown to regular users; team members manage seller features from their Team Dashboard */}
          {isCategoryAdmin ? (
            <div className="border-t border-line pt-6">
              <div className="p-4 rounded-xl border border-violet/20 bg-violet/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-ink flex items-center gap-2 mb-1">
                    <ShoppingBag size={16} className="text-violet-soft" />
                    {sellerProfile ? '🎉 Seller features active' : 'Want to sell prompts?'}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {sellerProfile
                      ? 'Your seller dashboard, listings, and earnings are all inside the Team Dashboard.'
                      : 'You can become a seller and manage paid listings from inside your Team Dashboard.'}
                  </p>
                </div>
                <Link
                  to="/team/dashboard"
                  className="inline-flex items-center gap-1.5 btn-primary !py-2 !px-4 text-xs whitespace-nowrap shrink-0"
                >
                  Open Team Dashboard →
                </Link>
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-6">
              <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
                <ShoppingBag size={20} />
                Seller Status
              </h3>
            
              {sellerProfile ? (
                <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <span className="font-medium text-green-400">🎉 You're a Seller!</span>
                  </div>
                  <p className="text-sm text-ink-muted mb-4">
                    You can now create and sell paid prompts. All paid prompts require admin approval before they become available for purchase.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab('seller')}
                      className="inline-flex items-center gap-1.5 btn-primary !py-2 !px-4 text-xs"
                    >
                      View Seller Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('seller')
                        setShowCreatePromptModal(true)
                      }}
                      className="inline-flex items-center gap-1.5 btn-ghost !py-2 !px-4 text-xs"
                    >
                      Create Paid Prompt →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-ink-muted text-sm">
                    Become a seller to create and monetize premium prompts. Earn money from your expertise and creativity.
                  </p>
                  <div className="flex items-center justify-between p-4 border border-line rounded-xl">
                    <div>
                      <div className="font-medium text-ink">Become a Seller</div>
                      <div className="text-sm text-ink-muted">Start selling prompts and earn money</div>
                    </div>
                    <button
                      onClick={handleBecomeSeller}
                      disabled={loading.becomingSeller}
                      className="btn-primary flex items-center gap-2"
                    >
                      {loading.becomingSeller ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <DollarSign size={16} />
                          Become Seller
                        </>
                      )}
                    </button>
                  </div>
                
                  {error && (
                    <div className="text-red-400 text-sm">{error}</div>
                  )}

                  {success && (
                    <div className="text-green-400 text-sm">{success}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabbed Content */}
        <div>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-line">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-violet/20 text-violet-soft border border-violet/30'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
              }`}
            >
              <Heart size={16} />
              Favorites ({favorites.length})
            </button>
            
            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'purchases'
                  ? 'bg-violet/20 text-violet-soft border border-violet/30'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
              }`}
            >
              <Package size={16} />
              Purchases ({purchases.length})
            </button>
            
            {sellerProfile && !isCategoryAdmin && (
              <button
                onClick={() => setActiveTab('seller')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'seller'
                    ? 'bg-violet/20 text-violet-soft border border-violet/30'
                    : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
                }`}
              >
                <TrendingUp size={16} />
                Seller Dashboard
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'favorites' && (
            <div>
              {loading.favorites ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card p-6 animate-pulse">
                      <div className="h-4 bg-white/10 rounded mb-3"></div>
                      <div className="h-3 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 bg-white/10 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Heart size={48} className="text-ink-faint mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-ink mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-ink-muted mb-6">
                    Start exploring prompts and save your favorites to see them here.
                  </p>
                  <Link to="/" className="btn-primary">
                    Browse Prompts
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {favorites.map((prompt, index) => (
                    <PromptCard key={prompt.id} prompt={prompt} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div>
              {loading.purchases ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card p-6 animate-pulse">
                      <div className="h-4 bg-white/10 rounded mb-3"></div>
                      <div className="h-3 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 bg-white/10 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Package size={48} className="text-ink-faint mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-ink mb-2">
                    No purchases yet
                  </h3>
                  <p className="text-ink-muted mb-6">
                    Browse the marketplace and purchase premium prompts to see them here.
                  </p>
                  <Link to="/marketplace" className="btn-primary">
                    Browse Marketplace
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="glass-card p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link 
                            to={`/prompt/${purchase.prompts.slug}`}
                            className="font-display text-lg font-semibold text-ink hover:text-violet transition-colors"
                          >
                            {purchase.prompts.title}
                          </Link>
                          <div className="flex items-center gap-4 mt-2 text-sm text-ink-muted">
                            <span>Purchased: {new Date(purchase.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="text-green-400 font-medium">{formatCurrency(purchase.amount)}</span>
                            <span>•</span>
                            <span className="capitalize">{purchase.payment_method}</span>
                          </div>
                        </div>
                        <Link 
                          to={`/prompt/${purchase.prompts.slug}`}
                          className="btn-ghost !py-2 !px-4 text-sm"
                        >
                          View Prompt
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'seller' && sellerProfile && (
            <div>
              {loading.seller ? (
                <div className="glass-card p-6 animate-pulse">
                  <div className="h-6 bg-white/10 rounded mb-4"></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-white/10 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Earnings Overview */}
                  {sellerEarnings && (
                    <div className="glass-card p-6">
                      <h3 className="font-display text-xl font-semibold text-ink mb-6">Earnings Overview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 border border-violet/30">
                          <div className="text-2xl font-bold text-ink">{formatCurrency(sellerEarnings.total_earnings || 0)}</div>
                          <div className="text-sm text-ink-muted">Total Earnings</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/[0.03] border border-line">
                          <div className="text-2xl font-bold text-ink">{sellerEarnings.total_sales || 0}</div>
                          <div className="text-sm text-ink-muted">Total Sales</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/[0.03] border border-line">
                          <div className="text-2xl font-bold text-ink">{formatCurrency(sellerEarnings.stripe_earnings || 0, 'USD')}</div>
                          <div className="text-sm text-ink-muted">Stripe Earnings</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/[0.03] border border-line">
                          <div className="text-2xl font-bold text-ink">{formatCurrency((sellerEarnings.jazzcash_earnings || 0) + (sellerEarnings.easypaisa_earnings || 0))}</div>
                          <div className="text-sm text-ink-muted">Local Payments</div>
                        </div>
                      </div>
                      <div className="mt-6 p-4 rounded-xl bg-amber/10 border border-amber/30">
                        <p className="text-sm text-amber-200">
                          <strong>Note:</strong> Payouts are processed manually by the admin team. Please contact support for payout requests.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent Sales */}
                  {sellerEarnings?.recent_purchases && sellerEarnings.recent_purchases.length > 0 && (
                    <div className="glass-card p-6">
                      <h3 className="font-display text-lg font-semibold text-ink mb-4">Recent Sales</h3>
                      <div className="space-y-3">
                        {sellerEarnings.recent_purchases.map((purchase) => (
                          <div key={purchase.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-line">
                            <div>
                              <div className="font-medium text-ink">{purchase.prompts.title}</div>
                              <div className="text-sm text-ink-muted">
                                {new Date(purchase.created_at).toLocaleDateString()} • {purchase.payment_method}
                              </div>
                            </div>
                            <div className="text-green-400 font-medium">{formatCurrency(purchase.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* My Listings */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink">My Listings</h3>
                        <p className="text-xs text-ink-muted">Manage your paid prompts and track their approval status</p>
                      </div>
                      <button
                        onClick={() => setShowCreatePromptModal(true)}
                        className="btn-primary flex items-center gap-2 !py-2 !px-4 text-xs"
                      >
                        <Plus size={16} />
                        Create Paid Prompt
                      </button>
                    </div>

                    {loading.sellerPrompts ? (
                      <div className="py-8 text-center text-ink-muted flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-violet-soft" />
                        <span>Loading your listings...</span>
                      </div>
                    ) : sellerPrompts.length === 0 ? (
                      <div className="text-center py-10 border border-line/60 border-dashed rounded-xl p-6">
                        <ShoppingBag size={32} className="mx-auto text-ink-faint mb-2" />
                        <h4 className="font-display font-medium text-ink text-sm mb-1">No paid listings yet</h4>
                        <p className="text-xs text-ink-muted mb-4 max-w-sm mx-auto">
                          Create and monetize your first premium prompt. Once approved by our team, it will appear on the Marketplace.
                        </p>
                        <button
                          onClick={() => setShowCreatePromptModal(true)}
                          className="btn-primary !py-2 !px-4 text-xs inline-flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          Create Your First Prompt
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sellerPrompts.map((p) => (
                          <div
                            key={p.id}
                            className="p-4 rounded-xl bg-white/[0.02] border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-line/80"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-ink text-sm sm:text-base">{p.title}</span>
                                {p.categories?.name && (
                                  <span className="chip !py-0.5 !text-[10px]">{p.categories.name}</span>
                                )}
                              </div>
                              <p className="text-xs text-ink-muted line-clamp-1">{p.description}</p>
                              <div className="flex items-center gap-3 text-[11px] text-ink-faint font-mono">
                                <span>{p.purchase_count || 0} purchases</span>
                                <span>•</span>
                                <span>Submitted {new Date(p.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <div className="text-right">
                                <div className="font-bold text-cyan text-sm">{formatCurrency(p.price)}</div>
                              </div>

                              {/* Status Badge */}
                              {p.sale_status === 'approved' && (
                                <span className="chip !border-green-500/40 !bg-green-500/15 !text-green-400 text-xs flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Live
                                </span>
                              )}
                              {p.sale_status === 'pending_approval' && (
                                <span className="chip !border-amber/40 !bg-amber/15 !text-amber text-xs flex items-center gap-1">
                                  <AlertCircle size={12} /> In Review
                                </span>
                              )}
                              {p.sale_status === 'rejected' && (
                                <span className="chip !border-red-500/40 !bg-red-500/15 !text-red-400 text-xs flex items-center gap-1">
                                  <AlertCircle size={12} /> Rejected
                                </span>
                              )}

                              {p.sale_status === 'approved' && (
                                <Link
                                  to={`/prompt/${p.slug}`}
                                  target="_blank"
                                  className="btn-ghost !p-2 text-ink-muted hover:text-ink"
                                  title="View on site"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Paid Prompt Modal */}
          {showCreatePromptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-line">
                  <div>
                    <h3 className="font-display font-semibold text-ink text-base sm:text-lg flex items-center gap-2">
                      <DollarSign size={20} className="text-violet-soft" />
                      Create Paid Prompt
                    </h3>
                    <p className="text-xs text-ink-muted">Set your price in PKR and submit for super admin review</p>
                  </div>
                  <button
                    onClick={() => setShowCreatePromptModal(false)}
                    className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreatePaidPrompt} className="p-6 space-y-4 overflow-y-auto">
                  {/* Title & Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Prompt Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={promptForm.title}
                        onChange={(e) => setPromptForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Master High-Converting Facebook Ads"
                        className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Price (PKR) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={promptForm.price}
                        onChange={(e) => setPromptForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="e.g. 1500"
                        className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet"
                      />
                      <span className="text-[10px] text-ink-faint">
                        Local buyers pay in PKR. International buyers pay USD equivalent via Stripe.
                      </span>
                    </div>
                  </div>

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Category <span className="text-red-400">*</span>
                      </label>
                      <select
                        required
                        value={promptForm.categoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-violet"
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Subcategory (Optional)
                      </label>
                      <select
                        value={promptForm.subcategoryId}
                        onChange={(e) => setPromptForm(prev => ({ ...prev, subcategoryId: e.target.value }))}
                        disabled={!promptForm.categoryId || subcategoriesList.length === 0}
                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-violet disabled:opacity-50"
                      >
                        <option value="">None / General</option>
                        {subcategoriesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Short Description
                    </label>
                    <textarea
                      rows={2}
                      value={promptForm.description}
                      onChange={(e) => setPromptForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Briefly explain what this prompt delivers and why it is valuable..."
                      className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet"
                    />
                  </div>

                  {/* Prompt Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-ink">
                        Prompt Content <span className="text-red-400">*</span>
                      </label>
                      <span className="text-[10px] text-violet-soft font-mono">
                        Tip: Wrap placeholders like {`{{Audience}}`}
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      required
                      value={promptForm.prompt}
                      onChange={(e) => setPromptForm(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Write your high-value prompt here. Use {{Variable_Name}} for customizable inputs..."
                      className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint font-mono outline-none focus:border-violet"
                    />
                    <span className="text-[10px] text-ink-muted">
                      This content will be locked and blurred behind the paywall until purchased.
                    </span>
                  </div>

                  {/* Tags & Featured Image */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={promptForm.tags}
                        onChange={(e) => setPromptForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="marketing, ads, copywriting"
                        className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Featured Image URL (optional)
                      </label>
                      <input
                        type="url"
                        value={promptForm.featuredImage}
                        onChange={(e) => setPromptForm(prev => ({ ...prev, featuredImage: e.target.value }))}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-violet/10 border border-violet/20 text-xs text-ink-muted space-y-1">
                    <p className="font-semibold text-violet-soft">
                      ℹ️ Submission & Review Policy
                    </p>
                    <p>
                      Your prompt will enter the pending review queue. Super admins verify prompt quality before it goes live. Payouts are tracked on your dashboard and disbursed manually.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreatePromptModal(false)}
                      className="btn-ghost !py-2.5 !px-5 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading.submittingPrompt}
                      className="btn-primary !py-2.5 !px-6 text-xs flex items-center gap-2"
                    >
                      {loading.submittingPrompt ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Submit for Approval
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}