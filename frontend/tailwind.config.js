export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#07070a',
        blood: '#8f1d2c',
        ember: '#d6a65f',
        mist: '#b8b0a1'
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
