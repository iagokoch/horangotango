import { cn } from "@/lib/utils";

// Marca Monitoolring: uma arruela (o "ring") com o entalhe de chave, numa placa de sinalização
// laranja. Desenhada em SVG para ficar nítida em qualquer densidade de tela.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="hsl(var(--brand))" />
      <circle cx="16" cy="16" r="8.25" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="3.5" />
      <rect x="14.25" y="4.5" width="3.5" height="6" rx="1" fill="hsl(var(--brand))" />
      <circle cx="16" cy="16" r="1.75" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compacto && (
        <span className="flex flex-col leading-none">
          <span className="text-[0.9375rem] font-semibold tracking-tight">Monitoolring</span>
          <span className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
            Oficina · Acervo
          </span>
        </span>
      )}
    </span>
  );
}
