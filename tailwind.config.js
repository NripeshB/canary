/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aqi-good': '#22c55e',
        'aqi-moderate': '#eab308',
        'aqi-poor': '#f97316',
        'aqi-severe': '#ef4444',
        'aqi-hazardous': '#7c1d1d',
        'surface': {
          DEFAULT: '#0a0e17',
          '50': '#0f1520',
          '100': '#141c2b',
          '200': '#1a2436',
          '300': '#222e42',
        },
        'accent': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
