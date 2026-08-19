import { SearchX } from 'lucide-react'

export default function EmptyState({ title = 'Nothing here yet', description = '', icon: Icon = SearchX }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.04] text-ink-faint">
        <Icon size={22} />
      </span>
      <h3 className="font-display font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
    </div>
  )
}
