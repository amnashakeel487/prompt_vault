import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, LogOut, Plus, Eye, Clock, CheckCircle, XCircle, Edit3, 
  Tag, FileText, Image, AlertCircle, Save, X, Menu, Home, BarChart3,
  TrendingUp, Zap, RefreshCw, Copy, Sun, Moon, Settings, HelpCircle,
  Layers, PenTool
} from 'lucide-react'
import SEO from '../components/SEO'
import { usePublicAuth } from '../context/PublicAuthContext'
import { supabase } from '../services/supabaseClient'
import { uploadImageToGitHub } from '../services/githubUpload'
import { extractVariables } from '../utils/variableParser'

export default function TeamDashboard() {
  const { user, profile, isCategoryAdmin, assignedCategoryId, assignedCategoryName, signOut, loading } = usePublicAuth()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('prompts') // 'prompts' | 'analytics' | 'profile'
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  const [stats, setStats] = useState({
    totalPrompts: 0,
    publishedPrompts: 0,
    pendingPrompts: 0,
    totalViews: 0,
    totalCopies: 0
  })

  // Theme Management
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

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
      const userPrompts = promptsData || []
      setPrompts(userPrompts)

      // Calculate stats
      const totalPrompts = userPrompts.length
      const publishedPrompts = userPrompts.filter(p => p.status === 'published').length
      const pendingPrompts = userPrompts.filter(p => p.status === 'pending').length
      const totalViews = userPrompts.reduce((sum, p) => sum + (p.views || 0), 0)
      const totalCopies = userPrompts.reduce((sum, p) => sum + (p.copies || 0), 0)

      setStats({
        totalPrompts,
        publishedPrompts,
        pendingPrompts,
        totalViews,
        totalCopies
      })

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
      <div className="min-h-screen bg-base text-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
          <p className="text-xs text-ink-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !isCategoryAdmin) {
    return null // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col md:flex-row">
      <SEO title="Team Dashboard | PromptVault" description="Team Member Dashboard for Content Creation" />
      
      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan text-white">
            <Zap size={14} />
          </span>
          <span className="font-display font-semibold text-sm text-ink">Team Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber" /> : <Moon size={16} className="text-violet" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface-2/95 backdrop-blur-2xl p-4 flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white shadow-glow">
                <Zap size={16} />
              </span>
              <div>
                <span className="font-display font-bold text-sm tracking-tight text-ink">PromptVault</span>
                <span className="block text-[10px] text-cyan font-mono uppercase tracking-wider">
                  Team Member
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-ink-faint hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          {/* Category Banner */}
          <div className="rounded-xl border border-violet/30 bg-violet/10 p-2.5">
            <p className="text-[10px] uppercase font-mono tracking-wider text-violet font-semibold">Your Category</p>
            <p className="text-xs font-semibold text-ink mt-0.5 truncate">{assignedCategoryName || 'Loading...'}</p>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setShowAddForm(true)
              setSidebarOpen(false)
            }}
            className="w-full bg-gradient-to-r from-violet to-violet-soft text-white py-2.5 px-4 rounded-full font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
          >
            <Plus size={15} /> Create Prompt
          </button>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('prompts')
                setSidebarOpen(false)
              }}
              className={`nav-item ${
                activeTab === 'prompts'
                  ? 'active border-l-2 border-l-violet bg-violet/10 text-violet-soft'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.04]'
              }`}
            >
              <FileText size={16} />
              <span className="font-medium">My Prompts</span>
              <span className={`chip !py-0.5 !text-[9px] !px-1.5 ml-auto ${
                stats.totalPrompts > 0 ? '!border-violet/40 !bg-violet/15 !text-violet' : '!border-line !bg-surface !text-ink-faint'
              }`}>
                {stats.totalPrompts}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics')
                setSidebarOpen(false)
              }}
              className={`nav-item ${
                activeTab === 'analytics'
                  ? 'active border-l-2 border-l-violet bg-violet/10 text-violet-soft'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.04]'
              }`}
            >
              <BarChart3 size={16} />
              <span className="font-medium">Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('profile')
                setSidebarOpen(false)
              }}
              className={`nav-item ${
                activeTab === 'profile'
                  ? 'active border-l-2 border-l-violet bg-violet/10 text-violet-soft'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.04]'
              }`}
            >
              <User size={16} />
              <span className="font-medium">Profile</span>
            </button>
          </nav>

          {/* Secondary Actions */}
          <div className="pt-4 border-t border-line/40 space-y-1">
            <Link
              to="/"
              className="nav-item text-ink-muted hover:text-ink hover:bg-white/[0.04]"
            >
              <Home size={16} />
              <span className="font-medium">Back to Site</span>
            </Link>
            
            <button
              onClick={toggleTheme}
              className="nav-item text-ink-muted hover:text-ink hover:bg-white/[0.04] md:flex"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="border-t border-line/40 pt-4">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white text-sm font-bold">
              {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink text-sm truncate">
                {profile?.display_name || user?.email?.split('@')[0] || 'Team Member'}
              </p>
              <p className="text-ink-faint text-xs truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-ink-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="border-b border-line bg-surface/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display font-semibold text-lg text-ink">
                    {activeTab === 'prompts' && 'My Prompts'}
                    {activeTab === 'analytics' && 'Analytics Overview'}
                    {activeTab === 'profile' && 'Profile Settings'}
                  </h1>
                </div>
                <div className="text-[11px] text-ink-muted font-mono uppercase tracking-wider">
                  {activeTab === 'prompts' && `Dashboard / Prompts Library`}
                  {activeTab === 'analytics' && `Dashboard / Performance Analytics`}
                  {activeTab === 'profile' && `Dashboard / Account Settings`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} />
                </button>
                {activeTab === 'prompts' && !showAddForm && !editingPrompt && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-violet to-violet-soft text-white py-2 px-4 rounded-full font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    <Plus size={14} /> New Prompt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-400 text-sm">{success}</p>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
                <X size={14} />
              </button>
            </div>
          )}
          
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-400 text-sm">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative glass-card p-4 overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <div className="p-1.5 rounded-lg bg-violet/20 text-violet-soft">
                      <FileText size={12} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint text-xs font-medium uppercase tracking-wider">Total Prompts</p>
                    <p className="text-2xl font-bold text-ink">{stats.totalPrompts}</p>
                    {stats.totalPrompts === 0 && (
                      <p className="text-green-400 text-xs flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Ready to start
                      </p>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-violet/10 rounded-full blur-xl" />
                </div>

                <div className="relative glass-card p-4 overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <div className="p-1.5 rounded-lg bg-green-500/20 text-green-400">
                      <CheckCircle size={12} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint text-xs font-medium uppercase tracking-wider">Published</p>
                    <p className="text-2xl font-bold text-ink">{stats.publishedPrompts}</p>
                    {stats.publishedPrompts > 0 && (
                      <p className="text-green-400 text-xs">Live on site</p>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-green-500/10 rounded-full blur-xl" />
                </div>

                <div className="relative glass-card p-4 overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <div className="p-1.5 rounded-lg bg-cyan/20 text-cyan">
                      <Eye size={12} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint text-xs font-medium uppercase tracking-wider">Total Views</p>
                    <p className="text-2xl font-bold text-ink">{stats.totalViews}</p>
                    {stats.totalViews > 0 && (
                      <p className="text-cyan text-xs">Great engagement!</p>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-cyan/10 rounded-full blur-xl" />
                </div>

                <div className="relative glass-card p-4 overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <div className="p-1.5 rounded-lg bg-amber/20 text-amber">
                      <Copy size={12} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-ink-faint text-xs font-medium uppercase tracking-wider">Total Copies</p>
                    <p className="text-2xl font-bold text-ink">{stats.totalCopies}</p>
                    {stats.totalCopies > 0 && (
                      <p className="text-amber text-xs">Users love it!</p>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber/10 rounded-full blur-xl" />
                </div>
              </div>
              {/* Add/Edit Prompt Form */}
              {(showAddForm || editingPrompt) && (
                <div className="glass-card overflow-hidden">
                  <div className="border-b border-line/40 bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet/20 text-violet-soft">
                          <PenTool size={16} />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-ink">
                            {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                          </h3>
                          <p className="text-ink-muted text-sm">
                            {editingPrompt ? 'Update your prompt content and resubmit for review' : 'Submit a new prompt for Super Admin approval'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingPrompt(null)
                          resetForm()
                        }}
                        className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={editingPrompt ? handleEditPrompt : handleAddPrompt} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Title */}
                      <div className="lg:col-span-2">
                        <label className="block text-ink-muted mb-2 text-sm font-medium">
                          Prompt Title *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter a descriptive title for your prompt..."
                          required
                          className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink placeholder:text-ink-faint transition-colors"
                        />
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-2">
                        <label className="block text-ink-muted mb-2 text-sm font-medium">
                          Description *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe what this prompt does and how it helps users..."
                          required
                          rows={3}
                          className="w-full rounded-xl border border-line px-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none resize-none bg-white/[0.03] transition-colors"
                        />
                      </div>

                      {/* Prompt Content */}
                      <div className="lg:col-span-2">
                        <label className="block text-ink-muted mb-2 text-sm font-medium">
                          Prompt Content *
                        </label>
                        <textarea
                          value={formData.prompt}
                          onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                          placeholder="Enter your prompt here... Use {{variable_name}} for dynamic variables."
                          required
                          rows={8}
                          className="w-full rounded-xl border border-line px-4 py-3 text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none resize-none bg-white/[0.03] transition-colors font-mono text-sm"
                        />
                        <div className="mt-2 p-3 rounded-lg bg-violet/10 border border-violet/20">
                          <p className="text-xs text-violet-soft font-medium mb-1">Variables Detected:</p>
                          <p className="text-xs text-ink-muted">
                            {extractVariables(formData.prompt).length > 0 
                              ? extractVariables(formData.prompt).join(', ')
                              : 'No variables found. Use {{variable_name}} syntax to add variables.'}
                          </p>
                        </div>
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
                            className="flex-1 rounded-xl border border-line px-4 py-2 focus:border-violet focus:outline-none bg-white/[0.03] text-ink text-sm placeholder:text-ink-faint transition-colors"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          />
                          <button
                            type="button"
                            onClick={addTag}
                            className="px-4 py-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors text-sm font-medium"
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
                              <Tag size={10} />
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:text-red-400 ml-1"
                              >
                                <X size={10} />
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
                          className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-violet/20 file:text-violet-soft hover:file:bg-violet/30 transition-colors"
                        />
                      </div>

                      {/* SEO Fields */}
                      <div>
                        <label className="block text-ink-muted mb-2 text-sm font-medium">
                          SEO Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.seoTitle}
                          onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                          placeholder="SEO optimized title..."
                          className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink placeholder:text-ink-faint transition-colors"
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
                          className="w-full rounded-xl border border-line px-4 py-3 focus:border-violet focus:outline-none bg-white/[0.03] text-ink placeholder:text-ink-faint transition-colors"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-line/40">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingPrompt(null)
                          resetForm()
                        }}
                        className="px-6 py-2.5 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading.submitting}
                        className="bg-gradient-to-r from-violet to-violet-soft text-white px-6 py-2.5 rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                  </form>
                </div>
              )}

              {/* Prompts List */}
              {isLoading.prompts ? (
                <div className="glass-card p-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent mx-auto mb-4" />
                  <p className="text-ink-muted">Loading your prompts...</p>
                </div>
              ) : prompts.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="p-4 rounded-full bg-violet/10 inline-block mb-4">
                    <FileText size={32} className="text-violet-soft" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink mb-2">
                    No prompts yet
                  </h3>
                  <p className="text-ink-muted mb-6">
                    Create your first prompt to get started as a team member.
                  </p>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-gradient-to-r from-violet to-violet-soft text-white px-6 py-3 rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Add Your First Prompt
                    </button>
                  )}
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="border-b border-line/40 bg-white/[0.02] px-6 py-4">
                    <h3 className="font-display font-semibold text-ink">Your Prompts ({prompts.length})</h3>
                    <p className="text-ink-muted text-sm">Manage and track your prompt submissions</p>
                  </div>
                  <div className="divide-y divide-line/40">
                    {prompts.map(prompt => (
                      <div key={prompt.id} className="p-6 hover:bg-white/[0.02] transition-colors">
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
                            
                            <p className="text-ink-muted text-sm mb-3 line-clamp-2">
                              {prompt.description}
                            </p>
                            
                            <div className="flex items-center gap-6 text-xs text-ink-faint mb-3">
                              <span className="flex items-center gap-1">
                                <Eye size={12} />
                                {prompt.views || 0} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Copy size={12} />
                                {prompt.copies || 0} copies
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

                            {prompt.status === 'rejected' && prompt.rejection_reason && (
                              <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div className="flex items-start gap-2">
                                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-red-400 text-xs font-medium mb-1">Rejection Feedback</p>
                                    <p className="text-red-300 text-xs">{prompt.rejection_reason}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {prompt.tags && prompt.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
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
                                  <span className="text-ink-faint text-xs px-2 py-0.5">+{prompt.tags.length - 5} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {prompt.status !== 'published' && (
                              <button
                                onClick={() => startEditing(prompt)}
                                className="px-3 py-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors text-xs font-medium flex items-center gap-1.5"
                              >
                                <Edit3 size={12} />
                                Edit
                              </button>
                            )}
                            {prompt.status === 'published' && (
                              <Link
                                to={`/prompt/${prompt.slug}`}
                                className="px-3 py-2 rounded-xl border border-line text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors text-xs font-medium flex items-center gap-1.5"
                              >
                                <Eye size={12} />
                                View Live
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="glass-card p-8 text-center">
                <div className="p-4 rounded-full bg-cyan/10 inline-block mb-4">
                  <BarChart3 size={32} className="text-cyan" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink mb-2">
                  Analytics Dashboard
                </h3>
                <p className="text-ink-muted mb-4">
                  Track your prompt performance, user engagement, and growth metrics.
                </p>
                <p className="text-ink-faint text-sm">
                  Detailed analytics will be available once you have published prompts.
                </p>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white text-xl font-bold">
                    {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {profile?.display_name || user?.email?.split('@')[0] || 'Team Member'}
                    </h3>
                    <p className="text-ink-muted">{user?.email}</p>
                    <p className="text-violet-soft text-sm font-medium">Category: {assignedCategoryName}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-line/40">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-ink">{stats.totalPrompts}</p>
                    <p className="text-ink-muted text-sm">Total Prompts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{stats.publishedPrompts}</p>
                    <p className="text-ink-muted text-sm">Published</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan">{stats.totalViews}</p>
                    <p className="text-ink-muted text-sm">Total Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber">{stats.totalCopies}</p>
                    <p className="text-ink-muted text-sm">Total Copies</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-ink-muted mb-1 text-sm">Email Address</label>
                    <p className="text-ink font-mono">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-ink-muted mb-1 text-sm">Role</label>
                    <p className="text-ink">Team Member (Category Admin)</p>
                  </div>
                  <div>
                    <label className="block text-ink-muted mb-1 text-sm">Assigned Category</label>
                    <p className="text-violet-soft font-medium">{assignedCategoryName}</p>
                  </div>
                  <div>
                    <label className="block text-ink-muted mb-1 text-sm">Member Since</label>
                    <p className="text-ink">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recent'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}