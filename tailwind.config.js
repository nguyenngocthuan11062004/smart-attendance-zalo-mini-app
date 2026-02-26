module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  purge: {
    enabled: true,
    content: ["./src/**/*.{js,jsx,ts,tsx,vue}"],
  },
  theme: {
    extend: {
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
      colors: {
        dark: {
          primary: "#f2f2f7",
          secondary: "#ffffff",
          tertiary: "#f0f0f5",
          card: "#ffffff",
          elevated: "#f0f0f5",
          track: "#e5e7eb",
        },
        hust: {
          red: "#be1d2c",
          "red-light": "#ef4444",
          "red-dark": "#991b1b",
        },
        accent: {
          purple: "#a78bfa",
          "purple-dim": "rgba(167,139,250,0.12)",
        },
        status: {
          green: "#22c55e",
          "green-dim": "rgba(34,197,94,0.12)",
          amber: "#f59e0b",
          "amber-dim": "rgba(245,158,11,0.12)",
          red: "#ef4444",
          "red-dim": "rgba(239,68,68,0.12)",
        },
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["24px", { lineHeight: "32px" }],
        "2xl": ["28px", { lineHeight: "36px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        "glow-red": "0 0 15px rgba(190,29,44,0.15)",
        "glow-purple": "0 0 15px rgba(167,139,250,0.15)",
        "glow-green": "0 0 15px rgba(34,197,94,0.15)",
        "glow-amber": "0 0 15px rgba(245,158,11,0.15)",
        "card": "0 1px 4px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "progress-fill": "progressFill 0.8s ease-out",
        "ring-fill": "ringFill 1s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 100%)" },
        },
        ringFill: {
          "0%": { strokeDashoffset: "var(--ring-circumference, 283)" },
          "100%": { strokeDashoffset: "var(--ring-offset, 0)" },
        },
      },
    },
  },
};
