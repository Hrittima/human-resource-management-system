/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          50: "#eef1fb",
          100: "#d7ddf5",
          200: "#b0bceb",
          300: "#8899e0",
          400: "#5f75d3",
          500: "#3450c4",
          600: "#2740a3", // primary royal blue
          700: "#1f3383",
          800: "#182662",
          900: "#111a45",
        },
        slate: {
          50: "#f5f6f8",
          100: "#e8eaee",
          200: "#d3d6dd",
          300: "#b3b8c2",
          400: "#8b91a0",
          500: "#6b7182",
          600: "#535868",
          700: "#3f4351",
          800: "#2a2d38",
          900: "#181a21",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        card: "0 20px 45px -20px rgba(17, 26, 69, 0.35)",
      },
    },
  },
  plugins: [],
};
