/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF7F2',
        primary: '#C17A3A',
        primaryHover: '#A8662F',
      },
      fontSize: {
        base: '1.125rem', // 18px, 比默认大20%
        lg: '1.35rem',   // 21.6px
        xl: '1.8rem',    // 28.8px
        '2xl': '2.25rem', // 36px
      },
    },
  },
  plugins: [],
}