export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        abyss: 'var(--color-abyss)',
        blood: 'var(--color-blood)',
        ember: 'var(--color-ember)',
        mist: 'var(--color-mist)'
      },
      boxShadow: {
        glow: '0 0 40px rgba(143, 29, 44, .35)'
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
