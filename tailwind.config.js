/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'leader-blue': '#1a374d', // Dark blue background
        'leader-accent': '#f97316', // Orange accent
        'leader-light': '#fef3c7', // Creamy white
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
