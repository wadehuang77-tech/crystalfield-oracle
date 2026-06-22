/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tarot app palette (ink/gold map to slate/blue)
        ink: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        gold: {
          300: '#bfdbfe',
          400: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        ivory: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
        },
        wine: {
          500: '#f43f5e',
          600: '#e11d48',
        },
        // Numerology / crystal app palette
        cosmic: {
          950: '#07040f',
          900: '#0b0818',
          800: '#100d1e',
          700: '#160f2a',
          600: '#1e1438',
          500: '#2a1d50',
          400: '#3b2a6e',
        },
        nebula: {
          900: '#0d0b21',
          800: '#130f2e',
          700: '#1a1440',
          600: '#231b55',
        },
        aurora: {
          gold:   '#fbbf24',
          rose:   '#f472b6',
          blue:   '#60a5fa',
          teal:   '#2dd4bf',
          violet: '#a78bfa',
        },
        crystal: {
          teal:    '#5eead4',
          rose:    '#fda4af',
          sky:     '#7dd3fc',
          amber:   '#fcd34d',
          emerald: '#6ee7b7',
          violet:  '#c4b5fd',
        },
        sage: {
          400: '#a3b899',
          500: '#7a9e6e',
          600: '#4a6741',
        },
        bronze: {
          400: '#cd9b6a',
          500: '#b07d4a',
        },
      },
      fontFamily: {
        // Playfair first so Latin glyphs use it; Chinese falls through to Noto Serif TC
        serif: ['"Playfair Display"', '"Noto Serif TC"', '"Source Han Serif TC"', 'Georgia', 'serif'],
        sans:  ['"Inter"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.6s ease-out both',
        'slide-up':     'slideUp 0.4s ease-out both',
        'float':        'float 6s ease-in-out infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':    'spin 20s linear infinite',
        'shimmer':      'shimmer 3s linear infinite',
        'glow':         'glow 3s ease-in-out infinite alternate',
        'breathe':      'breathe 4s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
        'nebula-drift': 'nebula-drift 20s ease-in-out infinite',
        'aurora-flow':  'aurora-flow 12s ease-in-out infinite',
        'star-twinkle': 'star-twinkle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 20px rgba(167,139,250,0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(167,139,250,0.5), 0 0 80px rgba(167,139,250,0.2)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%':      { transform: 'scale(1.07)', opacity: '1' },
        },
        'nebula-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.6' },
          '33%':      { transform: 'translate(3%, 2%) scale(1.05)', opacity: '0.8' },
          '66%':      { transform: 'translate(-2%, 3%) scale(0.97)', opacity: '0.5' },
        },
        'aurora-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'star-twinkle': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.3)' },
        },
      },
      boxShadow: {
        'glow-gold':   '0 0 20px rgba(251,191,36,0.3), 0 0 60px rgba(251,191,36,0.1)',
        'glow-violet': '0 0 20px rgba(167,139,250,0.3), 0 0 60px rgba(167,139,250,0.1)',
        'glow-teal':   '0 0 20px rgba(94,234,212,0.3), 0 0 60px rgba(94,234,212,0.1)',
      },
    },
  },
  plugins: [],
};
