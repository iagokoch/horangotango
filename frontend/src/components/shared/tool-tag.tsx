import { cn } from "@/lib/utils";

// O código de uma ferramenta sempre aparece como etiqueta (ver .tool-tag em globals.css): é o
// que o operador procura com os olhos na prateleira, então tem a mesma forma em todas as telas.
export function ToolTag({ codigo, grande = false, className }: { codigo: string; grande?: boolean; className?: string }) {
  return (
    <span className={cn("tool-tag", grande && "tool-tag-lg", className)}>
      <span className="sr-only">Código </span>
      {codigo}
    </span>
  );
}
