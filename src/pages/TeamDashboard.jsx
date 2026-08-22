import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, LogOut, Plus, Eye, Clock, CheckCircle, XCircle, Edit3, 
  Tag, FileText, Image, AlertCircle, Save, X
} from 'lucide-react'
import SEO from '../components/SEO'
import { usePublicAuth } from '../context/PublicAuthContext'
import { supabase } from '../services/supabaseClient'
import { uploadImageToGitHub } from '../services/githubUpload'
import { extractVariables } from '../utils/variableParser'

export default function TeamDashboard() {
  const { user, profile, isCategoryAdmin, assignedCategoryId, assignedCategoryName, signOut, loading } = usePublicAuth()
  const navigate = useNavigate()
  
  const [prompts, setPrompts] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt: '',
    tags: [],
    tagInput: '',
    image: null,
    seoTitle: '',
    seoDescription: ''
  })
  const [isLoading, setIsLoading] = useState({
    prompts: true,
    submitting: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Redirect if not a category admin
  useEffect(() => {
    if (!loading && user && !isCategoryAdmin) {
      navigate('/account', { replace: true })
    }
  }, [user, isCategoryAdmin, loading, navigate])

  useEffect(() => {
    if (isCategoryAdmin && assignedCategoryId) {
      loadData()
    }
  }, [isCategoryAdmin, assignedCategoryId])

  const loadData = async () => {
    if (!assignedCategoryId) return

    setIsLoading(prev => ({ ...prev, prompts: true }))
    
    try {
      // Load user's prompts (only for their assigned category and authored by them)
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('author', user.id)
        .eq('category_id', assignedCategoryId)
        .order('created_at', { ascending: false })

      if (promptsError) throw promptsError
      setPrompts(promptsData || [])

      // Load categories for reference
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(prev => ({ ...prev, prompts: false }))
    }
  }

  const handleAddPrompt = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(prev => ({ ...prev, submitting: true }))

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Parse variables from prompt
      const variables = extractVariables(formData.prompt)

      // Handle image upload if provided
      let imageUrl = null
      if (formData.image) {
        try {
          imageUrl = await uploadImageToGitHub(formData.image)
        } catch (imageErr) {
          console.warn('Image upload failed, proceeding without image:', imageErr)
        }
      }

      // Create prompt
      const promptData = {
        title: formData.title,
        slug: slug,
        description: formData.description,
        prompt: formData.prompt,
        category_id: assignedCategoryId,
        tags: formData.tags,
        variables: variables,
        author: user.id,
        status: 'pending', // Team members can only create pending prompts
        image: imageUrl,
        seo_title: formData.seoTitle || formData.title,
        seo_description: formData.seoDescription || formData.description,
        views: 0,
        copies: 0,
        created_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('prompts')
        .insert([promptData])

      if (insertError) throw insertError

      setSuccess('Prompt submitted for review!')
      setShowAddForm(false)
      resetForm()
      await loadData()

    } catch (err) {
      console.error('Error adding prompt:', err)
      setError(err.message || 'Failed to add prompt')
    } finally {
      setIsLoading(prev => ({ ...prev, submitting: false }))
    }
  }

  const handleEditPrompt = async (e) => {
    e.preventDefault()
    if (!editingPrompt) return

    setError('')
    setSuccess('')
    setIsLoading(prev => ({ ...prev, submitting: true }))

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Parse variables from prompt
      const variables = extractVariables(formData.prompt)

      // Handle image upload if provided
      let imageUrl = editingPrompt.image
      if (formData.image) {
        try {
          imageUrl = await uploadImageToGitHub(formData.image)
        } catch (imageErr) {
          console.warn('Image upload failed, keeping existing image:', imageErr)
        }
      }

      // Update prompt
      const promptData = {
        title: formData.title,
        slug: slug,
        description: formData.description,
        prompt: formData.prompt,
        tags: formData.tags,
        variables: variables,
        status: 'pending', // Reset to pending when edited
        image: imageUrl,
        seo_title: formData.seoTitle || formData.title,
        seo_description: formData.seoDescription || formData.description,
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('prompts')
        .update(promptData)
        .eq('id', editingPrompt.id)
        .eq('author', user.id) // Extra security check

      if (updateError) throw updateError

      setSuccess('Prompt updated and resubmitted for review!')
      setEditingPrompt(null)
      resetForm()
      await loadData()

    } catch (err) {
      console.error('Error updating prompt:', err)
      setError(err.message || 'Failed to update prompt')
    } finally {
      setIsLoading(prev => ({ ...prev, submitting: false }))
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prompt: '',
      tags: [],
      tagInput: '',
      image: null,
      seoTitle: '',
      seoDescription: ''
    })
  }

  const startEditing = (prompt) => {
    if (prompt.status === 'published') return // Can't edit published prompts
    
    setFormData({
      title: prompt.title,
      description: prompt.description,
      prompt: prompt.prompt,
      tags: prompt.tags || [],
      tagInput: '',
      image: null, // Don't pre-fill image, user needs to upload new one if changing
      seoTitle: prompt.seo_title || '',
      seoDescription: prompt.seo_description || ''
    })
    setEditingPrompt(prompt)
  }

  const addTag = () => {
    const tag = formData.tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagInput: ''
      }))
    }
  }

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="text-green-500" size={16} />
      case 'rejected':
        return <XCircle className="text-red-500" size={16} />
      default:
        return <Clock className="text-amber-500" size={16} />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'published':
        return 'Published'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Pending Review'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'rejected':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      default:
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
      </div>
    )
  }

  if (!user || !isCategoryAdmin) {
    return null // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-base">
      <SEO title="Team Dashboard" description="Category Admin Dashboard" />
      
      {/* Header */}
      <div className="border-b border-line">
        <div className="section-pad py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Team Dashboard
              </h1>
              <p className="text-ink-muted text-sm mt-1">
                Category: <span className="text-violet-soft font-medium">{assignedCategoryName || 'Loading...'}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-ink-muted hover:text-ink transition-colors text-sm"
              >
                ← Back to PromptVault
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-pad py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        {/* Add New Prompt Button */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-semibold text-ink">Your Prompts</h2>
          {!showAddForm && !editingPrompt && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Prompt
            </button>
          )}
        </div>

        {/* Add/Edit Prompt Form */}
        {(showAddForm || editingPrompt) && (
          <div className="mb-8 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-ink">
                {editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingPrompt(null)
                  resetForm()
                }}
                className="text-ink-muted hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingPrompt ? handleEditPrompt : handleAddPrompt} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-ink-muted mb-2 text-sm font-medium">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter prompt title..."
                  required
                  className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-ink-muted mb-2 text-sm font-medium">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this prompt does..."
                  required
                  rows={3}
                  className="w-full rounded-xl border border-line px-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none resize-none bg-white/[0.03]"
                />
              </div>

              {/* Prompt Content */}
              <div>
                <label className="block text-ink-muted mb-2 text-sm font-medium">
                  Prompt Content *
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter your prompt here... Use {{variable_name}} for variables."
                  required
                  rows={8}
                  className="w-full rounded-xl border border-line px-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none resize-none bg-white/[0.03]"
                />
                <p className="text-xs text-ink-faint mt-2">
                  Variables detected: {extractVariables(formData.prompt).join(', ') || 'None'}
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-ink-muted mb-2 text-sm font-medium">
                  Tags
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={formData.tagInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-xl border border-line px-4 py-2 focus:border-violet focus:outline-none bg-white/[0.03] text-ink text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="btn-secondary !py-2 !px-4 text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-violet/20 text-violet-soft px-3 py-1 rounded-full text-xs border border-violet/30"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-ink-muted mb-2 text-sm font-medium">
                  Featured Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                  className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-violet/20 file:text-violet-soft hover:file:bg-violet/30"
                />
              </div>

              {/* SEO Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-ink-muted mb-2 text-sm font-medium">
                    SEO Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="SEO optimized title..."
                    className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-2 text-sm font-medium">
                    SEO Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="SEO meta description..."
                    className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading.submitting}
                  className="btn-primary flex items-center gap-2"
                >
                  {isLoading.submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {editingPrompt ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingPrompt ? 'Update Prompt' : 'Submit for Review'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingPrompt(null)
                    resetForm()
                  }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Prompts List */}
        {isLoading.prompts ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent mx-auto mb-4" />
            <p className="text-ink-muted">Loading your prompts...</p>
          </div>
        ) : prompts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FileText size={48} className="text-ink-faint mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-ink mb-2">
              No prompts yet
            </h3>
            <p className="text-ink-muted mb-6">
              Create your first prompt to get started as a team member.
            </p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus size={16} />
                Add Your First Prompt
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {prompts.map(prompt => (
              <div key={prompt.id} className="glass-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {prompt.title}
                      </h3>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(prompt.status)}`}>
                        {getStatusIcon(prompt.status)}
                        {getStatusText(prompt.status)}
                      </div>
                    </div>
                    
                    <p className="text-ink-muted text-sm mb-3">
                      {prompt.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-ink-faint">
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {prompt.views || 0} views
                      </span>
                      <span>
                        Created {new Date(prompt.created_at).toLocaleDateString()}
                      </span>
                      {prompt.updated_at && prompt.updated_at !== prompt.created_at && (
                        <span>
                          Updated {new Date(prompt.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {prompt.status === 'rejected' && (
                      <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 text-xs">
                          <AlertCircle size={12} className="inline mr-1" />
                          Rejection reason: {prompt.rejection_reason || 'No reason provided'}
                        </p>
                      </div>
                    )}

                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {prompt.tags.slice(0, 5).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 bg-violet/10 text-violet-soft px-2 py-0.5 rounded-full text-xs border border-violet/20"
                          >
                            <Tag size={8} />
                            {tag}
                          </span>
                        ))}
                        {prompt.tags.length > 5 && (
                          <span className="text-ink-faint text-xs">+{prompt.tags.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {prompt.status !== 'published' && (
                      <button
                        onClick={() => startEditing(prompt)}
                        className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    )}
                    {prompt.status === 'published' && (
                      <Link
                        to={`/prompt/${prompt.slug}`}
                        className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}