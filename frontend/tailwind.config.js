/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          canvas: '#EDF1F9',       // Soft periwinkle/lavender-blue outer frame
          card: '#FFFFFF',         // Crisp white workspace & cards
          surface: '#F5F6F9',      // Content background / table header / secondary panel
          subtle: '#FAFBFD',       // Ultra light surface
          primary: '#202938',      // Deep navy-grey primary text
          secondary: '#858D9A',    // Muted grey secondary text
          accent: '#7187E8',       // Accent periwinkle blue
          accentHover: '#5E75DE',  // Darker accent on hover
          accentSoft: '#EEF2FF',   // Soft blue active pill / badge background
          border: '#E8EBF1',       // Crisp thin border
          borderLight: '#F0F2F7',  // Very subtle divider
          success: '#10B981',      // Soft emerald green
          successBg: '#ECFDF5',
          warning: '#F59E0B',      // Soft amber orange
          warningBg: '#FFFBEB',
          danger: '#EF4444',
          dangerBg: '#FEF2F2',
        },
        brand: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#dbe4fd',
          300: '#bfd0fc',
          400: '#9bb3f9',
          500: '#7187e8',
          600: '#5e75de',
          700: '#485ec9',
          800: '#2b3ea6',
          900: '#202938',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'workspace': '0 8px 30px rgba(113, 135, 232, 0.08), 0 2px 8px rgba(32, 41, 56, 0.04)',
        'card': '0 1px 3px rgba(32, 41, 56, 0.05), 0 1px 2px rgba(32, 41, 56, 0.02)',
        'hover': '0 4px 12px rgba(113, 135, 232, 0.12), 0 2px 4px rgba(32, 41, 56, 0.04)',
        'modal': '0 20px 40px -8px rgba(32, 41, 56, 0.2)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
