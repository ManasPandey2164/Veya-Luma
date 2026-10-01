/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          void: '#06080E',
          base: '#0A0D14',
          surface: '#10131A',
          chamber: '#151822',
          plate: '#191B26',
          card: '#222634',
          highlight: '#2F3445',
        },
        luminous: {
          cyan: '#00F0FF',
          ultraviolet: '#8A5CFF',
          teal: '#14F195',
          amber: '#FFB443',
          crimson: '#FF4D6D',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'violet-glow': '0 0 25px -5px rgba(138, 92, 255, 0.3)',
      },
    },
  },
  plugins: [],
};
