/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        sub: "var(--sub)",
        card: "var(--card)",
        line: "var(--line)",
        accent: "var(--wine)",
        accent2: "var(--gold)",
        accent3: "var(--gold)",
        good: "var(--good)",
        bad: "var(--bad)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
    },
  },
  plugins: [],
};
