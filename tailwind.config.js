/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#e50914',
        accent2: '#ff2d3b',
        bg: '#0a0a0f',
        bg2: '#111118',
        card: '#14141e',
        border: '#1e1e2e',
        green: '#00c853',
        blue: '#2196f3',
        text: '#e8e8f0',
        text2: '#9999b0',
        text3: '#555570',
      },
      borderRadius: { DEFAULT: '10px' },
      fontFamily: { sans: ["'Segoe UI'", 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
