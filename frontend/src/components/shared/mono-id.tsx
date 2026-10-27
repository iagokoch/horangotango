import { idCurto } from "@/lib/format";
import { cn } from "@/lib/utils";

// Identificador técnico (UUID) em forma curta; o valor completo fica no title e para leitores de tela.
export function MonoId({ id, voce, className }: { id: string | null | undefined; voce?: boolean; className?: string }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs", className)} title={id}>
      <span aria-hidden>{idCurto(id)}</span>
      <span className="sr-only">{id}</span>
      {voce && <span className="rounded bg-brand-soft px-1 font-sans text-2xs font-semibold text-brand-ink">você</span>}
    </span>
  );
}
