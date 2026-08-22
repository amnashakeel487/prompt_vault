import { Link } from 'react-router-dom'
import { Zap, Github, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-line">
      <div className="section-pad py-10 sm:py-14 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan">
              <Zap size={16} strokeWidth={2.5} className="text-white" />
            </span>
            <span className="font-display text-base sm:text-lg font-semibold text-ink tracking-tight">
              PromptVault
            </span>
          </div>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-ink-muted max-w-xs leading-relaxed">
            A curated library of ready-to-run AI prompts. Fill the variables, generate, copy, ship.
          </p>
        </div>

        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-ink mb-2.5 sm:mb-3">
            Explore
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-muted">
            <li><Link to="/categories" className="hover:text-ink transition-colors">Categories</Link></li>
            <li><Link to="/latest" className="hover:text-ink transition-colors">Latest Prompts</Link></li>
            <li><Link to="/popular" className="hover:text-ink transition-colors">Popular Prompts</Link></li>
            <li><Link to="/search" className="hover:text-ink transition-colors">Search</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-ink mb-2.5 sm:mb-3">
            Company
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-muted">
            <li><Link to="/contact" className="hover:text-ink transition-colors">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-ink mb-2.5 sm:mb-3">
            Connect
          </h4>
          <div className="flex gap-2.5 sm:gap-3">
            <a
              href="https://github.com/amnashakeel487/prompt_vault"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-violet-soft hover:text-ink text-ink-muted transition-colors"
            >
              <Github size={16} />
            </a>
            <a
              href="https://www.linkedin.com/in/amna-shakeel21"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-violet-soft hover:text-ink text-ink-muted transition-colors"
            >
              <Twitter size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-line py-5 sm:py-6 text-center space-y-1.5 text-[11px] sm:text-xs text-ink-faint px-4">
        <p>© {new Date().getFullYear()} PromptVault. All rights reserved.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
          <span>Developed by</span>
          <a
            href="https://www.linkedin.com/in/amna-shakeel21"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-muted font-medium hover:text-violet-soft transition-colors"
          >
            Amna Shakeel
          </a>
          <span>·</span>
          <span>A project of</span>
          <a
            href="https://www.linkedin.com/in/abdullahwale"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-muted font-medium hover:text-violet-soft transition-colors"
          >
            WeConnect Innovations
          </a>
        </p>
      </div>
    </footer>
  )
}
