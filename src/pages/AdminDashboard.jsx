import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  FolderKanban,
  Eye,
  Copy,
  Plus,
  Pencil,
  Trash2,
  CloudUpload,
  LogOut,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  User,
  Key,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  Layers,
  Settings,
  AlertCircle,
  Lock,
  Mail,
  RefreshCw,
  Flame,
  Check,
  Megaphone,
  PenLine,
  Code2,
  Briefcase,
  Share2,
  Palette,
  Terminal,
  Cpu,
  Compass,
  Menu,
  BarChart3,
  Globe,
  Zap,
  TrendingUp,
  Inbox,
  MessageSquare,
  Clock,
  Send,
} from 'lucide-react'
import SEO from '../components/SEO'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabaseClient'
import {
  getAdminPrompts,
  getAdminStats,
  getCategories,
  getSubcategories,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptStatus,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  getContactMessages,
  markContactMessageAsRead,
  deleteContactMessage,
} from '../services/promptService'
import { uploadImageToGitHub } from '../services/githubUpload'
import { extractVariables } from '../utils/variableParser'

const AVAILABLE_ICONS = [
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Megaphone', icon: Megaphone },
  { name: 'PenLine', icon: PenLine },
  { name: 'Code2', icon: Code2 },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Share2', icon: Share2 },
  { name: 'Palette', icon: Palette },
  { name: 'Terminal', icon: Terminal },
  { name: 'Cpu', icon: Cpu },
  { name: 'Compass', icon: Compass },
  { name: 'FolderKanban', icon: FolderKanban },
  { name: 'FileText', icon: FileText },
]

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('prompts') // 'prompts' | 'categories' | 'messages' | 'analytics' | 'profile'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Data States
  const [promptsList, setPromptsList] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [messagesList, setMessagesList] = useState([])
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalCategories: 0,
    totalViews: 0,
    totalCopies: 0,
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'published' | 'draft'
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Prompt Form State
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState(null)
  const [submittingPrompt, setSubmittingPrompt] = useState(false)
  const [promptForm, setPromptForm] = useState({
    title: '',
    slug: '',
    categoryId: '',
    subcategoryId: '',
    tags: '',
    description: '',
    prompt: '',
    featuredImage: '',
    outputImage: '',
    seoTitle: '',
    seoDescription: '',
    featured: false,
    popular: false,
    trending: false,
    status: 'published',
  })

  // Category Form State
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCatId, setEditingCatId] = useState(null)
  const [submittingCat, setSubmittingCat] = useState(false)
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    icon: 'Sparkles',
  })

  // Subcategory Quick Add
  const [newSubcatName, setNewSubcatName] = useState('')
  const [subcatParentId, setSubcatParentId] = useState('')

  // Upload States
  const [uploadingFeatured, setUploadingFeatured] = useState(false)
  const [uploadingOutput, setUploadingOutput] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Profile Form States
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [emailUpdating, setEmailUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [prompts, cats, adminStats, messages] = await Promise.all([
        getAdminPrompts(),
        getCategories(),
        getAdminStats(),
        getContactMessages().catch(() => []),
      ])
      setPromptsList(prompts)
      setCategoriesList(cats)
      setStats(adminStats)
      setMessagesList(messages)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      notify('error', 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    notify('success', 'Dashboard data updated.')
  }

  function notify(type, text) {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000)
  }

  // Fetch subcategories when form category changes
  useEffect(() => {
    async function fetchSubs() {
      if (promptForm.categoryId) {
        try {
          const subs = await getSubcategories(promptForm.categoryId)
          setSubcategoriesList(subs)
        } catch (err) {
          console.error('Error loading subcategories:', err)
        }
      } else {
        setSubcategoriesList([])
      }
    }
    fetchSubs()
  }, [promptForm.categoryId])

  // --- PROMPT HANDLERS ---
  function openNewPromptModal() {
    setEditingPromptId(null)
    setPromptForm({
      title: '',
      slug: '',
      categoryId: categoriesList[0]?.id || '',
      subcategoryId: '',
      tags: '',
      description: '',
      prompt: '',
      featuredImage: '',
      outputImage: '',
      seoTitle: '',
      seoDescription: '',
      featured: false,
      popular: false,
      trending: false,
      status: 'published',
    })
    setUploadError('')
    setShowPromptModal(true)
  }

  function openEditPromptModal(p) {
    setEditingPromptId(p.id)
    setPromptForm({
      title: p.title || '',
      slug: p.slug || '',
      categoryId: p.categoryId || p.category_id || '',
      subcategoryId: p.subcategoryId || p.subcategory_id || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      description: p.description || '',
      prompt: p.prompt || '',
      featuredImage: p.featuredImage || p.featured_image || '',
      outputImage: p.outputImage || p.output_image || '',
      seoTitle: p.seoTitle || p.seo_title || '',
      seoDescription: p.seoDescription || p.seo_description || '',
      featured: Boolean(p.featured),
      popular: Boolean(p.popular),
      trending: Boolean(p.trending),
      status: p.status || 'published',
    })
    setUploadError('')
    setShowPromptModal(true)
  }

  function handlePromptTitleChange(val) {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    setPromptForm((prev) => ({
      ...prev,
      title: val,
      slug: editingPromptId ? prev.slug : autoSlug,
    }))
  }

  async function handleFeaturedUpload(file) {
    if (!file) return
    try {
      setUploadingFeatured(true)
      setUploadError('')
      const result = await uploadImageToGitHub(file)
      setPromptForm((prev) => ({ ...prev, featuredImage: result.url }))
      notify('success', 'Image uploaded to GitHub repo!')
    } catch (err) {
      console.error('Featured image upload failed:', err)
      setUploadError(`Upload error: ${err.message}`)
    } finally {
      setUploadingFeatured(false)
    }
  }

  async function handleOutputUpload(file) {
    if (!file) return
    try {
      setUploadingOutput(true)
      setUploadError('')
      const result = await uploadImageToGitHub(file)
      setPromptForm((prev) => ({ ...prev, outputImage: result.url }))
      notify('success', 'Output image uploaded!')
    } catch (err) {
      console.error('Output image upload failed:', err)
      setUploadError(`Upload error: ${err.message}`)
    } finally {
      setUploadingOutput(false)
    }
  }

  async function handleSavePrompt(e) {
    e.preventDefault()
    if (!promptForm.title.trim() || !promptForm.prompt.trim()) {
      notify('error', 'Title and Prompt body are required.')
      return
    }

    try {
      setSubmittingPrompt(true)
      setUploadError('')

      const detectedVariables = extractVariables(promptForm.prompt)
      const parsedTags = promptForm.tags
        ? promptForm.tags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : []

      const payload = {
        title: promptForm.title.trim(),
        slug: promptForm.slug.trim() || promptForm.title.toLowerCase().replace(/\s+/g, '-'),
        category_id: promptForm.categoryId || null,
        categoryId: promptForm.categoryId || null,
        subcategory_id: promptForm.subcategoryId || null,
        subcategoryId: promptForm.subcategoryId || null,
        tags: parsedTags,
        description: promptForm.description.trim(),
        prompt: promptForm.prompt.trim(),
        variables: detectedVariables,
        featured_image: promptForm.featuredImage.trim(),
        featuredImage: promptForm.featuredImage.trim(),
        output_image: promptForm.outputImage.trim(),
        outputImage: promptForm.outputImage.trim(),
        seo_title: promptForm.seoTitle.trim() || promptForm.title.trim(),
        seoTitle: promptForm.seoTitle.trim() || promptForm.title.trim(),
        seo_description: promptForm.seoDescription.trim() || promptForm.description.trim(),
        seoDescription: promptForm.seoDescription.trim() || promptForm.description.trim(),
        featured: promptForm.featured,
        popular: promptForm.popular,
        trending: promptForm.trending,
        status: promptForm.status,
      }

      if (editingPromptId) {
        await updatePrompt(editingPromptId, payload)
        notify('success', 'Prompt updated successfully!')
      } else {
        await createPrompt(payload)
        notify('success', 'Prompt published to library!')
      }

      setShowPromptModal(false)
      await loadData()
    } catch (err) {
      console.error('Error saving prompt:', err)
      setUploadError(`Failed to save prompt: ${err.message}`)
      notify('error', err.message || 'Error saving prompt')
    } finally {
      setSubmittingPrompt(false)
    }
  }

  async function handleDeletePrompt(id, title) {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deletePrompt(id)
        setPromptsList((prev) => prev.filter((p) => p.id !== id))
        notify('success', 'Prompt deleted successfully.')
        const updatedStats = await getAdminStats()
        setStats(updatedStats)
      } catch (err) {
        notify('error', `Failed to delete prompt: ${err.message}`)
      }
    }
  }

  async function handleTogglePromptStatus(p) {
    try {
      const newStatus = p.status === 'published' ? 'draft' : 'published'
      await togglePromptStatus(p.id, p.status)
      setPromptsList((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, status: newStatus } : item))
      )
      notify('success', `Prompt status set to ${newStatus}`)
    } catch (err) {
      notify('error', `Failed to update status: ${err.message}`)
    }
  }

  // --- CATEGORY HANDLERS ---
  function openNewCatModal() {
    setEditingCatId(null)
    setCatForm({
      name: '',
      slug: '',
      icon: 'Sparkles',
    })
    setShowCatModal(true)
  }

  function openEditCatModal(cat) {
    setEditingCatId(cat.id)
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || 'Sparkles',
    })
    setShowCatModal(true)
  }

  function handleCatNameChange(val) {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    setCatForm((prev) => ({
      ...prev,
      name: val,
      slug: editingCatId ? prev.slug : autoSlug,
    }))
  }

  async function handleSaveCategory(e) {
    e.preventDefault()
    if (!catForm.name.trim()) {
      notify('error', 'Category name is required.')
      return
    }

    try {
      setSubmittingCat(true)
      if (editingCatId) {
        await updateCategory(editingCatId, catForm)
        notify('success', 'Category updated successfully!')
      } else {
        await createCategory(catForm)
        notify('success', 'New category added!')
      }
      setShowCatModal(false)
      await loadData()
    } catch (err) {
      console.error('Error saving category:', err)
      notify('error', `Failed to save category: ${err.message}`)
    } finally {
      setSubmittingCat(false)
    }
  }

  async function handleDeleteCategory(id, name) {
    if (
      window.confirm(
        `Are you sure you want to delete category "${name}"? Prompts in this category will be unassigned.`
      )
    ) {
      try {
        await deleteCategory(id)
        setCategoriesList((prev) => prev.filter((c) => c.id !== id))
        notify('success', 'Category deleted successfully.')
        const updatedStats = await getAdminStats()
        setStats(updatedStats)
      } catch (err) {
        notify('error', `Failed to delete category: ${err.message}`)
      }
    }
  }

  async function handleAddSubcategory(catId) {
    if (!newSubcatName.trim()) return
    try {
      await createSubcategory({
        categoryId: catId,
        name: newSubcatName.trim(),
      })
      setNewSubcatName('')
      setSubcatParentId('')
      notify('success', 'Subcategory created!')
      await loadData()
    } catch (err) {
      notify('error', `Failed to create subcategory: ${err.message}`)
    }
  }

  // --- MESSAGE HANDLERS ---
  async function handleToggleMessageRead(msg) {
    try {
      const updated = await markContactMessageAsRead(msg.id, !msg.read)
      setMessagesList((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: updated.read } : m))
      )
      notify('success', updated.read ? 'Marked as read' : 'Marked as unread')
    } catch (err) {
      notify('error', `Failed to update message: ${err.message}`)
    }
  }

  async function handleDeleteMessage(id) {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteContactMessage(id)
        setMessagesList((prev) => prev.filter((m) => m.id !== id))
        notify('success', 'Message deleted.')
      } catch (err) {
        notify('error', `Failed to delete message: ${err.message}`)
      }
    }
  }

  // --- PROFILE / SECURITY HANDLERS ---
  async function handleUpdateEmail(e) {
    e.preventDefault()
    if (!newEmail || newEmail === user?.email) {
      notify('error', 'Enter a different email address.')
      return
    }

    try {
      setEmailUpdating(true)
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      notify('success', 'Confirmation link sent to new email! Please check your inbox.')
    } catch (err) {
      notify('error', err.message || 'Failed to update email.')
    } finally {
      setEmailUpdating(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      notify('error', 'Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('error', 'Passwords do not match.')
      return
    }

    try {
      setPasswordUpdating(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      notify('success', 'Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      notify('error', err.message || 'Failed to change password.')
    } finally {
      setPasswordUpdating(false)
    }
  }

  // Filtered prompts
  const filteredPrompts = promptsList.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter

    const matchesCat =
      categoryFilter === 'all' ||
      p.categoryId === categoryFilter ||
      p.category_id === categoryFilter

    return matchesSearch && matchesStatus && matchesCat
  })

  const unreadMessagesCount = messagesList.filter((m) => !m.read).length

  return (
    <div className="flex min-h-screen bg-base">
      <SEO title="Admin Console" description="PromptVault Admin Dashboard." />

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ======================= SIDEBAR ======================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-line bg-[#0c0a14] p-5 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Sidebar Brand / Header */}
          <div className="flex items-center justify-between border-b border-line/60 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white shadow-glow">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="font-display font-semibold text-sm text-ink tracking-tight">PromptVault</h2>
                <p className="text-[10px] text-violet-soft font-mono uppercase font-semibold tracking-wider">Admin Console</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-ink-muted hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              openNewPromptModal()
              setSidebarOpen(false)
            }}
            className="btn-primary w-full justify-center !py-2.5 text-xs shadow-glow"
          >
            <Plus size={15} /> Create Prompt
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="px-3 text-[10px] font-mono uppercase text-ink-faint tracking-wider mb-2 font-semibold">
              Management
            </p>
            
            <SidebarLink
              active={activeTab === 'prompts'}
              onClick={() => {
                setActiveTab('prompts')
                setSidebarOpen(false)
              }}
              icon={FileText}
              label="Prompts Library"
              badge={promptsList.length}
            />

            <SidebarLink
              active={activeTab === 'categories'}
              onClick={() => {
                setActiveTab('categories')
                setSidebarOpen(false)
              }}
              icon={FolderKanban}
              label="Categories & Tags"
              badge={categoriesList.length}
            />

            <SidebarLink
              active={activeTab === 'messages'}
              onClick={() => {
                setActiveTab('messages')
                setSidebarOpen(false)
              }}
              icon={Inbox}
              label="Contact Inbox"
              badge={unreadMessagesCount > 0 ? `${unreadMessagesCount} new` : messagesList.length}
            />

            <SidebarLink
              active={activeTab === 'analytics'}
              onClick={() => {
                setActiveTab('analytics')
                setSidebarOpen(false)
              }}
              icon={BarChart3}
              label="Vault Analytics"
            />

            <p className="px-3 text-[10px] font-mono uppercase text-ink-faint tracking-wider mb-2 mt-6 font-semibold">
              System & Profile
            </p>

            <SidebarLink
              active={activeTab === 'profile'}
              onClick={() => {
                setActiveTab('profile')
                setSidebarOpen(false)
              }}
              icon={User}
              label="Account & Security"
            />

            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <div className="flex items-center gap-2.5">
                <Globe size={16} className="text-cyan" />
                <span>Live Public Site</span>
              </div>
              <ExternalLink size={12} className="text-ink-faint" />
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="rounded-2xl border border-line/80 bg-white/[0.02] p-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet/30 to-cyan/20 border border-violet/30 text-violet-soft font-semibold text-xs">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-medium text-ink">{user?.email || 'Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                <span className="text-[10px] text-cyan font-mono">Super Admin</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-1.5 text-xs text-ink-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ======================= MAIN CONTENT VIEW ======================= */}
      <main className="flex-1 overflow-x-hidden p-6 md:p-10">
        {/* Top Action Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-muted hover:text-white lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink capitalize tracking-tight">
                {activeTab === 'prompts' && 'Prompts Library'}
                {activeTab === 'categories' && 'Categories & Taxonomies'}
                {activeTab === 'messages' && 'Contact Submissions & Inbox'}
                {activeTab === 'analytics' && 'Vault Analytics & Metrics'}
                {activeTab === 'profile' && 'Admin Profile & Security'}
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {activeTab === 'prompts' && 'Manage, publish, edit, and organize all prompts.'}
                {activeTab === 'categories' && 'Create topic categories and subcategory tags.'}
                {activeTab === 'messages' && 'Read inquiries, prompt requests, and feedback from visitors.'}
                {activeTab === 'analytics' && 'Track impressions, copy actions, and trending content.'}
                {activeTab === 'profile' && 'Change your admin email and password.'}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh Data"
              className="btn-ghost !px-3 !py-2 text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {activeTab === 'prompts' && (
              <button onClick={openNewPromptModal} className="btn-primary !px-4 !py-2 text-xs flex items-center gap-1.5 shadow-glow">
                <Plus size={14} /> Add Prompt
              </button>
            )}

            {activeTab === 'categories' && (
              <button onClick={openNewCatModal} className="btn-primary !px-4 !py-2 text-xs flex items-center gap-1.5 shadow-glow">
                <Plus size={14} /> Add Category
              </button>
            )}
          </div>
        </div>

        {/* Notification Banner */}
        {statusMessage.text && (
          <div
            className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs shadow-lg transition-all animate-fadeIn ${
              statusMessage.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-cyan/40 bg-cyan/10 text-cyan'
            }`}
          >
            {statusMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ======================= TAB 1: PROMPTS ======================= */}
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Prompts"
                value={stats.totalPrompts}
                sublabel={`${promptsList.filter((p) => p.status === 'published').length} Published live`}
                icon={FileText}
                gradient="from-violet/20 to-violet/5"
              />
              <StatCard
                title="Categories"
                value={stats.totalCategories}
                sublabel="Organized topics"
                icon={FolderKanban}
                gradient="from-cyan/20 to-cyan/5"
              />
              <StatCard
                title="Total Views"
                value={stats.totalViews.toLocaleString()}
                sublabel="Impressions recorded"
                icon={Eye}
                gradient="from-amber/20 to-amber/5"
              />
              <StatCard
                title="Copies Generated"
                value={stats.totalCopies.toLocaleString()}
                sublabel="Direct user utility"
                icon={Copy}
                gradient="from-emerald-500/20 to-emerald-500/5"
              />
            </div>

            {/* Filters & Search Toolbar */}
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, tags, slug..."
                  className="w-full rounded-lg border border-line bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-line bg-[#12111a] px-3 py-2 text-xs text-ink outline-none focus:border-violet/50 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="flex rounded-lg border border-line p-0.5 bg-white/[0.02]">
                  {['all', 'published', 'draft'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-xs capitalize rounded-md transition-colors ${
                        statusFilter === s ? 'bg-violet/20 text-violet-soft font-medium' : 'text-ink-muted hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompts Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-white/[0.02] text-ink-faint uppercase font-mono tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Prompt Details</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-center">Views</th>
                      <th className="px-5 py-3.5 text-center">Copies</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-ink-faint">
                          <Loader2 size={24} className="mx-auto mb-2 animate-spin text-violet-soft" />
                          Fetching prompt library from Supabase...
                        </td>
                      </tr>
                    ) : filteredPrompts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-ink-muted">
                          <div className="max-w-xs mx-auto space-y-2">
                            <p className="font-semibold text-ink">No prompts found</p>
                            <p className="text-ink-faint text-[11px]">
                              Try adjusting your filters or click below to create a new prompt.
                            </p>
                            <button onClick={openNewPromptModal} className="btn-primary !px-3 !py-1.5 text-xs mt-2">
                              <Plus size={13} /> Create Prompt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPrompts.map((p) => {
                        const cat = categoriesList.find((c) => c.id === p.categoryId || c.id === p.category_id)
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {p.featuredImage ? (
                                  <img
                                    src={p.featuredImage}
                                    alt={p.title}
                                    className="h-10 w-14 rounded-lg object-cover border border-line shrink-0"
                                  />
                                ) : (
                                  <div className="h-10 w-14 rounded-lg bg-surface border border-line flex items-center justify-center text-ink-faint shrink-0">
                                    <FileText size={16} />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-ink text-sm group-hover:text-violet-soft transition-colors">
                                      {p.title}
                                    </span>
                                    {p.featured && (
                                      <span className="rounded bg-violet/20 px-1.5 py-0.5 text-[10px] text-violet-soft border border-violet/30">
                                        Featured
                                      </span>
                                    )}
                                    {p.trending && (
                                      <span className="rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber border border-amber/30 flex items-center gap-0.5">
                                        <Flame size={10} /> Hot
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-faint">
                                    <span className="font-mono">/{p.slug}</span>
                                    <span>•</span>
                                    <span>{p.variables?.length || 0} variables</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-ink-muted">
                                {cat?.name || 'Uncategorized'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() => handleTogglePromptStatus(p)}
                                title="Click to toggle published status"
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all border ${
                                  p.status === 'published'
                                    ? 'bg-cyan/10 text-cyan border-cyan/30 hover:bg-cyan/20'
                                    : 'bg-amber/10 text-amber border-amber/30 hover:bg-amber/20'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'published' ? 'bg-cyan' : 'bg-amber'}`} />
                                <span className="capitalize">{p.status}</span>
                              </button>
                            </td>

                            <td className="px-5 py-4 text-center font-mono text-ink-muted">
                              {(p.views || 0).toLocaleString()}
                            </td>

                            <td className="px-5 py-4 text-center font-mono text-ink-muted">
                              {(p.copies || 0).toLocaleString()}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={`/prompt/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Preview live prompt"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted hover:text-white hover:border-violet/40 transition-colors"
                                >
                                  <ExternalLink size={14} />
                                </a>
                                <button
                                  onClick={() => openEditPromptModal(p)}
                                  title="Edit prompt"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted hover:text-violet-soft hover:border-violet/40 transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeletePrompt(p.id, p.title)}
                                  title="Delete prompt"
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: CATEGORIES ======================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesList.map((cat) => (
                <div key={cat.id} className="glass-card p-5 space-y-4 hover:border-violet/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/10 border border-line text-violet-soft">
                          <FolderKanban size={18} />
                        </span>
                        <div>
                          <h3 className="font-display font-semibold text-ink text-base">{cat.name}</h3>
                          <span className="text-[11px] font-mono text-ink-faint">/{cat.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditCatModal(cat)}
                          title="Edit Category"
                          className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-muted hover:text-white"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          title="Delete Category"
                          className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-muted hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-ink-muted">
                      <span>Assigned Prompts:</span>
                      <span className="font-mono text-white font-medium">{cat.count || 0} prompts</span>
                    </div>

                    {/* Subcategory Add Inline */}
                    {subcatParentId === cat.id ? (
                      <div className="mt-3 flex gap-1.5">
                        <input
                          type="text"
                          value={newSubcatName}
                          onChange={(e) => setNewSubcatName(e.target.value)}
                          placeholder="Subcategory name"
                          className="w-full rounded-lg border border-line bg-white/[0.04] px-2.5 py-1 text-xs text-ink outline-none focus:border-violet/50"
                        />
                        <button
                          onClick={() => handleAddSubcategory(cat.id)}
                          className="btn-primary !px-2.5 !py-1 text-[11px]"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setSubcatParentId('')}
                          className="btn-ghost !px-2 !py-1 text-[11px]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSubcatParentId(cat.id)
                          setNewSubcatName('')
                        }}
                        className="mt-3 text-[11px] text-violet-soft hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} /> Add subcategory tag
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[11px] text-ink-faint">
                    <span>Icon: <span className="font-mono text-ink-muted">{cat.icon}</span></span>
                    <a
                      href={`/category/${cat.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-soft hover:underline flex items-center gap-1"
                    >
                      View Live <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================= TAB 3: CONTACT INBOX ======================= */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-ink text-base">Visitor Messages & Feedback</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Submissions sent through the public Contact page.
                </p>
              </div>
              <span className="text-xs text-ink-faint font-mono">
                {messagesList.length} total message{messagesList.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="glass-card p-10 text-center text-xs text-ink-faint">
                <Loader2 size={20} className="mx-auto mb-2 animate-spin text-violet-soft" />
                Loading messages...
              </div>
            ) : messagesList.length === 0 ? (
              <div className="glass-card p-12 text-center text-ink-muted space-y-2">
                <Inbox size={32} className="mx-auto text-ink-faint mb-2" />
                <p className="font-semibold text-ink text-sm">Inbox is empty</p>
                <p className="text-xs text-ink-faint max-w-sm mx-auto">
                  When visitors submit inquiries or prompt requests on the Contact page, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messagesList.map((msg) => (
                  <div
                    key={msg.id}
                    className={`glass-card p-5 transition-all border ${
                      msg.read ? 'border-line/60 bg-white/[0.01]' : 'border-violet/40 bg-violet/[0.03] shadow-glow'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/40 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface border border-line text-violet-soft shrink-0">
                          <MessageSquare size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink text-sm">{msg.name}</span>
                            {!msg.read && (
                              <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-medium text-cyan border border-cyan/30">
                                New
                              </span>
                            )}
                          </div>
                          <a
                            href={`mailto:${msg.email}?subject=Re:%20PromptVault%20Inquiry`}
                            className="text-xs text-violet-soft hover:underline font-mono"
                          >
                            {msg.email}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] text-ink-faint flex items-center gap-1 font-mono mr-2">
                          <Clock size={11} />
                          {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                        <a
                          href={`mailto:${msg.email}?subject=Re:%20PromptVault%20Inquiry`}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-muted hover:text-white"
                          title="Reply via Email"
                        >
                          <Send size={12} />
                        </a>
                        <button
                          onClick={() => handleToggleMessageRead(msg)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-muted hover:text-cyan"
                          title={msg.read ? 'Mark as Unread' : 'Mark as Read'}
                        >
                          <Check size={13} className={msg.read ? 'text-cyan' : ''} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-muted hover:text-red-400"
                          title="Delete message"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 4: ANALYTICS ======================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-card p-6 border-line">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Conversion / Copy Rate</span>
                  <TrendingUp size={16} className="text-cyan" />
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {stats.totalViews > 0
                    ? `${((stats.totalCopies / stats.totalViews) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
                <p className="text-[11px] text-ink-faint mt-1">Copies generated per view</p>
              </div>

              <div className="glass-card p-6 border-line">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Avg. Copies / Prompt</span>
                  <Copy size={16} className="text-violet-soft" />
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {stats.totalPrompts > 0
                    ? Math.round(stats.totalCopies / stats.totalPrompts).toLocaleString()
                    : '0'}
                </p>
                <p className="text-[11px] text-ink-faint mt-1">Across all published prompts</p>
              </div>

              <div className="glass-card p-6 border-line">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Avg. Views / Prompt</span>
                  <Eye size={16} className="text-amber" />
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {stats.totalPrompts > 0
                    ? Math.round(stats.totalViews / stats.totalPrompts).toLocaleString()
                    : '0'}
                </p>
                <p className="text-[11px] text-ink-faint mt-1">Impressions per prompt item</p>
              </div>
            </div>

            {/* Top performing prompts */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-display font-semibold text-ink">Top 5 Most Popular Prompts</h3>
              <div className="space-y-3">
                {[...promptsList]
                  .sort((a, b) => (b.views || 0) - (a.views || 0))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-line/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-violet-soft">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-ink text-xs">{p.title}</p>
                          <p className="text-[10px] text-ink-faint font-mono">/{p.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs font-mono text-ink-muted">
                        <span>{(p.views || 0).toLocaleString()} views</span>
                        <span className="text-cyan">{(p.copies || 0).toLocaleString()} copies</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 5: PROFILE & SECURITY ======================= */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white shadow-glow">
                  <User size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-ink text-base">{user?.email}</h3>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint font-mono mt-0.5">UID: {user?.id}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-violet-soft" />
                <h3 className="font-display font-semibold text-ink text-sm">Update Admin Email</h3>
              </div>
              <form onSubmit={handleUpdateEmail} className="space-y-3">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newadmin@promptvault.com"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink outline-none focus:border-violet/50"
                />
                <button
                  type="submit"
                  disabled={emailUpdating}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {emailUpdating ? 'Sending link...' : 'Update Email Address'}
                </button>
              </form>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-cyan" />
                <h3 className="font-display font-semibold text-ink text-sm">Update Password</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min 6 characters)"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink outline-none focus:border-violet/50"
                />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink outline-none focus:border-violet/50"
                />
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {passwordUpdating ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Session Management Card */}
            <div className="glass-card p-6 border-red-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <LogOut size={16} className="text-red-400" />
                <h3 className="font-display font-semibold text-ink text-sm">Session Management</h3>
              </div>
              <p className="text-xs text-ink-muted">
                Sign out of your active admin session on this device.
              </p>
              <button
                type="button"
                onClick={() => signOut()}
                className="btn-ghost !px-4 !py-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 flex items-center gap-1.5"
              >
                <LogOut size={14} /> Sign Out of Admin Console
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ======================= MODAL: ADD / EDIT PROMPT ======================= */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-3xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-fadeIn border-violet/30 shadow-glow">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet/20 text-violet-soft border border-violet/30">
                  <FileText size={16} />
                </span>
                <div>
                  <h2 className="font-display font-semibold text-lg text-ink">
                    {editingPromptId ? 'Edit Prompt' : 'Create New Prompt'}
                  </h2>
                  <p className="text-xs text-ink-muted">Define prompt parameters, auto-variables, and SEO tags.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {uploadError && (
              <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSavePrompt} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Prompt Title *</label>
                <input
                  value={promptForm.title}
                  onChange={(e) => handlePromptTitleChange(e.target.value)}
                  placeholder="e.g. High-Converting Facebook Ad Copy"
                  required
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Slug (URL identifier) *</label>
                <input
                  value={promptForm.slug}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="high-converting-facebook-ad-copy"
                  required
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Category *</label>
                <select
                  value={promptForm.categoryId}
                  onChange={(e) =>
                    setPromptForm((prev) => ({ ...prev, categoryId: e.target.value, subcategoryId: '' }))
                  }
                  required
                  className="w-full rounded-lg border border-line bg-[#12111a] px-3 py-2 text-xs text-ink outline-none focus:border-violet/50"
                >
                  <option value="">Select Category...</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Subcategory (Optional)</label>
                <select
                  value={promptForm.subcategoryId}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, subcategoryId: e.target.value }))}
                  disabled={!promptForm.categoryId}
                  className="w-full rounded-lg border border-line bg-[#12111a] px-3 py-2 text-xs text-ink outline-none focus:border-violet/50 disabled:opacity-40"
                >
                  <option value="">Select Subcategory...</option>
                  {subcategoriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Tags (comma-separated)</label>
                <input
                  value={promptForm.tags}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="ads, facebook, marketing, copywriting"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">Summary / Short Description</label>
                <textarea
                  rows={2}
                  value={promptForm.description}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief synopsis for card previews and meta descriptions..."
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              {/* Prompt Body with Live Variable Extraction Tag */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-muted">
                    Prompt Body * (Use <span className="font-mono text-violet-soft">{`{{VariableName}}`}</span> for inputs)
                  </label>
                  {promptForm.prompt && (
                    <span className="text-[11px] text-cyan font-mono">
                      {extractVariables(promptForm.prompt).length} variables parsed
                    </span>
                  )}
                </div>
                <textarea
                  rows={6}
                  required
                  value={promptForm.prompt}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Create a Facebook Ad for {{BusinessName}} targeting {{TargetAudience}} in {{City}}..."
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs font-mono text-ink placeholder:text-ink-faint outline-none focus:border-violet/50 leading-relaxed"
                />
                {extractVariables(promptForm.prompt).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1 p-2 rounded-lg bg-white/[0.02] border border-line/40">
                    <span className="text-[10px] text-ink-faint self-center">Variables:</span>
                    {extractVariables(promptForm.prompt).map((v) => (
                      <span key={v} className="chip !text-[10px] !py-0.5 !border-violet/30 !text-violet-soft">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Dropzones */}
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <UploadDropzone
                  label="Featured Card Image"
                  value={promptForm.featuredImage}
                  uploading={uploadingFeatured}
                  onFileSelected={handleFeaturedUpload}
                  onUrlChange={(url) => setPromptForm((prev) => ({ ...prev, featuredImage: url }))}
                />
                <UploadDropzone
                  label="Example Output Image"
                  value={promptForm.outputImage}
                  uploading={uploadingOutput}
                  onFileSelected={handleOutputUpload}
                  onUrlChange={(url) => setPromptForm((prev) => ({ ...prev, outputImage: url }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">SEO Title</label>
                <input
                  value={promptForm.seoTitle}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="Facebook Ad Copy Prompt"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted">SEO Description</label>
                <input
                  value={promptForm.seoDescription}
                  onChange={(e) => setPromptForm((prev) => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="Generate high-converting Facebook ad copy in seconds..."
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              {/* Toggles */}
              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-2 border-t border-line/60">
                <CheckboxToggle
                  label="Featured"
                  checked={promptForm.featured}
                  onChange={(checked) => setPromptForm((prev) => ({ ...prev, featured: checked }))}
                />
                <CheckboxToggle
                  label="Popular"
                  checked={promptForm.popular}
                  onChange={(checked) => setPromptForm((prev) => ({ ...prev, popular: checked }))}
                />
                <CheckboxToggle
                  label="Trending"
                  checked={promptForm.trending}
                  onChange={(checked) => setPromptForm((prev) => ({ ...prev, trending: checked }))}
                />
                <CheckboxToggle
                  label="Publish Immediately"
                  checked={promptForm.status === 'published'}
                  onChange={(checked) =>
                    setPromptForm((prev) => ({ ...prev, status: checked ? 'published' : 'draft' }))
                  }
                />
              </div>

              {/* Form Buttons */}
              <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-line/60">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="btn-ghost !px-4 !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPrompt}
                  className="btn-primary !px-5 !py-2 text-xs shadow-glow"
                >
                  {submittingPrompt ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Saving Prompt...
                    </span>
                  ) : editingPromptId ? (
                    'Update Prompt'
                  ) : (
                    'Publish Prompt'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ADD / EDIT CATEGORY ======================= */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative animate-fadeIn border-violet/30 shadow-glow">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-5">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-violet-soft" />
                <h3 className="font-display font-semibold text-ink">
                  {editingCatId ? 'Edit Category' : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-ink-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-muted">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => handleCatNameChange(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-muted">Category Slug *</label>
                <input
                  type="text"
                  required
                  value={catForm.slug}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="artificial-intelligence"
                  className="w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-violet/50 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink-muted">Choose Icon</label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-line/40 rounded-lg">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon
                    const isSelected = catForm.icon === item.name
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => setCatForm((prev) => ({ ...prev, icon: item.name }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? 'border-violet-soft bg-violet/20 text-white'
                            : 'border-line/40 text-ink-muted hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <IconComp size={16} />
                        <span className="text-[10px] truncate max-w-full">{item.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-line/60">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="btn-ghost !px-3.5 !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCat}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {submittingCat ? 'Saving...' : editingCatId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
        active
          ? 'bg-violet/15 text-violet-soft border border-violet/30 shadow-glow'
          : 'text-ink-muted hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={active ? 'text-violet-soft' : 'text-ink-faint'} />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
            active ? 'bg-violet/30 text-white' : 'bg-white/[0.06] text-ink-faint'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ title, value, sublabel, icon: Icon, gradient }) {
  return (
    <div className={`glass-card p-5 relative overflow-hidden bg-gradient-to-br ${gradient} border-line hover:border-violet/30 transition-all`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">{title}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] border border-line text-ink">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] text-ink-faint">{sublabel}</p>
    </div>
  )
}

function UploadDropzone({ label, value, uploading, onFileSelected, onUrlChange }) {
  const fileInputRef = useRef(null)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink-muted">{label}</label>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) onFileSelected(e.target.files[0])
        }}
        className="hidden"
      />
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white/[0.02] px-4 py-3.5 text-xs text-ink-faint cursor-pointer hover:border-violet/40 hover:text-ink-muted transition-colors"
      >
        {uploading ? (
          <span className="flex items-center gap-2 text-violet-soft">
            <Loader2 size={15} className="animate-spin" /> Uploading to GitHub repo...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CloudUpload size={15} /> Upload via GitHub
          </span>
        )}
      </div>
      <input
        type="url"
        value={value || ''}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Or paste direct image URL (https://...)"
        className="w-full rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-[11px] text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
      />
      {value && (
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint truncate">
          <Check size={12} className="text-cyan shrink-0" />
          <span className="truncate text-[10px] text-cyan font-mono">{value}</span>
        </div>
      )}
    </div>
  )
}

function CheckboxToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer hover:text-white transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line accent-violet cursor-pointer"
      />
      <span>{label}</span>
    </label>
  )
}
