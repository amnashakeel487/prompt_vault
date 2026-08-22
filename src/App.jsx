import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { PublicAuthProvider } from './context/PublicAuthContext'

// Lazy-loaded route chunks for performance
const Home = lazy(() => import('./pages/Home'))
const Categories = lazy(() => import('./pages/Categories'))
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'))
const PromptDetails = lazy(() => import('./pages/PromptDetails'))
const SearchResults = lazy(() => import('./pages/SearchResults'))
const Latest = lazy(() => import('./pages/Latest'))
const Popular = lazy(() => import('./pages/Popular'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const SystemLogin = lazy(() => import('./pages/SystemLogin'))
const TeamDashboard = lazy(() => import('./pages/TeamDashboard'))
const UserAccount = lazy(() => import('./pages/UserAccount'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Contact = lazy(() => import('./pages/Contact'))

// Lazy load AdminDashboard with error fallback
const AdminDashboard = lazy(() => 
  import('./pages/AdminDashboard').catch(err => {
    console.error('Failed to load AdminDashboard:', err)
    // Return a fallback component
    return {
      default: () => (
        <div className="min-h-screen bg-base text-ink flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <h2 className="text-xl font-semibold text-red-400">Dashboard Loading Error</h2>
            <p className="text-sm text-ink-muted max-w-md">
              The admin dashboard failed to load. This might be a temporary issue.
            </p>
            <div className="space-x-3">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-violet text-white rounded-lg hover:bg-violet-soft transition-colors"
              >
                Reload Page
              </button>
              <button 
                onClick={() => window.location.href = '/system-access/login'} 
                className="px-4 py-2 border border-line text-ink-muted rounded-lg hover:bg-white/5 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      )
    }
  })
)

function RouteFallback() {
  return (
    <div className="section-pad flex min-h-[50vh] items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet border-t-transparent" />
    </div>
  )
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/system-access') || 
                      location.pathname.startsWith('/team')

  return (
    <AuthProvider>
      <PublicAuthProvider>
        <div className="flex min-h-screen flex-col bg-base">
          {!isAdminRoute && <Navbar />}
          <main className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                    <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
                    <Route path="/category/:slug" element={<PageTransition><CategoryDetail /></PageTransition>} />
                    <Route path="/prompt/:slug" element={<PageTransition><PromptDetails /></PageTransition>} />
                    <Route path="/search" element={<PageTransition><SearchResults /></PageTransition>} />
                    <Route path="/latest" element={<PageTransition><Latest /></PageTransition>} />
                    <Route path="/popular" element={<PageTransition><Popular /></PageTransition>} />
                    <Route path="/account" element={<PageTransition><UserAccount /></PageTransition>} />
                    <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
                    <Route path="/system-access/login" element={<PageTransition><SystemLogin /></PageTransition>} />
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute>
                          <ErrorBoundary fallback={
                            <div className="min-h-screen bg-base text-ink flex items-center justify-center">
                              <div className="text-center space-y-4 p-8">
                                <h2 className="text-xl font-semibold text-red-400">Dashboard Error</h2>
                                <p className="text-sm text-ink-muted max-w-md">
                                  The admin dashboard encountered an error. Please try refreshing the page.
                                </p>
                                <button 
                                  onClick={() => window.location.reload()} 
                                  className="px-4 py-2 bg-violet text-white rounded-lg hover:bg-violet-soft transition-colors"
                                >
                                  Reload Dashboard
                                </button>
                              </div>
                            </div>
                          }>
                            <PageTransition><AdminDashboard /></PageTransition>
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/team/dashboard" element={<PageTransition><TeamDashboard /></PageTransition>} />
                    <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
                    <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
                    <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
                    <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                  </Routes>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>
          {!isAdminRoute && <Footer />}
        </div>
      </PublicAuthProvider>
    </AuthProvider>
  )
}
