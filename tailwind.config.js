/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "leader-blue": "#1e40af",    // tweak if you have brand hex
        "leader-accent": "#ea580c",  // orange-ish
        "leader-light": "#f8fafc",   // very light gray
      },
    },
  },
  plugins: [],
};
