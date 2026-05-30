/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAF7F2',
          primary: '#8B2500',
          accent: '#D4641A',
          text: '#1A1A1A',
          muted: '#6B6B6B'
        },
        surface: {
          DEFAULT: '#fbf9f4',
          dim: '#dbdad5',
          bright: '#fbf9f4',
          'container-lowest': '#ffffff',
          'container-low': '#f5f3ee',
          container: '#f0eee9',
          'container-high': '#eae8e3',
          'container-highest': '#e4e2dd',
          tint: '#a04100',
          variant: '#e4e2dd'
        },
        primary: {
          DEFAULT: '#9c3f00',
          container: '#c05410',
          fixed: '#ffdbcc',
          'fixed-dim': '#ffb693'
        },
        secondary: {
          DEFAULT: '#7c5800',
          container: '#fec24a',
          fixed: '#ffdea7',
          'fixed-dim': '#f8bd45'
        },
        tertiary: {
          DEFAULT: '#575980',
          container: '#6f719a',
          fixed: '#e1e0ff',
          'fixed-dim': '#c2c3f0'
        },
        on: {
          surface: '#1b1c19',
          'surface-variant': '#574239',
          primary: '#ffffff',
          'primary-container': '#fffbff',
          'primary-fixed': '#351000',
          'primary-fixed-variant': '#7a3000',
          secondary: '#ffffff',
          'secondary-container': '#715000',
          'secondary-fixed': '#271900',
          'secondary-fixed-variant': '#5e4200',
          tertiary: '#ffffff',
          'tertiary-container': '#fffbff',
          'tertiary-fixed': '#16183b',
          'tertiary-fixed-variant': '#41436a',
          error: '#ffffff',
          'error-container': '#93000a',
          background: '#1b1c19'
        },
        inverse: {
          surface: '#30312e',
          'on-surface': '#f2f1ec',
          primary: '#ffb693'
        },
        outline: {
          DEFAULT: '#8b7267',
          variant: '#dec0b4'
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6'
        },
        background: '#fbf9f4',
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(30, 32, 68, 0.08), 0 2px 4px -1px rgba(30, 32, 68, 0.04)',
      },
      backgroundImage: {
        'jaali-pattern': "url('/assets/jaali-pattern.svg')",
      }
    },
  },
  plugins: [],
}
