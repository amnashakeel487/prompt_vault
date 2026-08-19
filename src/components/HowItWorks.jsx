import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, ClipboardCopy } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: Search,
    title: 'Find a prompt',
    description:
      'Browse by category or search by title, tag, or description to find the prompt that fits the job.',
  },
  {
    step: '02',
    icon: SlidersHorizontal,
    title: 'Fill in the blanks',
    description:
      'PromptVault detects every {{variable}} automatically and builds a form — no editing raw text by hand.',
  },
  {
    step: '03',
    icon: ClipboardCopy,
    title: 'Copy and go',
    description:
      'Generate the final prompt and copy it in one click, ready to paste into your AI tool of choice.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section-pad py-12 sm:py-16">
      <div className="mb-8 sm:mb-10 text-center md:text-left">
        <h2 style={{ color: '#FFFFFF' }} className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white">
          How it works
        </h2>
        <p style={{ color: '#C8C4E6' }} className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-ink-muted">
          From idea to finished prompt in under a minute.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card p-5 sm:p-6 relative flex flex-col justify-between hover:shadow-glow transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/10 border border-line text-violet-soft">
                    <Icon size={18} className="sm:w-5 sm:h-5" />
                  </span>
                  <span style={{ color: '#A09ABF' }} className="font-mono text-xs font-semibold text-ink-faint">
                    {s.step}
                  </span>
                </div>

                <h3 style={{ color: '#FFFFFF' }} className="font-display font-semibold text-white text-base sm:text-lg">
                  {s.title}
                </h3>
                <p style={{ color: '#C8C4E6' }} className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {s.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
