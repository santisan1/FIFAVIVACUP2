/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#070A12",
        ink: "#0B1020",
        panel: "#10182B",
        card: "#121A30",
        line: "rgba(255,255,255,0.08)",
        electric: "#38BDF8",
        violet: "#8B5CF6",
        winner: "#34D399",
        pending: "#FBBF24",
        danger: "#F87171",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(99, 102, 241, 0.35)",
        card: "0 20px 60px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
