import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Search, Menu, X, Sun, Moon, User, LogOut } from 'lucide-react'
import { usePublicAuth } from '../context/PublicAuthContext'
import PublicAuthModal from './PublicAuthModal'

// Each nav item: `to` is the fallback page route, `hash` is the section id on Home
const links = [
  { to: '/categories', label: 'Categories', hash: 'categories' },
  { to: '/latest', label: 'Latest', hash: 'latest' },
  { to: '/popular', label: 'Popular', hash: 'popular' },
]

function scrollToSection(hash) {
  const el = document.getElementById(hash)
  if (el) {
    const navHeight = 60 // responsive sticky navbar height in px
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 12
    window.scrollTo({ top, behavior: 'smooth' })
    return true
  }
  return false
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark'
    }
    return 'dark'
  })
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = usePublicAuth()

  const isHome = location.pathname === '/'

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  function submitSearch(e) {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }

  function handleNavClickSimple(e, link) {
    e.preventDefault()
    setOpen(false)

    if (isHome) {
      scrollToSection(link.hash)
    } else {
      navigate(`/#${link.hash}`)
      setTimeout(() => scrollToSection(link.hash), 350)
    }
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-line">
        <div className="section-pad flex h-14 sm:h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-h-[44px]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan shadow-glow">
              <Zap size={16} className="text-base" strokeWidth={2.5} />
            </span>
            <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-ink">
              PromptVault
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.to}
                href={`/#${l.hash}`}
                onClick={(e) => handleNavClickSimple(e, l)}
                className="rounded-full px-4 py-2 text-sm transition-colors text-ink-muted hover:text-ink hover:bg-white/[0.05]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <form onSubmit={submitSearch} className="relative hidden md:block w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prompts, tags, categories…"
              className="w-full rounded-full border border-line bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-violet/50 focus:bg-white/[0.06]"
            />
          </form>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
                >
                  <User size={16} />
                  Account
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet hover:bg-violet-soft transition-colors shadow-glow"
              >
                <User size={16} />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger button with min 44x44px touch target */}
          <button
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white/[0.05]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden glass border-b border-line overflow-hidden shadow-2xl"
          >
            <div className="section-pad py-4 flex flex-col gap-3">
              <form onSubmit={submitSearch} className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search prompts…"
                  className="w-full rounded-lg border border-line bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-violet/50"
                />
              </form>

              {/* Mobile Theme Toggle & Auth */}
              <div className="flex items-center justify-between pt-2 border-t border-line/30">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 py-2.5 text-sm text-ink-muted hover:text-ink"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === 'dark' ? 'Light' : 'Dark'} theme
                </button>

                {user ? (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 py-2.5 text-sm text-ink-muted hover:text-ink"
                    >
                      <User size={16} />
                      Account
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setOpen(false)
                      }}
                      className="flex items-center gap-2 py-2.5 text-sm text-ink-muted hover:text-ink"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthModal(true)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-violet hover:bg-violet-soft"
                  >
                    <User size={16} />
                    Sign In
                  </button>
                )}
              </div>

              <div className="flex flex-col divide-y divide-line/30 pt-1">
                {links.map((l) => (
                  <a
                    key={l.to}
                    href={`/#${l.hash}`}
                    onClick={(e) => handleNavClickSimple(e, l)}
                    className="flex items-center min-h-[44px] py-2.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PublicAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </header>
  )
}
