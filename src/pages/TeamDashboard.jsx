import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, LogOut, Plus, Eye, Clock, CheckCircle, XCircle, Edit3, 
  Tag, FileText, Image as ImageIcon, AlertCircle, Save, X, Menu, Home, BarChart3,
  TrendingUp, Zap, RefreshCw, Copy, Sun, Moon, Settings, HelpCircle,
  Layers, PenTool, CloudUpload, Loader2, Star, Trash2, AlertTriangle
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
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    categoryId: assignedCategoryId || '', // Team member locked to assigned category
    subcategoryId: '',
    tags: '',
    description: '',
    prompt: '',
    featuredImage: '',
    outputImage: '',
    images: [],
    seoTitle: '',
    seoDescription: '',
    featured: false,
    popular: false,
    trending: false,
    status: 'pending_review', // Team members always submit for review
    rejectionReason: '',
    contentType: 'prompt',
    videoUrl: '',
  })

  // Multi-Image Form Tab & Inputs  
  const [imageSourceTab, setImageSourceTab] = useState('github')
  const [driveUrlInput, setDriveUrlInput] = useState('')
  const [directUrlInput, setDirectUrlInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Helper function to generate URL slug from title
  const handleAutoSlug = (title) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData((prev) => ({ ...prev, title, slug: prev.slug && editingPrompt ? prev.slug : slug }))
  }

  // Google Drive link conversion helper
  const convertGoogleDriveUrl = (shareUrl) => {
    const match = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : shareUrl
  }

  // Add Google Drive image
  const handleAddDriveImage = () => {
    const trimmed = driveUrlInput.trim()
    if (!trimmed) return
    
    const converted = convertGoogleDriveUrl(trimmed)
    const newImg = {
      imageUrl: converted,
      source: 'google_drive',
      isFeatured: formData.images.length === 0,
      sortOrder: formData.images.length,
    }
    
    setFormData((prev) => {
      const nextImages = [...prev.images, newImg]
      return { ...prev, images: nextImages }
    })
    setDriveUrlInput('')
  }

  // Add direct URL image
  const handleAddDirectImage = () => {
    const url = directUrlInput.trim()
    if (!url) return
    
    const newImg = {
      imageUrl: url,
      source: 'direct_url',
      isFeatured: formData.images.length === 0,
      sortOrder: formData.images.length,
    }
    
    setFormData((prev) => {
      const nextImages = [...prev.images, newImg]
      return { ...prev, images: nextImages }
    })
    setDirectUrlInput('')
  }

  // Set featured image
  const handleSetFeaturedImage = (index) => {
    setFormData((prev) => {
      const updated = prev.images.map((img, i) => ({
        ...img,
        isFeatured: i === index,
      }))
      return { ...prev, images: updated }
    })
  }

  // Remove image
  const handleRemoveImage = (index) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== index)
      if (updated.length > 0 && !updated.some((img) => img.isFeatured)) {
        updated[0].isFeatured = true
      }
      return { ...prev, images: updated }
    })
  }

  // Handle file upload to GitHub (simplified version)
  const handleFileUpload = async (file) => {
    if (!file || uploadingImage) return
    
    setUploadingImage(true)
    setUploadError('')
    
    try {
      // In a real implementation, this would upload to GitHub
      // For now, we'll create a local URL as placeholder
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImg = {
          imageUrl: e.target.result,
          source: 'local', // In real implementation this would be 'github'
          isFeatured: formData.images.length === 0,
          sortOrder: formData.images.length,
        }
        
        setFormData((prev) => {
          const nextImages = [...prev.images, newImg]
          return { ...prev, images: nextImages }
        })
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setUploadError('Failed to upload image: ' + error.message)
      setUploadingImage(false)
    }
  }
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

  // Load subcategories when form category changes
  useEffect(() => {
    async function fetchSubcategories() {
      if (formData.categoryId) {
        try {
          const { data: subs, error } = await supabase
            .from('subcategories')
            .select('*')
            .eq('category_id', formData.categoryId)
            .order('name')

          if (!error) {
            setSubcategoriesList(subs || [])
          }
        } catch (err) {
          console.warn('Error loading subcategories:', err)
        }
      }
    }
    fetchSubcategories()
  }, [formData.categoryId])

  const loadData = async () => {
    if (!assignedCategoryId) return

    setIsLoading(prev => ({ ...prev, prompts: true }))
    
    try {
      // Load user's prompts (only for their assigned category and authored by them)
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select(`
          *,
          prompt_images (
            id,
            image_url,
            source,
            sort_order,
            is_featured
          )
        `)
        .eq('author', user.id)
        .eq('category_id', assignedCategoryId)
        .order('created_at', { ascending: false })

      if (promptsError) throw promptsError
      
      // Transform the data to match the expected format
      const userPrompts = (promptsData || []).map(prompt => ({
        ...prompt,
        images: prompt.prompt_images || []
      }))
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

      // Load subcategories for the assigned category
      if (assignedCategoryId) {
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', assignedCategoryId)
          .order('name')

        if (!subcategoriesError) {
          setSubcategoriesList(subcategoriesData || [])
        }
      }

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
      // Use the slug from form data (auto-generated by handleAutoSlug)
      const baseSlug = (formData.slug || formData.title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      // Append a short random suffix to guarantee uniqueness
      const suffix = Math.random().toString(36).substring(2, 6)
      const slug = `${baseSlug}-${suffix}`

      // Parse variables from prompt
      const variables = extractVariables(formData.prompt)

      // Parse tags into array
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : []

      // Handle featured image from images array
      const featuredImage = formData.images.find(img => img.isFeatured)?.imageUrl || 
                           formData.images[0]?.imageUrl || 
                           null

      // Create prompt with comprehensive data
      const promptData = {
        title: formData.title,
        slug: slug,
        description: formData.description,
        prompt: formData.prompt,
        category_id: formData.categoryId || assignedCategoryId,
        subcategory_id: formData.subcategoryId || null,
        tags: tagsArray,
        variables: variables,
        author: user.id,
        status: 'pending', // Team members always submit for review
        featured_image: featuredImage,
        output_image: formData.outputImage || null,
        seo_title: formData.seoTitle || formData.title,
        seo_description: formData.seoDescription || formData.description,
        featured: false, // Team members can't mark as featured
        popular: false,
        trending: false,
        views: 0,
        copies: 0,
        created_at: new Date().toISOString()
      }

      const { data: insertedPrompt, error: insertError } = await supabase
        .from('prompts')
        .insert([promptData])
        .select('id')
        .single()

      if (insertError) throw insertError

      // Insert images into prompt_images table if there are any
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map((img, index) => ({
          prompt_id: insertedPrompt.id,
          image_url: img.imageUrl,
          source: img.source || 'direct',
          sort_order: index,
          is_featured: img.isFeatured || false
        }))

        const { error: imagesError } = await supabase
          .from('prompt_images')
          .insert(imageInserts)

        if (imagesError) {
          console.warn('Failed to insert images:', imagesError)
          // Don't fail the whole operation if images fail
        }
      }

      setSuccess('Prompt submitted for Super Admin review!')
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
      // Use the slug from form data — keep original slug when editing unless title changed
      let slug = formData.slug || formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      // If slug changed from original, append a suffix to guarantee uniqueness
      if (slug !== editingPrompt.slug) {
        const suffix = Math.random().toString(36).substring(2, 6)
        slug = `${slug}-${suffix}`
      }

      // Parse variables from prompt
      const variables = extractVariables(formData.prompt)

      // Parse tags into array
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : []

      // Handle featured image from images array
      const featuredImage = formData.images.find(img => img.isFeatured)?.imageUrl || 
                           formData.images[0]?.imageUrl || 
                           editingPrompt.featured_image

      // Update prompt with comprehensive data
      const promptData = {
        title: formData.title,
        slug: slug,
        description: formData.description,
        prompt: formData.prompt,
        category_id: formData.categoryId || assignedCategoryId,
        subcategory_id: formData.subcategoryId || null,
        tags: tagsArray,
        variables: variables,
        status: 'pending', // Reset to pending when edited
        featured_image: featuredImage,
        output_image: formData.outputImage || null,
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

      // Update images in prompt_images table
      if (formData.images.length > 0) {
        // Delete existing images for this prompt
        await supabase
          .from('prompt_images')
          .delete()
          .eq('prompt_id', editingPrompt.id)

        // Insert new images
        const imageInserts = formData.images.map((img, index) => ({
          prompt_id: editingPrompt.id,
          image_url: img.imageUrl,
          source: img.source || 'direct',
          sort_order: index,
          is_featured: img.isFeatured || false
        }))

        const { error: imagesError } = await supabase
          .from('prompt_images')
          .insert(imageInserts)

        if (imagesError) {
          console.warn('Failed to update images:', imagesError)
          // Don't fail the whole operation if images fail
        }
      } else {
        // If no images, remove all existing images
        await supabase
          .from('prompt_images')
          .delete()
          .eq('prompt_id', editingPrompt.id)
      }

      setSuccess('Prompt updated and resubmitted for review!')
      setEditingPrompt(null)
      setShowAddForm(false)
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
      slug: '',
      categoryId: assignedCategoryId || '',
      subcategoryId: '',
      tags: '',
      description: '',
      prompt: '',
      featuredImage: '',
      outputImage: '',
      images: [],
      seoTitle: '',
      seoDescription: '',
      featured: false,
      popular: false,
      trending: false,
      status: 'pending_review',
      rejectionReason: '',
      contentType: 'prompt',
      videoUrl: '',
    })
    setImageSourceTab('github')
    setDriveUrlInput('')
    setDirectUrlInput('')
    setUploadError('')
  }

  const startEditing = (prompt) => {
    if (prompt.status === 'published') return // Can't edit published prompts
    
    setFormData({
      title: prompt.title,
      slug: prompt.slug || '',
      categoryId: prompt.category_id || assignedCategoryId || '',
      subcategoryId: prompt.subcategory_id || '',
      tags: Array.isArray(prompt.tags) ? prompt.tags.join(', ') : (prompt.tags || ''),
      description: prompt.description,
      prompt: prompt.prompt,
      featuredImage: prompt.featured_image || '',
      outputImage: prompt.output_image || '',
      images: (prompt.images || []).map(img => ({
        imageUrl: img.image_url,
        source: img.source,
        isFeatured: img.is_featured,
        sortOrder: img.sort_order
      })),
      seoTitle: prompt.seo_title || '',
      seoDescription: prompt.seo_description || '',
      featured: prompt.featured || false,
      popular: prompt.popular || false,
      trending: prompt.trending || false,
      status: prompt.status || 'pending_review',
      rejectionReason: prompt.rejection_reason || '',
      contentType: 'prompt', // Default for team members
      videoUrl: '',
    })
    setEditingPrompt(prompt)
    setShowAddForm(true)
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

                  <form onSubmit={editingPrompt ? handleEditPrompt : handleAddPrompt} className="p-6 space-y-4">
                    {/* Rejection notice if previously rejected */}
                    {formData.rejectionReason && (
                      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                        <div>
                          <p className="font-semibold text-red-200">Rejection Feedback:</p>
                          <p className="mt-0.5 leading-relaxed">{formData.rejectionReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Title & Slug */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-ink-muted mb-1 font-medium text-sm">Prompt Title *</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => handleAutoSlug(e.target.value)}
                          placeholder="e.g. High-Converting Facebook Ad Copy"
                          className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-ink-muted mb-1 font-medium text-sm">URL Slug *</label>
                        <input
                          type="text"
                          required
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          placeholder="e.g. high-converting-facebook-ad-copy"
                          className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink font-mono focus:border-violet focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-ink-muted mb-1 font-medium text-sm">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="marketing, ads, facebook, copywriting"
                        className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                      />
                    </div>

                    {/* Category & Subcategory (Team members can see but category is locked) */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-ink-muted mb-1 font-medium text-sm">
                          Category (Locked to your assigned category)
                        </label>
                        <select
                          disabled={true}
                          value={formData.categoryId}
                          className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-ink focus:border-violet focus:outline-none opacity-70 cursor-not-allowed"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-ink-muted mb-1 font-medium text-sm">Subcategory (Optional)</label>
                        <select
                          value={formData.subcategoryId}
                          onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                          className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
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
                      <label className="block text-ink-muted mb-1 font-medium text-sm">Description (Markdown Supported)</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="A short overview of what this prompt accomplishes..."
                        className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none leading-relaxed"
                      />
                    </div>

                    {/* Prompt Template */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-ink-muted font-medium text-sm">
                          Prompt Template * (Use <code className="text-cyan">{'{{variable}}'}</code> for blanks)
                        </label>
                        <span className="text-[10px] text-cyan font-mono">
                          {extractVariables(formData.prompt).length} variables detected
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        required
                        value={formData.prompt}
                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                        placeholder="You are an expert copywriter. Write a Facebook ad for {{BusinessName}} targeting {{Audience}}..."
                        className="w-full rounded-xl border border-line bg-surface/50 p-3 text-ink font-mono text-xs focus:border-violet focus:outline-none leading-relaxed"
                      />
                    </div>

                    {/* MULTI-IMAGE & GOOGLE DRIVE MANAGER */}
                    <div className="rounded-2xl border border-line bg-surface/40 p-4 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-display font-semibold text-sm text-ink flex items-center gap-2">
                            <ImageIcon size={15} className="text-cyan" /> Multi-Image Gallery & Media Sources
                          </h4>
                          <p className="text-[11px] text-ink-muted mt-0.5">
                            Add images via GitHub upload, Google Drive share links, or direct URLs.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-cyan">
                          {formData.images.length} attached
                        </span>
                      </div>

                      {/* Source Tabs */}
                      <div className="flex items-center gap-2 border-b border-line/60 pb-2">
                        <button
                          type="button"
                          onClick={() => setImageSourceTab('github')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            imageSourceTab === 'github'
                              ? 'bg-violet/20 text-violet-soft border border-violet/40'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          GitHub Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceTab('drive')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            imageSourceTab === 'drive'
                              ? 'bg-violet/20 text-violet-soft border border-violet/40'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          Google Drive Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceTab('url')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            imageSourceTab === 'url'
                              ? 'bg-violet/20 text-violet-soft border border-violet/40'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          Direct Image URL
                        </button>
                      </div>

                      {/* Tab 1: GitHub Upload */}
                      {imageSourceTab === 'github' && (
                        <div className="space-y-2">
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-line/80 hover:border-violet/50 rounded-xl p-4 cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                            <CloudUpload size={22} className="text-violet-soft mb-1" />
                            <span className="text-xs text-ink font-medium">Click to upload image to GitHub</span>
                            <span className="text-[10px] text-ink-faint">PNG, JPG, WebP up to 5MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage}
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                              }}
                              className="hidden"
                            />
                          </label>
                          {uploadingImage && (
                            <p className="text-[11px] text-violet-soft flex items-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" /> Uploading to GitHub repo...
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tab 2: Google Drive Link */}
                      {imageSourceTab === 'drive' && (
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={driveUrlInput}
                            onChange={(e) => setDriveUrlInput(e.target.value)}
                            placeholder="Paste Google Drive share link (e.g. https://drive.google.com/file/d/...)"
                            className="flex-1 rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-ink focus:border-violet focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddDriveImage}
                            className="bg-gradient-to-r from-violet to-violet-soft text-white py-2 px-3 rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center gap-1 text-xs"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      )}

                      {/* Tab 3: Direct URL */}
                      {imageSourceTab === 'url' && (
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={directUrlInput}
                            onChange={(e) => setDirectUrlInput(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="flex-1 rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-ink focus:border-violet focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddDirectImage}
                            className="bg-gradient-to-r from-violet to-violet-soft text-white py-2 px-3 rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center gap-1 text-xs"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      )}

                      {uploadError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertTriangle size={13} />
                            <span className="font-medium">Upload Failed</span>
                          </div>
                          <div className="text-[11px] text-red-300/90 whitespace-pre-line">
                            {uploadError}
                          </div>
                        </div>
                      )}

                      {formData.images.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-mono uppercase text-ink-faint font-semibold">
                            Attached Images ({formData.images.length})
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {formData.images.map((img, idx) => (
                              <div
                                key={idx}
                                className={`relative rounded-xl overflow-hidden border p-1.5 space-y-1 bg-surface-2 transition-all ${
                                  img.isFeatured ? 'border-violet shadow-glow' : 'border-line'
                                }`}
                              >
                                <img
                                  src={img.imageUrl}
                                  alt=""
                                  className="h-20 w-full object-cover rounded-lg"
                                />
                                <div className="flex items-center justify-between text-[10px] pt-1">
                                  <span className="inline-flex items-center gap-1 bg-violet/20 text-violet-soft px-2 py-0.5 rounded-full text-[9px] uppercase">
                                    {img.source || 'direct'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSetFeaturedImage(idx)}
                                      className={`p-1 rounded ${
                                        img.isFeatured ? 'text-amber' : 'text-ink-faint hover:text-ink'
                                      }`}
                                      title={img.isFeatured ? 'Featured Cover Image' : 'Set as Featured Cover'}
                                    >
                                      <Star size={12} className={img.isFeatured ? 'fill-amber' : ''} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(idx)}
                                      className="p-1 rounded text-ink-faint hover:text-red-400"
                                      title="Remove image"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
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
                            {editingPrompt ? 'Update & Resubmit for Review' : 'Submit for Review'}
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