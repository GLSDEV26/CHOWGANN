/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D0D0D',
          secondary: '#1A1A1A',
          tertiary: '#2A2A2A',
        },
        accent: {
          DEFAULT: '#C6A756',
          light: '#D4B96A',
          dark: '#A8893E',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#AAAAAA',
          muted: '#666666',
        },
        status: {
          draft: '#666666',
          pending: '#FF9800',
          paid: '#4CAF50',
          delivered: '#2196F3',
          cancelled: '#F44336',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
