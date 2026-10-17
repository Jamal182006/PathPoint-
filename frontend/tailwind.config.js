/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', ...defaultTheme.fontFamily.sans],
        display: ['Inter Variable', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Semantic status scales (stable meaning across the app).
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          600: '#e11d48',
          700: '#be123c',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 10px 24px -16px rgb(15 23 42 / 0.22)',
        elevated: '0 4px 12px -4px rgb(15 23 42 / 0.10), 0 16px 40px -20px rgb(15 23 42 / 0.24)',
        popover: '0 8px 20px -8px rgb(15 23 42 / 0.14), 0 24px 56px -24px rgb(15 23 42 / 0.30)',
      },
      borderRadius: {
        '3xl': '1.25rem',
      },
      letterSpacing: {
        tightest: '-0.03em',
        caps: '0.06em',
      },
      maxWidth: {
        measure: '70ch',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
