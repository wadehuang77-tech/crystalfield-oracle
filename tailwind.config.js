/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 舊命名保留 — 直接重新對應到 slate / blue 系，
        // 讓現有用 ink-/gold-/ivory- 的頁面自動換上新外觀。
        ink: {
          950: '#020617', // slate-950
          900: '#0f172a', // slate-900
          850: '#1e293b', // slate-800
          800: '#1e293b', // slate-800
          700: '#334155', // slate-700
          600: '#475569', // slate-600
        },
        gold: {
          300: '#bfdbfe', // blue-200 — 高亮文字
          400: '#93c5fd', // blue-300 — accent
          500: '#3b82f6', // blue-500 — 主強調
          600: '#2563eb', // blue-600
          700: '#1d4ed8', // blue-700
        },
        ivory: {
          50:  '#f8fafc', // slate-50
          100: '#f1f5f9', // slate-100
          200: '#cbd5e1', // slate-300
          300: '#94a3b8', // slate-400
          400: '#64748b', // slate-500
          500: '#475569', // slate-600
        },
        wine: {
          500: '#f43f5e', // rose-500 — 錯誤紅
          600: '#e11d48', // rose-600
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Source Han Serif TC"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
        'slide-up': 'slideUp 0.4s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
