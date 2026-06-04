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
        accent: "#8b5cf6",
        accent2: "#ec4899",
        accent3: "#f97316",
        good: "#34c759",
        bad: "#ff3b30",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
    },
  },
  plugins: [],
};
