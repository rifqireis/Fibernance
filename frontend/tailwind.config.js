/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Color Palette: Minimalist Luxury (Monochromatic)
      colors: {
        // Whites
        white: "#FFFFFF",
        off_white: "#FAFAFA",

        // Blacks & Grays
        black: "#000000",
        charcoal: "#333333",
        gray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EBEBEB",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#808080",
          600: "#666666",
          700: "#444444",
          800: "#333333",
          900: "#1A1A1A",
        },

        // Use only these for accents (spare use)
        neutral: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EBEBEB",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#808080",
          600: "#666666",
          700: "#444444",
          800: "#333333",
          900: "#1A1A1A",
        },
      },

      // Typography: Serif + Sans-Serif
      fontFamily: {
        // Serif: Elegant for headings & totals
        serif: [
          "Playfair Display",
          "Instrument Serif",
          "Georgia",
          "serif",
        ],

        // Sans-Serif: Sharp & clean for body & tables
        sans: [
          "Inter",
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],

        // Mono: For codes/values
        mono: [
          "Monaco",
          "Courier New",
          "monospace",
        ],
      },

      // Sharp corners (no rounding by default)
      borderRadius: {
        none: "0px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        full: "9999px",
      },

      // Custom animations: fade-slide-up
      animation: {
        "fade-slide-up": "fadeSlideUp 0.4s ease-out forwards",
      },

      keyframes: {
        fadeSlideUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(12px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },

      // Minimal shadow (hairlines only, no thick shadows)
      boxShadow: {
        none: "none",
        xs: "0 1px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
        md: "0 1px 3px rgba(0, 0, 0, 0.1)",
        lg: "0 1px 3px rgba(0, 0, 0, 0.1)",
        xl: "0 2px 4px rgba(0, 0, 0, 0.1)",
      },

      // Border styling
      borderWidth: {
        DEFAULT: "1px",
        0: "0",
        2: "2px",
        4: "4px",
        8: "8px",
      },
    },
  },
  plugins: [],
}
