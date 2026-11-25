import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f19",
        panel: "#111827",
        panelmuted: "#1a2233",
        border: "#232c3d",
        accent: "#10b981",
        accent2: "#059669",
        muted: "#8892a6",
      },
    },
  },
  plugins: [],
} satisfies Config;
