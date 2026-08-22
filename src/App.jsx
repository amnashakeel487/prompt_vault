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
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const UserAccount = lazy(() => import('./pages/UserAccount'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Contact = lazy(() => import('./pages/Contact'))

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
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/system-access')

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
                          <PageTransition><AdminDashboard /></PageTransition>
                        </ProtectedRoute>
                      }
                    />
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
