export default {
  darkMode: ['selector', '[data-theme="dark"]'],
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
          violet: '#7038FF',
          teal: '#14F195',
          'teal-deep': '#00D2B4',
          amber: '#FFB443',
          'amber-solar': '#E87A30',
          crimson: '#FF4D6D',
          'crimson-deep': '#D82855',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        full: '9999px',
      },
      maxWidth: {
        canvas: '1440px',
        content: '1320px',
      },
      transitionTimingFunction: {
        micro: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        card: 'cubic-bezier(0.16, 1, 0.3, 1)',
        stage: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      boxShadow: {
        'cyan-glow': '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'violet-glow': '0 0 25px -5px rgba(138, 92, 255, 0.3)',
        'teal-glow': '0 0 25px -5px rgba(20, 241, 149, 0.3)',
        'amber-glow': '0 0 25px -5px rgba(255, 180, 67, 0.3)',
        'crimson-glow': '0 0 25px -5px rgba(255, 77, 109, 0.3)',
        'focus-cyan': '0 0 0 2px #06080E, 0 0 0 4px rgba(0, 240, 255, 0.65)',
      },
    },
  },
  plugins: [],
};

