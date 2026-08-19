import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Copy, Flame } from 'lucide-react'
import { extractVariables } from '../utils/variableParser'

export default function PromptCard({ prompt, index = 0 }) {
  const promptText = prompt?.prompt || ''
  const varCount = Array.isArray(prompt?.variables) && prompt.variables.length > 0
    ? prompt.variables.length
    : extractVariables(promptText).length

  const imageUrl =
    prompt?.featuredImage ||
    prompt?.featured_image ||
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop'

  const tags = Array.isArray(prompt?.tags) ? prompt.tags : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        to={`/prompt/${prompt.slug}`}
        className="glass-card group block h-full transition-transform hover:-translate-y-1 hover:shadow-glow"
      >
        <div className="relative h-40 w-full overflow-hidden aspect-[16/10]">
          <img
            src={imageUrl}
            alt={prompt.title}
            loading="lazy"
            width={400}
            height={250}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          {prompt.trending && (
            <span className="absolute top-3 left-3 chip !border-amber/30 !bg-amber/10 !text-amber flex items-center gap-1">
              <Flame size={12} /> Trending
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-base font-semibold text-ink line-clamp-1">{prompt.title}</h3>
          <p className="mt-1.5 text-sm text-ink-muted line-clamp-2">{prompt.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
            <span className="font-mono">{varCount} variables</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {(prompt.views || 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Copy size={13} /> {(prompt.copies || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
