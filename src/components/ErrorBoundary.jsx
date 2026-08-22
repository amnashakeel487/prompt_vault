import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base text-ink flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 sm:p-8 text-center space-y-4 border-red-500/30 shadow-glow">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white font-display">Something went wrong</h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                An unexpected error occurred while rendering this page.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="rounded-xl bg-black/40 border border-line p-3 text-left">
                <p className="text-[11px] font-mono text-red-300 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="btn-primary flex-1 justify-center !py-2.5 text-xs"
              >
                <RefreshCw size={14} /> Reload Page
              </button>
              <a
                href="/"
                className="btn-ghost flex-1 justify-center !py-2.5 text-xs border border-line"
              >
                <Home size={14} /> Back to Home
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
