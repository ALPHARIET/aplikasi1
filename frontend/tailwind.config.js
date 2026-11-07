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
          50: '#F3F5FD',
          100: '#E6EAFB',
          500: '#3B5BDB',
          600: '#2B3FA8',
          700: '#1E2A78',
          900: '#151B54',
          950: '#0B0F33',
        },
        surface: '#FFFFFF',
        canvas: '#F6F7FB',
        border: '#E3E6F0',
        ink: '#111633',
        muted: '#5B6180',
        status: {
          valid: {
            text: '#0F766E',
            bg: '#DCFCE7',
          },
          danger: {
            text: '#B91C1C',
            bg: '#FEE2E2',
          },
          pending: {
            text: '#92400E',
            bg: '#FEF3C7',
          },
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(17, 22, 51, 0.05)',
        md: '0 4px 6px -1px rgba(17, 22, 51, 0.08), 0 2px 4px -2px rgba(17, 22, 51, 0.05)',
      },
    },
  },
  plugins: [],
}
