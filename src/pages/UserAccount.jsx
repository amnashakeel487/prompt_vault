import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, LogOut, Heart, Send, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import SEO from '../components/SEO'
import PromptCard from '../components/PromptCard'
import { usePublicAuth } from '../context/PublicAuthContext'
import { getUserFavorites } from '../services/favoritesService'
import { getUserRequestStatus, submitTeamMemberRequest } from '../services/teamRequestsService'
import { getCategories } from '../services/promptService'
import { formatPrompt } from '../services/promptService'

export default function UserAccount() {
  const { user, signOut } = usePublicAuth()
  const [favorites, setFavorites] = useState([])
  const [categories, setCategories] = useState([])
  const [teamRequest, setTeamRequest] = useState(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({
    categoryId: '',
    message: ''
  })
  const [loading, setLoading] = useState({
    favorites: true,
    teamRequest: true,
    submitting: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      const [favoritesData, categoriesData, requestData] = await Promise.all([
        getUserFavorites(user.id).catch(() => []),
        getCategories().catch(() => []),
        getUserRequestStatus(user.id).catch(() => null)
      ])

      setFavorites(favoritesData.map(formatPrompt))
      setCategories(categoriesData)
      setTeamRequest(requestData)
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setLoading({ favorites: false, teamRequest: false, submitting: false })
    }
  }

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
          <div className="border-t border-line pt-6">
            <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
              <Users size={20} />
              Team Member Status
            </h3>
            
            {loading.teamRequest ? (
              <div className="text-ink-muted">Loading...</div>
            ) : teamRequest ? (
              <div className={`p-4 rounded-xl border ${
                teamRequest.status === 'approved' 
                  ? 'border-cyan/30 bg-cyan/10' 
                  : teamRequest.status === 'pending'
                  ? 'border-amber/30 bg-amber/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {teamRequest.status === 'approved' && <CheckCircle2 size={16} className="text-cyan" />}
                  {teamRequest.status === 'pending' && <AlertCircle size={16} className="text-amber" />}
                  {teamRequest.status === 'rejected' && <AlertCircle size={16} className="text-red-400" />}
                  <span className={`font-medium capitalize ${
                    teamRequest.status === 'approved' ? 'text-cyan' :
                    teamRequest.status === 'pending' ? 'text-amber' : 'text-red-400'
                  }`}>
                    {teamRequest.status}
                  </span>
                </div>
                <p className="text-sm text-ink-muted">
                  {teamRequest.status === 'approved' && 'You are a team member! '}
                  {teamRequest.status === 'pending' && 'Your request is being reviewed. '}
                  {teamRequest.status === 'rejected' && 'Your previous request was not approved. '}
                  Category: {teamRequest.categories?.name || 'Any'}
                </p>
                {teamRequest.status === 'approved' && (
                  <Link 
                    to="/admin/dashboard" 
                    className="inline-block mt-2 text-cyan hover:text-ink transition-colors text-sm"
                  >
                    Go to Admin Dashboard →
                  </Link>
                )}
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
        </div>

        {/* Favorites Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Heart size={24} className="text-red-400" />
            <h2 className="font-display text-xl font-semibold text-ink">
              My Favorites ({favorites.length})
            </h2>
          </div>

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
      </div>
    </section>
  )
}