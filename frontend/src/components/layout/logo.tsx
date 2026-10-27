import { cn } from "@/lib/utils";

// Marca Monitoolring: uma etiqueta de ferramenta amarela pendurada pelo ilhós (o "ring"), com as
// duas linhas do registro. Desenhada em SVG para ficar nítida em qualquer densidade de tela.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <path
        d="M11 2h10l7 7v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9zM16 6.1a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8z"
        fill="hsl(var(--brand))"
        fillRule="evenodd"
      />
      <circle cx="16" cy="9.5" r="3.4" fill="none" stroke="hsl(var(--brand-foreground))" strokeWidth="2.4" />
      <rect x="9" y="17.5" width="14" height="2.6" rx="1.3" fill="hsl(var(--brand-foreground))" />
      <rect x="9" y="22.5" width="8.5" height="2.6" rx="1.3" fill="hsl(var(--brand-foreground))" />
    </svg>
  );
}

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compacto && <span className="font-display text-[1.0625rem] font-bold leading-none">Monitoolring</span>}
    </span>
  );
}
