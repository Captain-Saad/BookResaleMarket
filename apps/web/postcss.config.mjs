// Tailwind v4 runs as a single PostCSS plugin; it scans our files for class names
// and generates only the CSS those classes need.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
