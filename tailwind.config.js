// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'leader-blue': '#1d4ed8',
        'leader-accent': '#ea580c',
        'leader-light': '#fff7ed',
      },
    },
  },
  plugins: [],
};
