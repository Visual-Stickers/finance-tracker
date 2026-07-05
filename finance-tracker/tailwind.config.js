/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg1: 'var(--bg1)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        border: 'var(--border)',
        text1: 'var(--text1)',
        text2: 'var(--text2)',
        text3: 'var(--text3)',
        blue: 'var(--blue)',
        green: 'var(--green)',
        red: 'var(--red)',
        yellow: 'var(--yellow)',
        orange: 'var(--orange)',
        purple: 'var(--purple)',
      },
      borderRadius: {
        s: 'var(--radius-s)',
        m: 'var(--radius-m)',
      },
    },
  },
  plugins: [],
};
