// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'leader-blue': '#1d4ed8',     // tweak as you like
        'leader-accent': '#ea580c',   // tweak as you like
        'leader-light': '#f8fafc',    // e.g. slate-50
      },
    },
  },
  plugins: [],
}
