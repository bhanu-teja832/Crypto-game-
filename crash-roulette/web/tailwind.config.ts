import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand ───
        background: "#0f0f1a",
        surface:    "#161625",
        border:     "#2a2a45",

        // ─── Accent (indigo) ───
        accent: {
          DEFAULT: "#818cf8",
          light:   "#a5b4fc",
          dark:    "#6366f1",
        },

        // ─── Game states ───
        crash:   "#ff3b5c",
        cashout: "#34d399",
        warning: "#f59e0b",

        // ─── Text ───
        primary:   "#f1f5f9",
        secondary: "#94a3b8",
        muted:     "#475569",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-fast": "pulse 0.6s ease-in-out infinite",
        "glow":       "glow 2s ease-in-out infinite alternate",
        "slide-up":   "slideUp 0.3s ease-out",
        "fade-in":    "fadeIn 0.2s ease-out",
        "crash-shake": "shake 0.4s ease-in-out",
      },
      keyframes: {
        glow: {
          "0%":   { boxShadow: "0 0 5px #818cf8, 0 0 10px #818cf8" },
          "100%": { boxShadow: "0 0 20px #818cf8, 0 0 40px #6366f1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":       { transform: "translateX(-4px)" },
          "40%":       { transform: "translateX(4px)" },
          "60%":       { transform: "translateX(-4px)" },
          "80%":       { transform: "translateX(4px)" },
        },
      },
      boxShadow: {
        "accent": "0 0 20px rgba(129, 140, 248, 0.4)",
        "crash":  "0 0 20px rgba(255, 59, 92, 0.4)",
        "cashout":"0 0 20px rgba(52, 211, 153, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
