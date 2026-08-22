import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Megaphone,
  PenLine,
  Code2,
  Briefcase,
  Share2,
  Palette,
  Sparkles,
  FolderKanban,
  Terminal,
  FileText,
  Cpu,
  Compass,
  Lightbulb,
  BookOpen,
} from 'lucide-react'

const ICON_MAP = {
  Megaphone,
  PenLine,
  Code2,
  Briefcase,
  Share2,
  Palette,
  Sparkles,
  FolderKanban,
  Terminal,
  FileText,
  Cpu,
  Compass,
  Lightbulb,
  BookOpen,
}

export default function CategoryCard({ category, index = 0 }) {
  const Icon = ICON_MAP[category.icon] || Sparkles

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
    >
      <Link
        to={`/category/${category.slug}`}
        className="glass-card group flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 min-h-[64px] transition-all hover:-translate-y-1 hover:shadow-glow text-inherit"
      >
        <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/10 border border-line text-violet-soft transition-colors group-hover:text-cyan">
          <Icon size={18} className="sm:w-5 sm:h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-sm sm:text-base text-ink truncate group-hover:!text-violet-soft transition-colors">
            {category.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-ink-muted">
            {category.count ?? 0} prompts
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
