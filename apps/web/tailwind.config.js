/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Hind Siliguri"',
          '"Noto Sans Bengali"',
          'system-ui',
          '-apple-system',
          "'Segoe UI'",
          'sans-serif',
        ],
      },
      colors: {
        // Orderlink ব্র্যান্ড রং — সবুজ #006a4e, লাল #f42a41
        brand: {
          DEFAULT: '#006a4e',
          dark: '#004d39',
          deep: '#003d2c',
          light: '#e6f4ef',
          mint: '#dcefe7',
        },
        accent: {
          DEFAULT: '#f42a41',
          dark: '#c81e30',
        },
        // লাইভ অ্যাপের উষ্ণ ক্রিম / পোরসেলিন পটভূমি
        cream: '#f7f5f0',
        porcelain: '#faf8f5',
      },
    },
  },
  plugins: [],
}
