/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        slate: { 950: '#020617' },
      },
      animation: {
        'blink':          'blink 1s step-end infinite',
        'glow-emerald':   'glow-emerald 2.5s ease-in-out infinite',
        'glow-rose':      'glow-rose 2.5s ease-in-out infinite',
        'pulse-slow':     'pulse 3s ease-in-out infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'float':          'float 6s ease-in-out infinite',
        'scan':           'scan 4s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        'glow-emerald': {
          '0%, 100%': { boxShadow: '0 0 6px rgba(16,185,129,0.25), 0 0 12px rgba(16,185,129,0.1)' },
          '50%':       { boxShadow: '0 0 24px rgba(16,185,129,0.7), 0 0 48px rgba(16,185,129,0.3)' },
        },
        'glow-rose': {
          '0%, 100%': { boxShadow: '0 0 6px rgba(244,63,94,0.25), 0 0 12px rgba(244,63,94,0.1)' },
          '50%':       { boxShadow: '0 0 24px rgba(244,63,94,0.7), 0 0 48px rgba(244,63,94,0.3)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-5px)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
