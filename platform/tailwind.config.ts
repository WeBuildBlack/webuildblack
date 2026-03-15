import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          'dark-brown': '#2C170B',
          'medium-brown': '#7D4E21',
          'warm-brown': '#AE8156',
          'dark-olive': '#200E03',
          gold: '#f4cf64',
          'near-black': '#110903',
          'dark-gray': '#373942',
          'medium-gray': '#767678',
          'light-gray': '#e3e2db',
          'off-white': '#f7f7f7',
        },
      },
      fontFamily: {
        heading: ['Arvo', 'serif'],
        body: ['Jura', 'sans-serif'],
        accent: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
