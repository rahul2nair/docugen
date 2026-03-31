import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#fbf8f4",
          100: "#f6f0e8",
          200: "#ebdfcf",
          300: "#dfc9b2",
          400: "#cfaf8d",
          500: "#bf956b",
          600: "#a67a53"
        },
        ink: {
          900: "#191613",
          700: "#5c534a",
          500: "#8a7f75"
        }
      },
      boxShadow: {
        soft: "0 16px 42px rgba(38, 27, 16, 0.08)",
        metallic: "0 8px 24px rgba(163, 127, 76, 0.20), inset 0 1px 0 rgba(255,255,255,0.45)"
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(205, 171, 129, 0.26), transparent 34%), radial-gradient(circle at bottom right, rgba(159, 184, 197, 0.14), transparent 30%), linear-gradient(180deg, #fcfaf6 0%, #f2ebe1 100%)"
      }
    }
  },
  plugins: []
} satisfies Config;
