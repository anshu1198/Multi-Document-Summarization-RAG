/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#dbe4fd',
          300: '#bfd0fc',
          400: '#9bb3f9',
          500: '#7590f5',
          600: '#4f6bf0', // Primary accent indigo
          700: '#3b52d9',
          800: '#2b3ea6',
          900: '#1e2c73',
          950: '#0f172a', // Deep navy
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
