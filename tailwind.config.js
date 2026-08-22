/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--color-base)',
          soft: 'var(--color-base-soft)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
        },
        line: 'var(--color-line)',
        violet: {
          DEFAULT: 'var(--color-violet)',
          soft: 'var(--color-violet-soft)',
          dim: 'var(--color-violet-dim)',
        },
        cyan: {
          DEFAULT: 'var(--color-cyan)',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          faint: 'var(--color-ink-faint)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-glow': 'var(--bg-grid-glow)',
        'card-sheen': 'var(--bg-card-sheen)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        floatY: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        floatY: 'floatY 5s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
