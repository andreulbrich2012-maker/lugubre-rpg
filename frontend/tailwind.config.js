export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        abyss: 'var(--color-abyss)',
        blood: 'var(--color-blood)',
        ember: 'var(--color-ember)',
        mist: 'var(--color-mist)',
        lead: 'var(--color-lead)',
        bone: 'var(--color-bone)',
        glass: 'var(--glass-1)'
      },
      borderRadius: {
        md: '2px',
        lg: '3px',
        xl: '4px',
        '2xl': '6px'
      },
      boxShadow: {
        glow: '0 0 40px -8px rgb(var(--light) / .45)'
      },
      fontFamily: {
        display: ['"Grenze Gotisch"', 'Georgia', 'serif'],
        body: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
