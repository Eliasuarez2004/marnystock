// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#CC0033', // Rojo principal del logo
        'secondary': '#333333', // Gris oscuro/negro del logo
        'accent': '#F5F5F5', // Un gris muy claro para fondos
      }
    },
  },
  plugins: [],
}