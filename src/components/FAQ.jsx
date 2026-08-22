import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: 'Do I need an account to use PromptVault?',
    a: 'No. Browsing, filling in variables, and copying prompts is completely free and open — no login required. Accounts are only for the admin who manages the library.',
  },
  {
    q: 'What are the {{variables}} inside a prompt?',
    a: "They're placeholders like {{BusinessName}} or {{City}}. PromptVault scans each prompt, turns every placeholder into a form field automatically, and swaps in your answers when you generate the final prompt.",
  },
  {
    q: 'Which AI tools do these prompts work with?',
    a: 'Any of them — PromptVault just gives you clean, finished text. Paste the generated prompt into ChatGPT, Claude, Gemini, or whichever tool you use.',
  },
  {
    q: 'Can I suggest a prompt or request a new category?',
    a: "Yes — use the Contact page to send a request and it'll be reviewed for the next update.",
  },
  {
    q: 'How often is the library updated?',
    a: 'New prompts are added weekly, and existing ones are refined based on view and copy data.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  function toggle(index) {
    setOpenIndex((curr) => (curr === index ? null : index))
  }

  return (
    <section className="section-pad py-12 sm:py-16">
      <div className="mb-8 sm:mb-10 text-center md:text-left">
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-ink">
          Frequently asked questions
        </h2>
        <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-ink-muted">
          Everything you need to know about using PromptVault prompts.
        </p>
      </div>

      <div className="space-y-3 max-w-4xl">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={item.q}
              className={`glass-card overflow-hidden transition-all ${
                isOpen ? 'border-violet/40' : 'border-line hover:border-white/20'
              }`}
            >
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-white/[0.02] min-h-[48px] text-ink"
                aria-expanded={isOpen}
              >
                <span className="font-display font-semibold text-xs sm:text-sm md:text-base pr-3 sm:pr-4 leading-snug text-ink">
                  {item.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-colors ${
                    isOpen
                      ? 'bg-violet/20 text-violet-soft border-violet/40'
                      : 'bg-white/[0.04] text-ink-muted border-line'
                  }`}
                >
                  <Plus size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="border-t border-line/50 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 text-xs sm:text-sm text-ink-muted leading-relaxed break-words">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
