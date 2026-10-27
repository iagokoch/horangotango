import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

// Tokens do design system Monitoolring. Os valores ficam em variáveis CSS (globals.css) para que
// os temas claro ("Concreto") e escuro ("Grafite") troquem só as variáveis, não as classes.
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
      fontSize: {
        // Escala compacta de produto operacional: 13px é o corpo padrão das tabelas.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": ["2rem", { lineHeight: "2.375rem", letterSpacing: "-0.025em" }],
        "4xl": ["2.75rem", { lineHeight: "3rem", letterSpacing: "-0.03em" }],
      },
      colors: {
        border: token("border"),
        "border-strong": token("border-strong"),
        input: token("input"),
        ring: token("ring"),
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
        brand: {
          DEFAULT: token("brand"),
          ink: token("brand-ink"),
          soft: token("brand-soft"),
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
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        hairline: "0 0 0 1px hsl(var(--border))",
        raised: "0 1px 0 0 hsl(var(--shadow) / 0.04), 0 1px 3px 0 hsl(var(--shadow) / 0.06)",
        overlay: "0 12px 32px -8px hsl(var(--shadow) / 0.28), 0 0 0 1px hsl(var(--border))",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse_ring: {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--status-overdue) / 0.45)" },
          "70%": { boxShadow: "0 0 0 6px hsl(var(--status-overdue) / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--status-overdue) / 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pulse-ring": "pulse_ring 2s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
