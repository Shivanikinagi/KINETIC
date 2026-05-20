/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        kinetic: {
          bg: '#0b0d10',
          card: 'rgba(18,22,28,0.7)',
          cyan: '#22d3ee',
          emerald: '#34d399',
          violet: '#a78bfa',
          amber: '#fbbf24',
        }
      }
    },
  },
  plugins: [],
}
