/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 24px 60px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};
