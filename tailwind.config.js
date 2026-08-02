/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6f5',
          100: '#e3e8e5',
          200: '#c5d0ca',
          700: '#2f3d38',
          900: '#121a17',
          950: '#0a100e',
        },
        moss: {
          400: '#6f9b7a',
          500: '#4f7d5c',
          600: '#3d6349',
        },
        sand: {
          100: '#efe8dc',
          200: '#e2d5c2',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
