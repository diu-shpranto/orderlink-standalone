/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Orderlink ব্র্যান্ড রং — সবুজ #006a4e, লাল #f42a41
        brand: {
          DEFAULT: '#006a4e',
          dark: '#004d39',
          light: '#e6f4ef',
        },
        accent: {
          DEFAULT: '#f42a41',
          dark: '#c81e30',
        },
      },
    },
  },
  plugins: [],
}
