/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFFFF',
          100: '#FFFDF9',
          200: '#FDF6EE',
          300: '#F5EBE0',
          400: '#E8DCCE',
          500: '#D6C4B0',
        },
        rust: {
          50: '#FDF3ED',
          100: '#FBE4D6',
          200: '#F7C4A7',
          300: '#F09D70',
          400: '#E67A3D',
          500: '#D96B27', // Primary Accent
          600: '#C55A1A',
          700: '#A14412',
          800: '#7E3411',
          900: '#5C250E',
        },
        peach: {
          100: '#FDF2E9',
          200: '#F7DFCC',
          300: '#EEBD9B',
          800: '#8C4A1E',
        },
        espresso: {
          100: '#E7E5E4',
          400: '#786F68',
          700: '#44403C',
          800: '#282524',
          900: '#1C1917',
          950: '#141211',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Oswald', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'warm': '0 2px 8px -2px rgba(40, 37, 36, 0.05), 0 1px 3px -1px rgba(40, 37, 36, 0.03)',
        'warm-md': '0 4px 16px -4px rgba(40, 37, 36, 0.08), 0 2px 6px -2px rgba(40, 37, 36, 0.04)',
        'rust': '0 4px 14px -2px rgba(217, 107, 39, 0.35)',
      }
    },
  },
  plugins: [],
}
