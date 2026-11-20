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
        // Identitas visual unib.ac.id (warna merek halaman publik)
        unib: {
          navy: '#15236A',
          deep: '#00204C',
          night: '#0E1850',
          elevated: '#0B2D63', // kartu UI di atas hero navy
          yellow: '#FBEB00',
          blue: '#1565C0',
        },
        // Netral dan semantik halaman publik, diambil dari sistem desain Coinbase
        pub: {
          ink: '#0A0B0D',
          body: '#5B616E',
          muted: '#5F6670',
          line: '#DEE1E6',
          soft: '#F7F7F7',
          strong: '#EEF0F3',
          up: '#05B169',
          down: '#CF202F',
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
        // Huruf navbar unib.ac.id (Helvetica; di Windows tampil sebagai Arial, sama seperti situs aslinya)
        unib: ['Helvetica', 'Arial', 'sans-serif'],
        // Huruf dokumen resmi kampus, dipakai untuk transkrip contoh di landing page
        transcript: ['"Times New Roman"', 'Times', '"Liberation Serif"', 'serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(17, 22, 51, 0.05)',
        md: '0 4px 6px -1px rgba(17, 22, 51, 0.08), 0 2px 4px -2px rgba(17, 22, 51, 0.05)',
        // Satu-satunya tingkat bayangan di halaman publik (Coinbase)
        soft: '0 4px 12px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
