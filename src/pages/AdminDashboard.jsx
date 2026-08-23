import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  UserPlus,
  Key,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  Layers,
  Settings,
  AlertCircle,
  AlertTriangle,
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
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Link2,
  Image as ImageIcon,
  Star,
  CheckSquare,
  Sun,
  Moon,
} from 'lucide-react'
import SEO from '../components/SEO'
import { useAuth } from '../hooks/useAuth'
import { supabaseSystem } from '../services/supabaseSystemClient'
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
  getPendingPrompts,
  approvePrompt,
  rejectPrompt,
  getAdminProfiles,
  createAdminUser,
  updateAdminProfile,
  deleteAdminProfile,
  getPromptImages,
} from '../services/promptService'
import {
  getTeamMemberRequests,
  approveTeamMemberRequest,
  rejectTeamMemberRequest,
} from '../services/teamRequestsService'
import { uploadImageToGitHub } from '../services/githubUpload'
import { formatGoogleDriveImageUrl, extractGoogleDriveId, detectImageSource } from '../utils/googleDrive'
import { extractVariables } from '../utils/variableParser'
import { getUploadErrorSuggestions } from '../utils/configChecker'

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
  const {
    user,
    profile,
    role,
    isSuperAdmin,
    isCategoryAdmin,
    assignedCategoryId,
    signOut,
    loading: authLoading,
  } = useAuth()

  const [activeTab, setActiveTab] = useState('prompts') // 'prompts' | 'pending' | 'categories' | 'admins' | 'teamRequests' | 'messages' | 'analytics' | 'profile'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isFetchingRef = useRef(false)

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

  // Redirect category admins away from super admin only tabs
  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'messages' || activeTab === 'pending' || activeTab === 'categories' || activeTab === 'admins' || activeTab === 'teamRequests')) {
      setActiveTab('prompts')
    }
  }, [isSuperAdmin, activeTab])

  // Data States
  const [promptsList, setPromptsList] = useState([])
  const [pendingList, setPendingList] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [messagesList, setMessagesList] = useState([])
  const [adminsList, setAdminsList] = useState([])
  const [teamRequestsList, setTeamRequestsList] = useState([])
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalCategories: 0,
    totalViews: 0,
    totalCopies: 0,
    pendingCount: 0,
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'published' | 'pending' | 'rejected' | 'draft'
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
    images: [],
    seoTitle: '',
    seoDescription: '',
    featured: false,
    popular: false,
    trending: false,
    status: 'published',
    rejectionReason: '',
    contentType: 'prompt',
    videoUrl: '',
  })

  // Multi-Image Form Tab & Inputs
  const [imageSourceTab, setImageSourceTab] = useState('github') // 'github' | 'drive' | 'url'
  const [driveUrlInput, setDriveUrlInput] = useState('')
  const [directUrlInput, setDirectUrlInput] = useState('')

  // Upload States
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState({
    show: false,
    promptId: null,
    promptTitle: '',
    reason: '',
  })
  const [rejectingLoading, setRejectingLoading] = useState(false)

  // Admin User Modal State
  const [adminModal, setAdminModal] = useState({
    show: false,
    email: '',
    password: '',
    displayName: '',
    role: 'category_admin',
    assignedCategoryId: '',
  })
  const [submittingAdmin, setSubmittingAdmin] = useState(false)

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

  // Profile Form States
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [emailUpdating, setEmailUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  useEffect(() => {
    if (user?.email) {
      setNewEmail(user.email)
    }
  }, [user?.email])

  // Assigned Category details (for category_admin)
  const assignedCategory = useMemo(() => {
    if (!assignedCategoryId || !categoriesList.length) return null
    return categoriesList.find((c) => c.id === assignedCategoryId)
  }, [assignedCategoryId, categoriesList])

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setLoading(true)

    try {
      const userProfile = profile || { role, assigned_category_id: assignedCategoryId }

      const [prompts, cats, adminStats, messages, pending, admins, teamRequests] = await Promise.all([
        getAdminPrompts(userProfile).catch((err) => {
          console.warn('Failed to load prompts:', err)
          return []
        }),
        getCategories().catch((err) => {
          console.warn('Failed to load categories:', err)
          return []
        }),
        getAdminStats(userProfile).catch((err) => {
          console.warn('Failed to load stats:', err)
          return { totalPrompts: 0, totalCategories: 0, totalViews: 0, totalCopies: 0, pendingCount: 0 }
        }),
        isSuperAdmin ? getContactMessages().catch(() => []) : Promise.resolve([]),
        isSuperAdmin ? getPendingPrompts().catch(() => []) : Promise.resolve([]),
        isSuperAdmin ? getAdminProfiles().catch(() => []) : Promise.resolve([]),
        isSuperAdmin ? getTeamMemberRequests({ status: 'pending' }).catch(() => []) : Promise.resolve([]),
      ])

      setPromptsList(prompts || [])
      setCategoriesList(cats || [])
      setStats(adminStats || { totalPrompts: 0, totalCategories: 0, totalViews: 0, totalCopies: 0, pendingCount: 0 })

      if (isSuperAdmin) {
        setMessagesList(messages || [])
        setPendingList(pending || [])
        setAdminsList(admins || [])
        setTeamRequestsList(teamRequests || [])
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [profile, role, assignedCategoryId, isSuperAdmin])

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id, profile?.role, loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    notify('success', 'Dashboard data refreshed.')
  }, [loadData])

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

  // --- PROMPT MODAL HANDLERS ---
  function openNewPromptModal() {
    setEditingPromptId(null)
    const initialCategory = isCategoryAdmin && assignedCategoryId
      ? assignedCategoryId
      : categoriesList[0]?.id || ''

    setPromptForm({
      title: '',
      slug: '',
      categoryId: initialCategory,
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
      status: isCategoryAdmin ? 'pending' : 'published',
      rejectionReason: '',
      contentType: 'prompt',
      videoUrl: '',
    })
    setDriveUrlInput('')
    setDirectUrlInput('')
    setUploadError('')
    setShowPromptModal(true)
  }

  async function openEditPromptModal(p) {
    setEditingPromptId(p.id)
    let images = p.images || []
    if (!images.length && p.id) {
      try {
        images = await getPromptImages(p.id)
      } catch (e) {
        console.warn('Could not fetch prompt images:', e)
      }
    }

    setPromptForm({
      title: p.title || '',
      slug: p.slug || '',
      categoryId: p.categoryId || p.category_id || (isCategoryAdmin ? assignedCategoryId : ''),
      subcategoryId: p.subcategoryId || p.subcategory_id || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      description: p.description || '',
      prompt: p.prompt || '',
      featuredImage: p.featuredImage || p.featured_image || '',
      outputImage: p.outputImage || p.output_image || '',
      images: images || [],
      seoTitle: p.seoTitle || p.seo_title || '',
      seoDescription: p.seoDescription || p.seo_description || '',
      featured: Boolean(p.featured),
      popular: Boolean(p.popular),
      trending: Boolean(p.trending),
      status: p.status || 'published',
      rejectionReason: p.rejectionReason || p.rejection_reason || '',
      contentType: p.contentType || p.content_type || 'prompt',
      videoUrl: p.videoUrl || p.video_url || '',
    })
    setDriveUrlInput('')
    setDirectUrlInput('')
    setUploadError('')
    setShowPromptModal(true)
  }

  function handleAutoSlug(title) {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setPromptForm((prev) => ({ ...prev, title, slug: prev.slug && editingPromptId ? prev.slug : slug }))
  }

  // Multi-Image Helpers
  function handleAddDriveImage() {
    if (!driveUrlInput.trim()) return
    const converted = formatGoogleDriveImageUrl(driveUrlInput)
    if (!converted) {
      setUploadError('Invalid Google Drive share link.')
      return
    }

    const newImg = {
      imageUrl: converted,
      source: 'google_drive',
      isFeatured: promptForm.images.length === 0,
      sortOrder: promptForm.images.length,
    }

    setPromptForm((prev) => {
      const nextImages = [...prev.images, newImg]
      return {
        ...prev,
        images: nextImages,
        featuredImage: prev.featuredImage || converted,
      }
    })
    setDriveUrlInput('')
    setUploadError('')
  }

  function handleAddDirectImage() {
    if (!directUrlInput.trim()) return
    const url = directUrlInput.trim()
    const newImg = {
      imageUrl: url,
      source: detectImageSource(url),
      isFeatured: promptForm.images.length === 0,
      sortOrder: promptForm.images.length,
    }

    setPromptForm((prev) => {
      const nextImages = [...prev.images, newImg]
      return {
        ...prev,
        images: nextImages,
        featuredImage: prev.featuredImage || url,
      }
    })
    setDirectUrlInput('')
    setUploadError('')
  }

  function handleSetFeaturedImage(index) {
    setPromptForm((prev) => {
      const updated = prev.images.map((img, i) => ({
        ...img,
        isFeatured: i === index,
      }))
      const featuredUrl = updated[index]?.imageUrl || ''
      return {
        ...prev,
        images: updated,
        featuredImage: featuredUrl,
      }
    })
  }

  function handleRemoveImage(index) {
    setPromptForm((prev) => {
      const updated = prev.images.filter((_, i) => i !== index)
      if (updated.length > 0 && !updated.some((img) => img.isFeatured)) {
        updated[0].isFeatured = true
      }
      const featuredUrl = updated.find((img) => img.isFeatured)?.imageUrl || ''
      return {
        ...prev,
        images: updated,
        featuredImage: featuredUrl,
      }
    })
  }

  async function handleFileUpload(file) {
    if (!file) return
    try {
      setUploadingImage(true)
      setUploadError('')
      const result = await uploadImageToGitHub(file, 'prompts')
      const rawUrl = result.url
      const newImg = {
        imageUrl: rawUrl,
        source: 'github',
        isFeatured: promptForm.images.length === 0,
        sortOrder: promptForm.images.length,
      }

      setPromptForm((prev) => {
        const nextImages = [...prev.images, newImg]
        return {
          ...prev,
          images: nextImages,
          featuredImage: prev.featuredImage || rawUrl,
        }
      })
    } catch (err) {
      console.error('Upload failed:', err)
      const suggestions = getUploadErrorSuggestions(err.message)
      const errorWithSuggestions = `${err.message}\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`
      setUploadError(errorWithSuggestions)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSavePrompt(e) {
    e.preventDefault()
    if (!promptForm.title || !promptForm.prompt) {
      notify('error', 'Title and Prompt text are required.')
      return
    }

    try {
      setSubmittingPrompt(true)
      const userProfile = profile || { role, assigned_category_id: assignedCategoryId, display_name: user?.email?.split('@')[0] }

      const detectedVariables = extractVariables(promptForm.prompt)
      const tagsArray = promptForm.tags
        ? promptForm.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : []

      const payload = {
        ...promptForm,
        variables: detectedVariables,
        tags: tagsArray,
        author: userProfile.display_name || user?.email?.split('@')[0] || 'Admin',
      }

      if (editingPromptId) {
        await updatePrompt(editingPromptId, payload, userProfile)
        notify('success', isCategoryAdmin ? 'Prompt updated and resubmitted for review!' : 'Prompt updated successfully!')
      } else {
        await createPrompt(payload, userProfile)
        notify('success', isCategoryAdmin ? 'Prompt submitted! Awaiting Super Admin review.' : 'Prompt created successfully!')
      }

      setShowPromptModal(false)
      await loadData()
    } catch (err) {
      console.error('Error saving prompt:', err)
      notify('error', err.message || 'Failed to save prompt.')
    } finally {
      setSubmittingPrompt(false)
    }
  }

  async function handleDeletePrompt(id, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    try {
      await deletePrompt(id)
      notify('success', 'Prompt deleted.')
      await loadData()
    } catch (err) {
      console.error('Error deleting prompt:', err)
      notify('error', 'Failed to delete prompt.')
    }
  }

  async function handleToggleStatus(id, currentStatus) {
    if (!isSuperAdmin) {
      notify('error', 'Only Super Admins can directly toggle publish status.')
      return
    }
    try {
      await togglePromptStatus(id, currentStatus)
      notify('success', `Status updated to ${currentStatus === 'published' ? 'draft' : 'published'}.`)
      await loadData()
    } catch (err) {
      console.error('Error toggling prompt status:', err)
      notify('error', 'Failed to update status.')
    }
  }

  // --- APPROVAL WORKFLOW HANDLERS (Super Admin) ---
  async function handleApprove(id, title) {
    try {
      await approvePrompt(id)
      notify('success', `"${title}" approved and published to public site!`)
      await loadData()
    } catch (err) {
      console.error('Error approving prompt:', err)
      notify('error', 'Failed to approve prompt.')
    }
  }

  function openRejectModal(p) {
    setRejectModal({
      show: true,
      promptId: p.id,
      promptTitle: p.title,
      reason: '',
    })
  }

  async function handleConfirmReject(e) {
    e.preventDefault()
    if (!rejectModal.promptId) return

    try {
      setRejectingLoading(true)
      await rejectPrompt(rejectModal.promptId, rejectModal.reason)
      notify('success', `"${rejectModal.promptTitle}" marked as rejected. Feedback saved.`)
      setRejectModal({ show: false, promptId: null, promptTitle: '', reason: '' })
      await loadData()
    } catch (err) {
      console.error('Error rejecting prompt:', err)
      notify('error', 'Failed to reject prompt.')
    } finally {
      setRejectingLoading(false)
    }
  }

  // --- ADMIN MANAGEMENT HANDLERS (Super Admin) ---
  function openCreateAdminModal() {
    setAdminModal({
      show: true,
      email: '',
      password: '',
      displayName: '',
      role: 'category_admin',
      assignedCategoryId: categoriesList[0]?.id || '',
    })
  }

  async function handleSaveAdmin(e) {
    e.preventDefault()
    if (!adminModal.email || !adminModal.password) {
      notify('error', 'Email and password are required.')
      return
    }
    if (adminModal.password.length < 6) {
      notify('error', 'Password must be at least 6 characters.')
      return
    }
    if (adminModal.role === 'category_admin' && !adminModal.assignedCategoryId) {
      notify('error', 'Please assign a category to the category admin.')
      return
    }

    try {
      setSubmittingAdmin(true)
      await createAdminUser({
        email: adminModal.email,
        password: adminModal.password,
        displayName: adminModal.displayName || adminModal.email.split('@')[0],
        role: adminModal.role,
        assignedCategoryId: adminModal.role === 'super_admin' ? null : adminModal.assignedCategoryId,
      })
      notify('success', `Admin user "${adminModal.email}" created successfully!`)
      setAdminModal({ show: false, email: '', password: '', displayName: '', role: 'category_admin', assignedCategoryId: '' })
      await loadData()
    } catch (err) {
      console.error('Error creating admin:', err)
      notify('error', err.message || 'Failed to create admin user.')
    } finally {
      setSubmittingAdmin(false)
    }
  }

  async function handleUpdateAdminCategory(adminId, newCatId) {
    try {
      await updateAdminProfile(adminId, { assignedCategoryId: newCatId || null })
      notify('success', 'Admin category assignment updated.')
      await loadData()
    } catch (err) {
      console.error('Error updating admin assignment:', err)
      notify('error', 'Failed to update assignment.')
    }
  }

  async function handleDeleteAdmin(adminId, name) {
    if (!window.confirm(`Revoke admin privileges for "${name || 'this user'}"?`)) return
    try {
      await deleteAdminProfile(adminId)
      notify('success', 'Admin privileges revoked.')
      await loadData()
    } catch (err) {
      console.error('Error deleting admin profile:', err)
      notify('error', 'Failed to revoke admin.')
    }
  }

  // --- CATEGORIES HANDLERS (Super Admin) ---
  function openNewCatModal() {
    setEditingCatId(null)
    setCatForm({ name: '', slug: '', icon: 'Sparkles' })
    setShowCatModal(true)
  }

  function openEditCatModal(c) {
    setEditingCatId(c.id)
    setCatForm({ name: c.name, slug: c.slug, icon: c.icon || 'Sparkles' })
    setShowCatModal(true)
  }

  async function handleSaveCategory(e) {
    e.preventDefault()
    if (!catForm.name) return
    try {
      setSubmittingCat(true)
      if (editingCatId) {
        await updateCategory(editingCatId, catForm)
        notify('success', 'Category updated.')
      } else {
        await createCategory(catForm)
        notify('success', 'Category created.')
      }
      setShowCatModal(false)
      await loadData()
    } catch (err) {
      console.error('Error saving category:', err)
      notify('error', 'Failed to save category.')
    } finally {
      setSubmittingCat(false)
    }
  }

  async function handleDeleteCat(id, name) {
    if (!window.confirm(`Delete category "${name}"? Prompts in this category will become unassigned.`)) return
    try {
      await deleteCategory(id)
      notify('success', 'Category deleted.')
      await loadData()
    } catch (err) {
      console.error('Error deleting category:', err)
      notify('error', 'Failed to delete category.')
    }
  }

  // --- INBOX HANDLERS ---
  async function handleToggleRead(id, currentRead) {
    try {
      await markContactMessageAsRead(id, !currentRead)
      setMessagesList((prev) => prev.map((m) => (m.id === id ? { ...m, read: !currentRead } : m)))
    } catch (err) {
      console.error('Error updating read status:', err)
    }
  }

  async function handleDeleteMessage(id) {
    try {
      await deleteContactMessage(id)
      setMessagesList((prev) => prev.filter((m) => m.id !== id))
      notify('success', 'Message deleted.')
    } catch (err) {
      console.error('Error deleting message:', err)
      notify('error', 'Failed to delete message.')
    }
  }

  // --- SECURITY / PASSWORD HANDLERS ---
  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      notify('error', 'Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      notify('error', 'Password must be at least 6 characters.')
      return
    }
    try {
      setPasswordUpdating(true)
      const { error } = await supabaseSystem.auth.updateUser({ password: newPassword })
      if (error) throw error
      notify('success', 'Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      notify('error', err.message || 'Failed to update password.')
    } finally {
      setPasswordUpdating(false)
    }
  }

  // --- TEAM MEMBER REQUEST HANDLERS ---
  async function handleApproveTeamRequest(requestId, userEmail, categoryId = null) {
    try {
      await approveTeamMemberRequest(requestId, categoryId)
      notify('success', `Team member request approved! ${userEmail || 'User'} is now a Category Admin.`)
      await loadData()
    } catch (err) {
      console.error('Error approving team request:', err)
      notify('error', err.message || 'Failed to approve team member request.')
    }
  }

  async function handleRejectTeamRequest(requestId, userEmail, reason = '') {
    try {
      await rejectTeamMemberRequest(requestId, reason)
      notify('success', `Team member request from ${userEmail || 'User'} has been rejected.`)
      await loadData()
    } catch (err) {
      console.error('Error rejecting team request:', err)
      notify('error', err.message || 'Failed to reject team member request.')
    }
  }

  // Filtered prompts list
  const filteredPrompts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim()
    return (promptsList || []).filter((p) => {
      if (!p) return false
      const title = (p.title || '').toLowerCase()
      const desc = (p.description || '').toLowerCase()
      const tags = Array.isArray(p.tags) ? p.tags : []

      const matchesSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'all' || p.status === statusFilter

      const matchesCat =
        categoryFilter === 'all' ||
        p.categoryId === categoryFilter ||
        p.category_id === categoryFilter

      return matchesSearch && matchesStatus && matchesCat
    })
  }, [promptsList, searchQuery, statusFilter, categoryFilter])

  const unreadMessagesCount = isSuperAdmin ? (messagesList || []).filter((m) => !m.read).length : 0
  const pendingReviewCount = isSuperAdmin ? (pendingList || []).length : 0

  if (authLoading || !user?.id) {
    return (
      <div className="min-h-screen bg-base text-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
          <p className="text-xs text-ink-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col md:flex-row">
      <SEO title="Admin Dashboard | PromptVault" description="Manage prompts, reviews, and team." />      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan text-white">
            <Zap size={14} />
          </span>
          <span className="font-display font-semibold text-sm text-ink">PromptVault</span>
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
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white shadow-glow">
                <Zap size={16} />
              </span>
              <div>
                <span className="font-display font-bold text-sm tracking-tight text-ink">PromptVault</span>
                <span className="block text-[10px] text-cyan font-mono uppercase tracking-wider">
                  {isSuperAdmin ? 'Super Admin' : 'Category Admin'}
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

          {/* Scoped Category Banner for Category Admins */}
          {isCategoryAdmin && assignedCategory && (
            <div className="rounded-xl border border-amber/30 bg-amber/10 p-2.5">
              <p className="text-[10px] uppercase font-mono tracking-wider text-amber font-semibold">Assigned Category</p>
              <p className="text-xs font-semibold text-ink mt-0.5 truncate">{assignedCategory.name}</p>
            </div>
          )}

          {/* Create Button - New Gradient Style */}
          <button
            onClick={() => {
              openNewPromptModal()
              setSidebarOpen(false)
            }}
            className="w-full bg-gradient-to-r from-violet to-violet-soft text-white py-2.5 px-4 rounded-full font-medium shadow-glow hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
          >
            <Plus size={15} /> Create Prompt
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
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

            {/* Pending Review Queue (Super Admin only) */}
            {isSuperAdmin && (
              <SidebarLink
                active={activeTab === 'pending'}
                onClick={() => {
                  setActiveTab('pending')
                  setSidebarOpen(false)
                }}
                icon={CheckSquare}
                label="Pending Review"
                badge={pendingReviewCount > 0 ? `${pendingReviewCount} review` : 0}
                badgeColor="amber"
              />
            )}

            {/* Categories (Super Admin only) */}
            {isSuperAdmin && (
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
            )}

            {/* Team & Admins (Super Admin only) */}
            {isSuperAdmin && (
              <SidebarLink
                active={activeTab === 'admins'}
                onClick={() => {
                  setActiveTab('admins')
                  setSidebarOpen(false)
                }}
                icon={Users}
                label="Admin Team"
                badge={adminsList.length}
              />
            )}

            {/* Team Requests (Super Admin only) */}
            {isSuperAdmin && (
              <SidebarLink
                active={activeTab === 'teamRequests'}
                onClick={() => {
                  setActiveTab('teamRequests')
                  setSidebarOpen(false)
                }}
                icon={UserPlus}
                label="Team Requests"
                badge={teamRequestsList.length > 0 ? `${teamRequestsList.length} pending` : 0}
                badgeColor="amber"
              />
            )}

            {/* Contact Inbox (Super Admin only) */}
            {isSuperAdmin && (
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
            )}

            <SidebarLink
              active={activeTab === 'analytics'}
              onClick={() => {
                setActiveTab('analytics')
                setSidebarOpen(false)
              }}
              icon={BarChart3}
              label="Vault Analytics"
            />

            <p className="px-3 text-[10px] font-mono uppercase text-ink-faint tracking-wider mb-2 mt-5 font-semibold">
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

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? <Sun size={15} className="text-amber" /> : <Moon size={15} className="text-violet" />}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-ink-faint border border-line px-1.5 py-0.5 rounded">
                {theme}
              </span>
            </button>

            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
            >
              <div className="flex items-center gap-2.5">
                <Globe size={15} className="text-cyan" />
                <span>Live Public Site</span>
              </div>
              <ExternalLink size={12} className="text-ink-faint" />
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="rounded-2xl border border-line/80 bg-white/[0.02] p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet/30 to-cyan/20 border border-violet/30 text-violet-soft font-semibold text-xs shrink-0">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-medium text-ink">{profile?.displayName || user?.email || 'Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isSuperAdmin ? 'bg-cyan' : 'bg-amber'} animate-pulse`} />
                <span className="text-[10px] text-ink-muted capitalize">
                  {isSuperAdmin ? 'Super Admin' : `${assignedCategory?.name || 'Category'} Admin`}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full justify-center rounded-lg border border-line/60 bg-surface/50 py-1.5 text-xs text-ink-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 overflow-y-auto">
        {/* Status Toast Notification */}
        {statusMessage.text && (
          <div
            className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 shadow-glow text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
              statusMessage.type === 'error'
                ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                : 'bg-violet/20 border border-violet/40 text-violet-soft'
            }`}
          >
            {statusMessage.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-6">
          <div>
            {/* Breadcrumb */}
            <p className="text-xs font-mono text-ink-muted mb-1">
              Dashboard / {activeTab === 'prompts' && 'Prompts Library'}
              {activeTab === 'pending' && 'Pending Review'}
              {activeTab === 'categories' && 'Categories & Tags'}
              {activeTab === 'admins' && 'Admin Team'}
              {activeTab === 'teamRequests' && 'Team Requests'}
              {activeTab === 'messages' && 'Contact Inbox'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'profile' && 'Account & Security'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
                {activeTab === 'prompts' && 'Prompts Library'}
                {activeTab === 'pending' && 'Pending Review Queue'}
                {activeTab === 'categories' && 'Categories & Tags'}
                {activeTab === 'admins' && 'Admin Team Management'}
                {activeTab === 'teamRequests' && 'Team Member Requests'}
                {activeTab === 'messages' && 'Contact Inbox'}
                {activeTab === 'analytics' && 'Vault Analytics'}
                {activeTab === 'profile' && 'Account & Security'}
              </h1>
              {isCategoryAdmin && assignedCategory && (
                <span className="chip !border-amber/40 !bg-amber/15 !text-amber text-xs">
                  {assignedCategory.name} Category
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              {isSuperAdmin
                ? 'Full system oversight across all categories, permissions, and submissions.'
                : `Manage prompts and content within your assigned ${assignedCategory?.name || ''} category.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh Button - Ghost Style */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-full border border-line/60 bg-surface/30 text-ink-muted hover:text-ink hover:border-violet/50 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30 focus-visible:border-violet/50 transition-all text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
              style={{ outline: 'none' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </button>
            {/* New Prompt Button - Gradient Style */}
            <button
              onClick={openNewPromptModal}
              className="bg-gradient-to-r from-violet to-violet-soft text-white py-2 px-4 rounded-full font-medium shadow-glow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/30 transition-all duration-200 flex items-center gap-2 text-xs"
            >
              <Plus size={14} /> New Prompt
            </button>
          </div>
        </div>

        {/* KPI STATS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Prompts"
            value={stats.totalPrompts}
            icon={FileText}
            change={isCategoryAdmin ? 'In Category' : 'Published + Drafts'}
          />
          {isSuperAdmin ? (
            <StatCard
              title="Pending Review"
              value={stats.pendingCount}
              icon={CheckSquare}
              highlight={stats.pendingCount > 0}
              change="Awaiting Approval"
            />
          ) : (
            <StatCard
              title="Assigned Category"
              value={assignedCategory?.name || 'Assigned'}
              icon={FolderKanban}
              change="Scoped Access"
            />
          )}
          <StatCard
            title="Total Views"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
            change="Across Prompts"
          />
          <StatCard
            title="Total Copies"
            value={stats.totalCopies.toLocaleString()}
            icon={Copy}
            change="User Prompt Runs"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: PROMPTS LIBRARY                                            */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search prompts by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-line bg-surface/50 pl-9 pr-3 py-2.5 text-xs text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {/* Status Filter - Pill Style */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by prompt status"
                  className="rounded-full border border-line bg-surface/60 px-4 py-2.5 text-xs text-ink focus:border-violet focus:outline-none appearance-none bg-no-repeat bg-right pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1rem 1rem'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending Review</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Drafts</option>
                </select>

                {/* Category Filter (Super Admin only, locked for Category Admin) - Pill Style */}
                {isSuperAdmin && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by prompt category"
                    className="rounded-full border border-line bg-surface/60 px-4 py-2.5 text-xs text-ink focus:border-violet focus:outline-none appearance-none bg-no-repeat bg-right pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1rem 1rem'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Prompts Table & Mobile Card List */}
            {loading ? (
              <div className="glass-card p-12 text-center">
                <Loader2 size={24} className="animate-spin text-violet-soft mx-auto" />
                <p className="text-xs text-ink-muted mt-2">Loading prompts...</p>
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-3">
                <FileText size={32} className="text-ink-faint mx-auto" />
                <p className="font-display text-sm font-semibold text-ink">
                  No prompts found
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your filters or search query.'
                    : 'Create your first prompt to populate the library.'}
                </p>
                <button onClick={openNewPromptModal} className="btn-primary !py-2 !px-4 text-xs mx-auto">
                  <Plus size={14} /> Create Prompt
                </button>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] border-b border-line text-ink-faint uppercase font-mono text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Prompt</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Views / Copies</th>
                        <th className="px-4 py-3">Images</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {filteredPrompts.map((p) => (
                        <tr key={p.id} className="hover:bg-violet/[0.02] transition-colors group">
                          <td className="px-4 py-3.5 max-w-xs sm:max-w-sm">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail Image */}
                              <div className="w-10 h-10 rounded-lg border border-line overflow-hidden bg-surface/50 shrink-0">
                                {p.featuredImage ? (
                                  <img
                                    src={p.featuredImage}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet/10 to-cyan/10">
                                    <FileText size={14} className="text-ink-faint" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  to={`/prompt/${p.slug}`}
                                  target="_blank"
                                  className="font-medium text-ink hover:text-violet-soft truncate block transition-colors"
                                >
                                  {p.title}
                                </Link>
                                <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">{p.description}</p>
                                {p.rejectionReason && (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 max-w-fit">
                                    <AlertTriangle size={11} /> Rejection note: {p.rejectionReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-ink-muted">
                            <span className="chip !py-0.5 !text-[11px]">
                              {p.category?.name || p.categories?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {/* Status Dot */}
                              <div className={`w-2 h-2 rounded-full ${
                                p.status === 'published' ? 'bg-green-500' :
                                p.status === 'pending' ? 'bg-amber-500' :
                                p.status === 'rejected' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`} />
                              {/* Status Text */}
                              <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                p.status === 'published' 
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : p.status === 'pending'
                                  ? 'bg-amber/10 text-amber border border-amber/30'
                                  : p.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {p.status === 'pending' ? 'Pending' : 
                                 p.status === 'published' ? 'Published' : 
                                 p.status === 'rejected' ? 'Rejected' : 'Draft'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-ink-faint font-mono text-[11px]">
                            {p.views.toLocaleString()} / {p.copies.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-ink-faint">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan">
                              <ImageIcon size={12} /> 
                              {Array.isArray(p.images) ? p.images.length : 
                               (p.featuredImage ? 1 : 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleToggleStatus(p.id, p.status)}
                                  className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink transition-colors"
                                  title={p.status === 'published' ? 'Unpublish to Draft' : 'Direct Publish'}
                                >
                                  {p.status === 'published' ? <Check size={13} className="text-cyan" /> : <Layers size={13} />}
                                </button>
                              )}
                              <button
                                onClick={() => openEditPromptModal(p)}
                                className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink transition-colors"
                                title="Edit Prompt"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeletePrompt(p.id, p.title)}
                                className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-red-400 transition-colors"
                                title="Delete Prompt"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="border-t border-line/40 px-4 py-3 flex items-center justify-between">
                  <div className="text-xs text-ink-muted">
                    Showing {filteredPrompts.length} of {promptsList.length} prompts
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="px-3 py-1 text-xs text-ink-muted hover:text-ink border border-line rounded-full hover:bg-white/[0.04] transition-colors">
                      Prev
                    </button>
                    <button className="px-3 py-1 text-xs bg-violet/20 text-violet-soft border border-violet/30 rounded-full">
                      1
                    </button>
                    <button className="px-3 py-1 text-xs text-ink-muted hover:text-ink border border-line rounded-full hover:bg-white/[0.04] transition-colors">
                      2
                    </button>
                    <button className="px-3 py-1 text-xs text-ink-muted hover:text-ink border border-line rounded-full hover:bg-white/[0.04] transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: PENDING REVIEW QUEUE (Super Admin Only)                    */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'pending' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="glass-card p-4 sm:p-5 flex items-center justify-between border-amber/30 bg-amber/[0.03]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber/15 border border-amber/30 text-amber">
                  <CheckSquare size={20} />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-sm sm:text-base text-ink">
                    Approval Workflow Queue
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Prompts submitted by Category Admins that require Super Admin approval before going live.
                  </p>
                </div>
              </div>
              <span className="chip !border-amber/40 !bg-amber/20 !text-amber font-mono font-semibold">
                {pendingList.length} Pending
              </span>
            </div>

            {pendingList.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-2">
                <CheckCircle2 size={32} className="text-cyan mx-auto" />
                <p className="font-display text-sm font-semibold text-ink">
                  Inbox zero!
                </p>
                <p className="text-xs text-ink-muted">
                  All category admin submissions have been reviewed and approved.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingList.map((p) => (
                  <div key={p.id} className="glass-card p-4 sm:p-5 space-y-4 border-l-4 border-l-amber">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="chip !border-amber/40 !bg-amber/15 !text-amber text-[10px] uppercase font-semibold">
                            Pending Review
                          </span>
                          <span className="chip !py-0.5 !text-[11px]">
                            {p.category?.name || 'Unassigned'}
                          </span>
                          <span className="text-[11px] text-ink-faint font-mono">
                            Submitted by {p.author || 'Admin'} · {p.createdAt || 'Recently'}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-base sm:text-lg text-ink">
                          {p.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(p.id, p.title)}
                          className="btn-primary !py-2 !px-3 text-xs bg-cyan hover:bg-cyan/80 text-black font-semibold"
                        >
                          <CheckCircle size={14} /> Approve & Publish
                        </button>
                        <button
                          onClick={() => openRejectModal(p)}
                          className="btn-ghost !py-2 !px-3 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                        <button
                          onClick={() => openEditPromptModal(p)}
                          className="btn-ghost !py-2 !px-3 text-xs"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-faint font-semibold">
                        Prompt Template Preview
                      </p>
                      <pre className="font-mono text-xs text-ink whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        {p.prompt}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: CATEGORIES & TAGS (Super Admin Only)                       */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'categories' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">
                  Categories ({categoriesList.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Create and organize top-level prompt families.
                </p>
              </div>
              <button onClick={openNewCatModal} className="btn-primary !py-2 !px-3 text-xs">
                <Plus size={14} /> Add Category
              </button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesList.map((cat) => (
                <div key={cat.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/10 border border-line text-violet-soft">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-ink">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] text-ink-faint">{cat.count || 0} published prompts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditCatModal(cat)}
                      className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCat(cat.id, cat.name)}
                      className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: ADMIN TEAM MANAGEMENT (Super Admin Only)                   */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'admins' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">
                  Admin Team & Category Permissions ({adminsList.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Create admin accounts, assign roles, and scope category access.
                </p>
              </div>
              <button onClick={openCreateAdminModal} className="btn-primary !py-2 !px-3 text-xs shadow-glow">
                <Plus size={14} /> Invite New Admin
              </button>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-line text-ink-faint uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Assigned Category Scope</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {adminsList.map((adm) => (
                      <tr key={adm.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet/20 text-violet-soft font-bold text-xs shrink-0">
                              {adm.email?.charAt(0).toUpperCase() || adm.displayName?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div>
                              <p className="font-semibold text-ink">{adm.email || 'No email'}</p>
                              <p className="text-[11px] text-ink-faint">{adm.displayName || 'Team Member'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`chip !py-0.5 !text-[10px] font-semibold uppercase ${
                              adm.role === 'super_admin'
                                ? '!border-cyan/40 !bg-cyan/15 !text-cyan'
                                : '!border-amber/40 !bg-amber/15 !text-amber'
                            }`}
                          >
                            {adm.role === 'super_admin' ? 'Super Admin' : 'Category Admin'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {adm.role === 'super_admin' ? (
                            <span className="text-ink-muted text-xs">All Categories (Unrestricted)</span>
                          ) : (
                            <select
                              value={adm.assignedCategoryId || ''}
                              onChange={(e) => handleUpdateAdminCategory(adm.id, e.target.value)}
                              aria-label="Change admin assigned category"
                              className="rounded-lg border border-line bg-surface/60 px-2.5 py-1 text-xs text-ink focus:border-violet focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {categoriesList.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-ink-faint font-mono text-[11px]">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteAdmin(adm.id, adm.displayName)}
                            className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-red-400 transition-colors"
                            title="Revoke Admin Access"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4.5: TEAM MEMBER REQUESTS (Super Admin Only)                  */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'teamRequests' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">
                  Team Member Requests ({teamRequestsList.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Review and approve requests from users who want to become team members.
                </p>
              </div>
            </div>

            {teamRequestsList.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-2">
                <UserPlus size={32} className="text-ink-faint mx-auto" />
                <p className="font-display text-sm font-semibold text-ink">
                  No pending requests
                </p>
                <p className="text-xs text-ink-muted">
                  When users submit team member requests, they'll appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamRequestsList.map((request) => (
                  <div key={request.id} className="glass-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-full bg-violet/20 flex items-center justify-center">
                            <User size={14} className="text-violet-soft" />
                          </div>
                          <div>
                            <p className="font-medium text-ink text-sm">
                              {request.user_email || request.users?.email || 'Applicant User'}
                            </p>
                            <p className="text-xs text-ink-faint">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {(request.category_name || request.categories?.name) && (
                          <div className="mb-2">
                            <span className="text-xs text-ink-muted">Requested Category: </span>
                            <span className="chip !text-xs !py-1">
                              {request.category_name || request.categories?.name}
                            </span>
                          </div>
                        )}
                        
                        {request.message && (
                          <div className="mb-3">
                            <p className="text-xs text-ink-muted mb-1">Message:</p>
                            <p className="text-sm text-ink-muted bg-white/[0.02] rounded-lg p-2 border border-line">
                              {request.message}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveTeamRequest(
                            request.id, 
                            request.user_email || request.users?.email,
                            request.requested_category_id
                          )}
                          className="btn-primary !py-2 !px-3 !text-xs"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectTeamRequest(
                            request.id, 
                            request.user_email || request.users?.email,
                            'Request rejected by admin'
                          )}
                          className="btn-ghost !py-2 !px-3 !text-xs !text-red-400 !border-red-500/30 hover:!bg-red-500/10"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: CONTACT INBOX (Super Admin Only)                          */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'messages' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">
                  Messages Inbox ({messagesList.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Direct inquiries from the public contact page.
                </p>
              </div>
            </div>

            {messagesList.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-2">
                <Inbox size={32} className="text-ink-faint mx-auto" />
                <p className="font-display text-sm font-semibold text-ink">
                  No messages yet
                </p>
                <p className="text-xs text-ink-muted">
                  When visitors submit the contact form, their notes will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5">
                {messagesList.map((msg) => (
                  <div
                    key={msg.id}
                    className={`glass-card p-4 sm:p-5 transition-all ${
                      msg.read ? 'opacity-70' : 'border-violet/40 shadow-glow'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-2 w-2 rounded-full ${msg.read ? 'bg-ink-faint' : 'bg-cyan animate-pulse'}`}
                        />
                        <span className="font-semibold text-ink text-xs sm:text-sm">{msg.name}</span>
                        <span className="text-[11px] text-ink-faint font-mono">({msg.email})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-ink-faint font-mono">
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                        </span>
                        <button
                          onClick={() => handleToggleRead(msg.id, msg.read)}
                          className="p-1 rounded-md border border-line text-ink-muted hover:text-ink"
                          title={msg.read ? 'Mark Unread' : 'Mark Read'}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded-md border border-line text-ink-muted hover:text-red-400"
                          title="Delete Message"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed whitespace-pre-wrap pl-4 border-l border-line/60">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: VAULT ANALYTICS                                            */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="glass-card p-5 sm:p-6 space-y-4">
              <h3 className="font-display font-semibold text-base sm:text-lg text-ink">
                Content Engagement Overview
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted">
                Tracking runs, copies, and views across published prompts.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-line/60">
                <div className="glass-card p-4 text-center">
                  <p className="text-[11px] text-ink-faint uppercase font-mono">Total Prompts</p>
                  <p className="font-display text-2xl font-bold text-ink mt-1">{stats.totalPrompts}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-[11px] text-ink-faint uppercase font-mono">Prompt Copies</p>
                  <p className="font-display text-2xl font-bold text-cyan mt-1">{stats.totalCopies.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-[11px] text-ink-faint uppercase font-mono">Total Views</p>
                  <p className="font-display text-2xl font-bold text-violet-soft mt-1">{stats.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 7: ACCOUNT & SECURITY                                         */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <div className="glass-card p-5 sm:p-6 space-y-4">
              <h3 className="font-display font-semibold text-base sm:text-lg text-ink">
                Security & Password
              </h3>
              <p className="text-xs text-ink-muted">
                Update your login credentials.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs text-ink-muted mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-xs text-ink focus:border-violet focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-ink-muted mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-xs text-ink focus:border-violet focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="btn-primary !py-2 text-xs w-full justify-center"
                >
                  {passwordUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: ADD / EDIT PROMPT (Multi-Image + Google Drive)           */}
      {/* ------------------------------------------------------------------ */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-3xl my-8 p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display font-semibold text-lg text-ink">
                  {editingPromptId ? 'Edit Prompt' : 'Create New Prompt'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isCategoryAdmin
                    ? 'Submitting will place this prompt into the Super Admin approval queue.'
                    : 'Configure variables, categories, images, and publish status.'}
                </p>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {/* Rejection notice if previously rejected */}
            {promptForm.rejectionReason && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-semibold text-red-200">Rejection Feedback:</p>
                  <p className="mt-0.5 leading-relaxed">{promptForm.rejectionReason}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSavePrompt} className="space-y-4 text-xs">
              {/* Title & Slug */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Prompt Title *</label>
                  <input
                    type="text"
                    required
                    value={promptForm.title}
                    onChange={(e) => handleAutoSlug(e.target.value)}
                    placeholder="e.g. High-Converting Facebook Ad Copy"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1 font-medium">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={promptForm.slug}
                    onChange={(e) => setPromptForm({ ...promptForm, slug: e.target.value })}
                    placeholder="e.g. high-converting-facebook-ad-copy"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink font-mono focus:border-violet focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-ink-muted mb-1 font-medium">
                    Category * {isCategoryAdmin && '(Locked to your assigned category)'}
                  </label>
                  <select
                    disabled={isCategoryAdmin}
                    value={promptForm.categoryId}
                    onChange={(e) => setPromptForm({ ...promptForm, categoryId: e.target.value, subcategoryId: '' })}
                    aria-label="Select prompt category"
                    className={`w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-ink focus:border-violet focus:outline-none ${
                      isCategoryAdmin ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Subcategory (Optional)</label>
                  <select
                    value={promptForm.subcategoryId}
                    onChange={(e) => setPromptForm({ ...promptForm, subcategoryId: e.target.value })}
                    aria-label="Select prompt subcategory"
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

              {/* Tags */}
              <div>
                <label className="block text-ink-muted mb-1 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={promptForm.tags}
                  onChange={(e) => setPromptForm({ ...promptForm, tags: e.target.value })}
                  placeholder="marketing, ads, facebook, copywriting"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-ink-muted mb-1 font-medium">Description (Markdown Supported)</label>
                <textarea
                  rows={2}
                  value={promptForm.description}
                  onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                  placeholder="A short overview of what this prompt accomplishes..."
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none leading-relaxed"
                />
              </div>

              {/* Prompt Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-ink-muted font-medium">
                    Prompt Template * (Use <code className="text-cyan">{'{{variable}}'}</code> for blanks)
                  </label>
                  <span className="text-[10px] text-cyan font-mono">
                    {extractVariables(promptForm.prompt).length} variables detected
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={promptForm.prompt}
                  onChange={(e) => setPromptForm({ ...promptForm, prompt: e.target.value })}
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
                    {promptForm.images.length} attached
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
                      className="btn-primary !py-2 !px-3 text-xs"
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
                      className="btn-primary !py-2 !px-3 text-xs"
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
                      {uploadError.split('\n').map((line, index) => (
                        <div key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
                          {line}
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-red-200/70 mt-2">
                      💡 <strong>Alternative:</strong> Use Google Drive Link or Direct Image URL tabs above as a workaround
                    </div>
                  </div>
                )}

                {promptForm.images.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-mono uppercase text-ink-faint font-semibold">
                      Attached Images ({promptForm.images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {promptForm.images.map((img, idx) => (
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
                            <span className="chip !py-0 !px-1.5 !text-[9px] uppercase">
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

              {/* Super Admin Status Toggle */}
              {isSuperAdmin && (
                <div className="flex items-center gap-4 pt-2 border-t border-line/60">
                  <label className="text-ink-muted font-medium">Publish Status:</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="published"
                        checked={promptForm.status === 'published'}
                        onChange={() => setPromptForm({ ...promptForm, status: 'published' })}
                      />
                      <span>Published (Live)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={promptForm.status === 'draft'}
                        onChange={() => setPromptForm({ ...promptForm, status: 'draft' })}
                      />
                      <span>Draft</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="btn-ghost !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPrompt}
                  className="btn-primary !py-2 !px-5 text-xs shadow-glow"
                >
                  {submittingPrompt ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : editingPromptId ? (
                    isCategoryAdmin ? 'Update & Resubmit for Review' : 'Save Changes'
                  ) : isCategoryAdmin ? (
                    'Submit for Review'
                  ) : (
                    'Publish Prompt'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: REJECT WITH FEEDBACK (Super Admin)                       */}
      {/* ------------------------------------------------------------------ */}
      {rejectModal.show && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 border-red-500/30">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-semibold text-base text-ink flex items-center gap-2">
                <XCircle size={18} className="text-red-400" /> Reject Prompt Submission
              </h3>
              <button
                onClick={() => setRejectModal({ show: false, promptId: null, promptTitle: '', reason: '' })}
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Rejecting <strong className="text-ink">"{rejectModal.promptTitle}"</strong>. Provide optional feedback so the Category Admin can correct and resubmit.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-muted mb-1">Rejection Reason / Feedback</label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="e.g. Please refine the variables and ensure prompt instructions are more detailed..."
                  className="w-full rounded-xl border border-line bg-surface/50 p-3 text-ink focus:border-red-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ show: false, promptId: null, promptTitle: '', reason: '' })}
                  className="btn-ghost !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectingLoading}
                  className="btn-primary !py-2 !px-4 text-xs bg-red-500 hover:bg-red-600 text-white"
                >
                  {rejectingLoading ? <Loader2 size={13} className="animate-spin" /> : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: CREATE / INVITE ADMIN (Super Admin)                      */}
      {/* ------------------------------------------------------------------ */}
      {adminModal.show && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-semibold text-base text-ink flex items-center gap-2">
                <Users size={18} className="text-cyan" /> Invite / Create Admin User
              </h3>
              <button
                onClick={() => setAdminModal({ ...adminModal, show: false })}
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-muted mb-1 font-medium">Display Name</label>
                <input
                  type="text"
                  value={adminModal.displayName}
                  onChange={(e) => setAdminModal({ ...adminModal, displayName: e.target.value })}
                  placeholder="e.g. Amna Shakeel"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  value={adminModal.email}
                  onChange={(e) => setAdminModal({ ...adminModal, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1 font-medium">Password (min 6 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminModal.password}
                  onChange={(e) => setAdminModal({ ...adminModal, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1 font-medium">Role *</label>
                <select
                  value={adminModal.role}
                  onChange={(e) => setAdminModal({ ...adminModal, role: e.target.value })}
                  aria-label="Select admin role"
                  className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                >
                  <option value="category_admin">Category Admin (Scoped Access + Approvals)</option>
                  <option value="super_admin">Super Admin (Full Unrestricted Access)</option>
                </select>
              </div>

              {adminModal.role === 'category_admin' && (
                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Assigned Category *</label>
                  <select
                    required
                    value={adminModal.assignedCategoryId}
                    onChange={(e) => setAdminModal({ ...adminModal, assignedCategoryId: e.target.value })}
                    aria-label="Select assigned category for admin"
                    className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                  >
                    <option value="">Select a category...</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAdminModal({ ...adminModal, show: false })}
                  className="btn-ghost !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="btn-primary !py-2 !px-4 text-xs shadow-glow"
                >
                  {submittingAdmin ? <Loader2 size={13} className="animate-spin" /> : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 4: CATEGORY FORM (Super Admin)                              */}
      {/* ------------------------------------------------------------------ */}
      {showCatModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-semibold text-base text-ink">
                {editingCatId ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-muted mb-1 font-medium">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name.toLowerCase().trim().replace(/[\s_-]+/g, '-')
                    setCatForm({ ...catForm, name, slug: editingCatId ? catForm.slug : slug })
                  }}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink focus:border-violet focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1 font-medium">Slug *</label>
                <input
                  type="text"
                  required
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="artificial-intelligence"
                  className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-ink font-mono focus:border-violet focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="btn-ghost !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCat}
                  className="btn-primary !py-2 !px-4 text-xs shadow-glow"
                >
                  {submittingCat ? <Loader2 size={13} className="animate-spin" /> : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ active, onClick, icon: Icon, label, badge, badgeType = 'neutral' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-xs font-medium transition-all relative ${
        active
          ? 'bg-violet/10 text-violet-soft border-l-2 border-violet pl-2 font-semibold'
          : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={15} className={active ? 'text-violet-soft' : 'text-ink-faint'} />
        <span>{label}</span>
      </div>
      {badge !== undefined && badge !== 0 && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
            badgeType === 'urgent'
              ? 'bg-amber/20 text-amber border border-amber/30'
              : 'bg-surface/80 text-ink-faint border border-line/50'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ title, value, icon: Icon, change, highlight = false }) {
  const getCardTheme = () => {
    if (title === 'Total Prompts') return { color: 'violet', blob: 'bg-violet/20' }
    if (title === 'Pending Review') return { color: 'amber', blob: 'bg-amber/20' }
    if (title === 'Total Views') return { color: 'cyan', blob: 'bg-cyan/20' }
    if (title === 'Total Copies') return { color: 'green', blob: 'bg-green-500/20' }
    return { color: 'violet', blob: 'bg-violet/20' }
  }

  const theme = getCardTheme()
  const isAllCaughtUp = title === 'Pending Review' && value === 0

  // Generate simple trend line points for sparkline
  const generateSparklinePoints = () => {
    const points = []
    const width = 60
    const height = 20
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * width
      const y = height - (Math.random() * 0.5 + 0.3) * height
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  }

  return (
    <div className="relative glass-card p-4 sm:p-5 flex flex-col justify-between transition-all overflow-hidden">
      {/* Background Glow Blob */}
      <div className={`absolute top-0 right-0 w-16 h-16 ${theme.blob} rounded-full blur-xl opacity-30`} />
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[11px] sm:text-xs font-medium text-ink-muted">{title}</span>
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            theme.color === 'violet' ? 'bg-violet/20 text-violet-soft' :
            theme.color === 'amber' ? 'bg-amber/20 text-amber' :
            theme.color === 'cyan' ? 'bg-cyan/20 text-cyan' :
            'bg-green-500/20 text-green-400'
          }`}
        >
          <Icon size={12} />
        </div>
      </div>
      
      <div className="relative z-10">
        {isAllCaughtUp ? (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-400 font-medium">All caught up</span>
          </div>
        ) : (
          <p className="font-display text-xl sm:text-2xl font-bold text-ink mb-2">
            {typeof value === 'string' ? value : value?.toLocaleString()}
          </p>
        )}
        
        {/* Animated Sparkline */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-ink-faint">{change}</span>
          <svg width="60" height="20" className="opacity-60">
            <polyline
              fill="none"
              stroke={
                theme.color === 'violet' ? '#7C5CFF' :
                theme.color === 'amber' ? '#F59E0B' :
                theme.color === 'cyan' ? '#3DD6F5' :
                '#10B981'
              }
              strokeWidth="1.5"
              points={generateSparklinePoints()}
              className="animate-draw-line"
              style={{
                strokeDasharray: '100',
                strokeDashoffset: '100'
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
