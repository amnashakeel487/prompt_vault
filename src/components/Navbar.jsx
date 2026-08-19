import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Search, Menu, X } from 'lucide-react'

// Each nav item: `to` is the fallback page route, `hash` is the section id on Home
const links = [
  { to: '/categories', label: 'Categories', hash: 'categories' },
  { to: '/latest',     label: 'Latest',     hash: 'latest'     },
  { to: '/popular',    label: 'Popular',    hash: 'popular'    },
]

function scrollToSection(hash) {
  const el = document.getElementById(hash)
  if (el) {
    const navHeight = 64 // sticky navbar height in px
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16
    window.scrollTo({ top, behavior: 'smooth' })
    return true
  }
  return false
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'

  function handleNavClick(e, link) {
    e.preventDefault()
    setOpen(false)

    if (isHome) {
      // Already on home — just smooth-scroll to section
      scrollToSection(link.hash)
    } else {
      // Navigate to home first, then scroll after the page mounts
      navigate('/', { state: { scrollTo: link.hash } })
    }
  }

  function submitSearch(e) {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }

  // After navigating to home, scroll to the target section
  // (handled via useEffect in the links themselves — the state is read in Home)
  // Simpler: just use hash navigation after push
  function handleNavClickSimple(e, link) {
    e.preventDefault()
    setOpen(false)

    if (isHome) {
      scrollToSection(link.hash)
    } else {
      // Navigate to home with hash so browser auto-scrolls
      navigate(`/#${link.hash}`)
      // Give the page time to mount, then scroll
      setTimeout(() => scrollToSection(link.hash), 300)
    }
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-line">
        <div className="section-pad flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan shadow-glow">
              <Zap size={16} className="text-base" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">PromptVault</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.to}
                href={`/#${l.hash}`}
                onClick={(e) => handleNavClickSimple(e, l)}
                className="rounded-full px-4 py-2 text-sm transition-colors text-ink-muted hover:text-white hover:bg-white/[0.04]"
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

          <button className="md:hidden text-ink" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
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
            className="md:hidden glass border-b border-line overflow-hidden"
          >
            <div className="section-pad py-4 flex flex-col gap-3">
              <form onSubmit={submitSearch} className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search prompts…"
                  className="w-full rounded-full border border-line bg-white/[0.03] py-2 pl-9 pr-4 text-sm outline-none"
                />
              </form>
              {links.map((l) => (
                <a
                  key={l.to}
                  href={`/#${l.hash}`}
                  onClick={(e) => handleNavClickSimple(e, l)}
                  className="text-sm text-ink-muted hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
