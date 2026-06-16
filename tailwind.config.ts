import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // tema claro — branco e azul (inspirado no dashboard Multipark)
        bg: "#eef3fa",       // fundo geral (cinza-azulado muito claro)
        panel: "#ffffff",    // cartões / painéis
        panel2: "#f4f8fd",   // painel secundário
        line: "#d9e2ef",     // bordas
        txt: "#14233f",      // texto principal (azul muito escuro)
        mut: "#64748b",      // texto secundário
        acc: "#1d6fe6",      // azul de destaque
        ok: "#16a34a",
        okbg: "#e7f7ee",
        bad: "#dc2626",
        badbg: "#fdecec",
        warnbg: "#fdf3e3",
        chip: "#eaf1fb",
      },
      fontSize: {
        xxs: "12px",
        xs: "13.5px",
        sm: "15px",
        base: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
