import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

// Tokens do design system "Etiqueta & Bancada". Os valores ficam em variáveis CSS (globals.css):
// o tema escuro troca só as variáveis, nunca as classes.
const token = (nome: string) => `hsl(var(--${nome}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1360px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      // Escala clássica (Bringhurst) adaptada a produto operacional: 14px é o corpo padrão.
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.625rem", letterSpacing: "-0.005em" }],
        "2xl": ["1.3125rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "-0.015em" }],
        "4xl": ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem", { lineHeight: "3rem", letterSpacing: "-0.03em" }],
        "6xl": ["4.5rem", { lineHeight: "4.25rem", letterSpacing: "-0.035em" }],
      },
      colors: {
        border: token("border"),
        "border-strong": token("border-strong"),
        input: token("input"),
        ring: token("ring"),
        canvas: token("canvas"),
        background: token("background"),
        foreground: token("foreground"),
        surface: {
          DEFAULT: token("surface"),
          raised: token("surface-raised"),
          sunken: token("surface-sunken"),
        },
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
          hover: token("primary-hover"),
        },
        // Amarelo-etiqueta: marca o que está selecionado, ativo ou em foco. Nunca é cor de status.
        brand: {
          DEFAULT: token("brand"),
          ink: token("brand-ink"),
          soft: token("brand-soft"),
          foreground: token("brand-foreground"),
        },
        secondary: {
          DEFAULT: token("secondary"),
          foreground: token("secondary-foreground"),
        },
        muted: {
          DEFAULT: token("muted"),
          foreground: token("muted-foreground"),
        },
        subtle: token("subtle"),
        accent: {
          DEFAULT: token("accent"),
          foreground: token("accent-foreground"),
        },
        popover: {
          DEFAULT: token("popover"),
          foreground: token("popover-foreground"),
        },
        card: {
          DEFAULT: token("surface"),
          foreground: token("foreground"),
        },
        destructive: {
          DEFAULT: token("destructive"),
          foreground: token("destructive-foreground"),
        },
        // Cores semânticas de status. Sempre acompanhadas de ícone e rótulo: nunca só a cor.
        status: {
          available: token("status-available"),
          loan: token("status-loan"),
          repair: token("status-repair"),
          lost: token("status-lost"),
          inactive: token("status-inactive"),
          overdue: token("status-overdue"),
        },
      },
      // Raio por hierarquia: folha > painel > controle > etiqueta.
      borderRadius: {
        sheet: "1rem",
        xl: "0.875rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        tag: "0.25rem",
      },
      boxShadow: {
        hairline: "0 0 0 1px hsl(var(--border))",
        raised: "0 1px 0 0 hsl(var(--shadow) / 0.03), 0 1px 2px 0 hsl(var(--shadow) / 0.05)",
        sheet: "0 0 0 1px hsl(var(--border)), 0 1px 3px 0 hsl(var(--shadow) / 0.05)",
        overlay: "0 16px 40px -12px hsl(var(--shadow) / 0.32), 0 0 0 1px hsl(var(--border))",
        focus: "0 0 0 3px hsl(var(--brand) / 0.45)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "segment-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "rotate(-7deg) scale(1.25)" },
          "60%": { opacity: "1", transform: "rotate(-4deg) scale(0.97)" },
          "100%": { opacity: "1", transform: "rotate(-4deg) scale(1)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--status-overdue) / 0.45)" },
          "70%": { boxShadow: "0 0 0 6px hsl(var(--status-overdue) / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--status-overdue) / 0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        // Etiqueta pendurada que cai no gancho e balança até parar no ângulo final (--giro).
        "swing-in": {
          "0%": { opacity: "0", transform: "translateY(-18px) rotate(10deg)" },
          "45%": { opacity: "1", transform: "translateY(0) rotate(-6deg)" },
          "70%": { transform: "rotate(3deg)" },
          "100%": { opacity: "1", transform: "rotate(var(--giro, 0deg))" },
        },
      },
      animation: {
        "segment-grow": "segment-grow 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "stamp-in": "stamp-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "swing-in": "swing-in 1100ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
