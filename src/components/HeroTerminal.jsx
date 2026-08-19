import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { tokenizePrompt } from '../utils/variableParser'

const RAW = 'Create a Facebook Ad for {{BusinessName}} targeting {{City}}, in a {{Tone}} tone.'
const FILLED_VALUES = { BusinessName: 'Nova Coffee Co.', City: 'Austin', Tone: 'playful' }

const PHASES = { TYPING: 'typing', FILLING: 'filling', COPIED: 'copied', RESET: 'reset' }

export default function HeroTerminal() {
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState(PHASES.TYPING)

  // Typewriter effect
  useEffect(() => {
    if (phase !== PHASES.TYPING) return
    if (typed.length >= RAW.length) {
      const t = setTimeout(() => setPhase(PHASES.FILLING), 700)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTyped(RAW.slice(0, typed.length + 1)), 22)
    return () => clearTimeout(t)
  }, [typed, phase])

  // Phase machine: fill -> copied -> reset -> typing
  useEffect(() => {
    if (phase === PHASES.FILLING) {
      const t = setTimeout(() => setPhase(PHASES.COPIED), 1200)
      return () => clearTimeout(t)
    }
    if (phase === PHASES.COPIED) {
      const t = setTimeout(() => setPhase(PHASES.RESET), 1800)
      return () => clearTimeout(t)
    }
    if (phase === PHASES.RESET) {
      const t = setTimeout(() => {
        setTyped('')
        setPhase(PHASES.TYPING)
      }, 500)
      return () => clearTimeout(t)
    }
  }, [phase])

  const showFilled = phase === PHASES.FILLING || phase === PHASES.COPIED
  const tokens = tokenizePrompt(showFilled ? RAW : typed)

  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-violet/20 blur-3xl rounded-full opacity-40 animate-floatY pointer-events-none" />
      <div className="glass-card w-full max-w-xl mx-auto">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF6159]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-2 text-xs text-ink-faint font-mono">prompt.txt</span>
        </div>
        <div className="p-5 font-mono text-sm leading-relaxed min-h-[130px]">
          {tokens.map((tok, i) =>
            tok.type === 'text' ? (
              <span key={i} className="text-ink/90">{tok.value}</span>
            ) : (
              <span key={i} className={showFilled ? 'text-cyan' : 'var-highlight'}>
                {showFilled ? FILLED_VALUES[tok.value] ?? `{{${tok.value}}}` : `{{${tok.value}}}`}
              </span>
            )
          )}
          {phase === PHASES.TYPING && <span className="inline-block w-[2px] h-4 bg-violet-soft align-middle ml-0.5 animate-blink" />}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <div className="flex gap-1.5">
            <span className="chip">3 variables</span>
            <span className="chip">~24 tokens</span>
          </div>
          <AnimatePresence mode="wait">
            {phase === PHASES.COPIED ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5 text-xs font-medium text-cyan"
              >
                <Check size={14} /> Copied
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-muted"
              >
                <Copy size={14} /> Copy prompt
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
