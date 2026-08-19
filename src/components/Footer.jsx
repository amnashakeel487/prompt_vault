import { Link } from 'react-router-dom'
import { Zap, Github, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="section-pad py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan">
              <Zap size={16} strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-semibold">PromptVault</span>
          </div>
          <p className="mt-3 text-sm text-ink-muted max-w-xs">
            A curated library of ready-to-run AI prompts. Fill the variables, generate, copy, ship.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/categories" className="hover:text-white">Categories</Link></li>
            <li><Link to="/latest" className="hover:text-white">Latest Prompts</Link></li>
            <li><Link to="/popular" className="hover:text-white">Popular Prompts</Link></li>
            <li><Link to="/search" className="hover:text-white">Search</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Connect</h4>
          <div className="flex gap-3">
            <a href="#" aria-label="GitHub" className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-white/20 hover:text-white text-ink-muted">
              <Github size={16} />
            </a>
            <a href="#" aria-label="Twitter" className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-white/20 hover:text-white text-ink-muted">
              <Twitter size={16} />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center space-y-1 text-xs text-ink-faint">
        <p>© {new Date().getFullYear()} PromptVault. All rights reserved.</p>
        <p>
          Developed by <span className="text-ink-muted font-medium">Amna Shakeel</span> · A project of <span className="text-ink-muted font-medium">WeConnect Innovations</span>
        </p>
      </div>
    </footer>
  )
}
