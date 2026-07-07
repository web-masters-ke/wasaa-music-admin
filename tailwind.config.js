/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        // "brick" is the semantic brand-accent slot. We keep the class name
        // (widely used across components) but swap the hue to the Wasaa
        // music-blue palette so the whole app rebrands from one place.
        brick: {
          DEFAULT: '#0081FF',
          50:  '#E6F1FF',
          100: '#CCE3FF',
          200: '#99C8FF',
          300: '#66ACFF',
          400: '#3391FF',
          500: '#0081FF',
          600: '#0066CC',
          700: '#004C99',
          800: '#003366',
          900: '#001A33',
        },
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        border:      'var(--border)',
        text:        'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent:      '#0081FF',
        success:     '#10B981',
        warning:     '#F59E0B',
        destructive: '#FF3B30',
        info:        '#3B82F6',
      },
    },
  },
  plugins: [],
};
