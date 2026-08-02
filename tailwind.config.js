/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#17201c',
          100: '#1f2a25',
          200: '#667085',
          300: '#98a2b3',
          700: '#e5e7eb',
          800: '#d1d5db',
          900: '#f9fafb',
          950: '#f6f7f9',
        },
        moss: {
          50: '#eaf5ef',
          300: '#3d9a6a',
          400: '#2f8f5f',
          500: '#287a57',
          600: '#216548',
          700: '#1a5139',
        },
        sand: {
          50: '#ffffff',
          100: '#17201c',
          200: '#344054',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '80rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
