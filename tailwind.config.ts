import type { Config } from "tailwindcss";

// Paleta Prontto AI (a mesma dos carrosséis: carrosseis-medicos/marca.json, paleta "esmeralda").
//   escuro #0B4A3B · escuro2 #083A2E · creme #F5F1E8 · dourado #C9A96E · esmeralda #0F7A5A
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#062A21", // fundo: esmeralda bem escuro
        panel: "#0A372C", // cartões
        panelmuted: "#0F4537", // cartões internos
        border: "#1A5646", // bordas
        accent: "#C9A96E", // dourado da marca (botões e destaques)
        accent2: "#B08F55",
        esmeralda: "#0F7A5A", // verde da marca
        creme: "#F5F1E8",
        muted: "#9DB5AB", // texto secundário
      },
      fontFamily: {
        sans: ["var(--fonte-corpo)", "Instrument Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--fonte-titulo)", "Cormorant", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
