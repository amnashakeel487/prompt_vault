import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Copy, Flame } from 'lucide-react'
import { extractVariables } from '../utils/variableParser'
import FavoriteButton from './FavoriteButton'

export default function PromptCard({ prompt, index = 0, onAuthRequired }) {
  const promptText = prompt?.prompt || ''
  const varCount = Array.isArray(prompt?.variables) && prompt.variables.length > 0
    ? prompt.variables.length
    : extractVariables(promptText).length

  const featuredFromList = Array.isArray(prompt?.images)
    ? prompt.images.find((img) => img.isFeatured)?.imageUrl || prompt.images[0]?.imageUrl
    : null

  const imageUrl =
    featuredFromList ||
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
      className="h-full"
    >
      <div className="glass-card group flex flex-col justify-between h-full transition-transform hover:-translate-y-1 hover:shadow-glow relative">
        {/* Favorite Button */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
          <FavoriteButton
            promptId={prompt.id}
            initialCount={prompt.favorites_count || 0}
            size={14}
            onAuthRequired={onAuthRequired}
          />
        </div>

        <Link
          to={`/prompt/${prompt.slug}`}
          className="flex flex-col justify-between h-full text-inherit"
        >
          <div>
            <div className="relative h-36 sm:h-40 w-full overflow-hidden aspect-[16/10]">
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
                <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 chip !border-amber/30 !bg-amber/10 !text-amber flex items-center gap-1 text-[10px] sm:text-xs">
                  <Flame size={12} /> Trending
                </span>
              )}
            </div>
            <div className="p-3.5 sm:p-4">
              <h3
                style={{ color: '#FFFFFF' }}
                className="font-display text-sm sm:text-base font-semibold text-white line-clamp-1 group-hover:!text-violet-soft transition-colors"
              >
                {prompt.title}
              </h3>
              <p
                style={{ color: '#C8C4E6' }}
                className="mt-1.5 text-xs sm:text-sm text-ink-muted line-clamp-2 leading-relaxed"
              >
                {prompt.description}
              </p>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 sm:gap-1.5">
                  {tags.slice(0, 3).map((t) => (
                    <span key={t} className="chip !text-[10px] sm:!text-xs !py-0.5">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 pt-0 mt-2 border-t border-line/40 flex items-center justify-between text-[11px] sm:text-xs text-ink-faint">
            <span className="font-mono">{varCount} vars</span>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex items-center gap-1">
                <Eye size={12} /> {(prompt.views || 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Copy size={12} /> {(prompt.copies || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  )
}
