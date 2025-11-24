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
        'primary': '#2563eb',     // Azul principal para botones y highlights (inspirado en el logo)
        'primary-dark': '#1d4ed8', // Un azul más oscuro para hovers
        'secondary': '#1e293b',   // El color de fondo oscuro para el layout (azul-grisáceo)
        'accent': '#60a5fa',      // El azul claro del "glow" para acentos sutiles
        'light-bg': '#f1f5f9',    // Fondo claro para el área de contenido principal (casi blanco)
        'light-card': '#ffffff',  // Blanco puro para tarjetas
        'text-dark': '#0f172a',   // Texto muy oscuro para fondos claros
        'text-light': '#cbd5e1',  // Texto claro para fondos oscuros
        'text-light-hover': '#f1f5f9', // Texto más brillante para hovers en el sidebar
      }
    },
  },
  plugins: [],
}