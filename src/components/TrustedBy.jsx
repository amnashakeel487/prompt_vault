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
      <div className="section-pad py-8 text-center">
        <p className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">
          Trusted by teams shipping content faster
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {TEAMS.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="font-display text-sm font-semibold tracking-tight text-ink-faint transition-colors hover:text-ink-muted select-none"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}
