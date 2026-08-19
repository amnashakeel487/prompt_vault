/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0A0A12',
          soft: '#0E0D18',
        },
        surface: {
          DEFAULT: '#14131F',
          2: '#1B1A2B',
        },
        line: 'rgba(255,255,255,0.08)',
        violet: {
          DEFAULT: '#7C5CFF',
          soft: '#9B82FF',
          dim: '#5A3FD9',
        },
        cyan: {
          DEFAULT: '#3DD6F5',
        },
        amber: {
          DEFAULT: '#FFB86B',
        },
        ink: {
          DEFAULT: '#F4F2FF',
          muted: '#9C96B8',
          faint: '#645F80',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 0%, rgba(124,92,255,0.18), transparent 45%), radial-gradient(circle at 85% 15%, rgba(61,214,245,0.12), transparent 40%)',
        'card-sheen':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,0.25), 0 8px 30px -8px rgba(124,92,255,0.45)',
        card: '0 4px 24px -8px rgba(0,0,0,0.5)',
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
