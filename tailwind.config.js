/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{vue,ts,html}",
    "./components/**/*.{vue,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

