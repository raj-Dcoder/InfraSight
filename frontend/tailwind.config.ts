import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // InfraSight brand palette
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Status colors — semantic
        status: {
          planned:     "#6366f1",
          tendered:    "#8b5cf6",
          inprogress:  "#f59e0b",
          delayed:     "#ef4444",
          completed:   "#10b981",
          abandoned:   "#6b7280",
          onhold:      "#f97316",
        },
        // Trust colors
        trust: {
          verified:   "#10b981",
          unverified: "#f59e0b",
          community:  "#3b82f6",
          disputed:   "#ef4444",
        },
        // Dark bg shades
        surface: {
          900: "var(--surface-900)",
          800: "var(--surface-800)",
          700: "var(--surface-700)",
          600: "#374151",
          500: "#4b5563",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        mono:  ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, var(--brand-dark) 0%, var(--surface-800) 40%, var(--surface-900) 100%)",
        "card-gradient": "linear-gradient(145deg, var(--glass-bg) 0%, var(--glass-border) 100%)",
        "status-gradient": "linear-gradient(90deg, var(--tw-gradient-stops))",
      },
      boxShadow: {
        "glass": "var(--glass-shadow)",
        "glow-blue": "0 0 20px rgba(14,165,233,0.3)",
        "glow-green": "0 0 20px rgba(16,185,129,0.3)",
        "card": "0 4px 24px rgba(0,0,0,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
