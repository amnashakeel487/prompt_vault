import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import SEO from '../components/SEO'

export default function NotFound() {
  return (
    <section className="section-pad flex min-h-[70vh] flex-col items-center justify-center text-center py-16">
      <SEO title="Page not found" description="The page you're looking for doesn't exist." />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-7xl font-semibold bg-gradient-to-r from-violet-soft to-cyan bg-clip-text text-transparent"
      >
        404
      </motion.p>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">This prompt doesn't exist</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page may have been moved, unpublished, or the URL might be mistyped.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <Home size={16} /> Back to home
      </Link>
    </section>
  )
}
