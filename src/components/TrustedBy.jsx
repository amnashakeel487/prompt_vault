import { motion } from 'framer-motion'

const TEAMS = [
  'Nova Coffee Co.',
  'Fieldstone Studio',
  'Brightloop',
  'Marrow Labs',
  'Kestrel & Co.',
  'Underline Media',
]

export default function TrustedBy() {
  return (
    <section className="border-y border-line bg-surface/30">
      <div className="section-pad py-6 sm:py-8 text-center">
        <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ink-muted/80">
          Trusted by teams shipping content faster
        </p>

        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-3 sm:gap-y-4 md:gap-x-12">
          {TEAMS.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="font-display text-xs sm:text-sm font-semibold tracking-tight text-ink-muted hover:text-ink transition-colors select-none"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}
