"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  valor: string;
  rotulo?: string;
  className?: string;
  compacto?: boolean;
}

export function CopyButton({ valor, rotulo = "Copiar", className, compacto = false }: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  const Icone = copiado ? Check : Copy;
  return (
    <Button
      type="button"
      variant={compacto ? "ghost" : "secondary"}
      size={compacto ? "icon-sm" : "sm"}
      onClick={copiar}
      className={cn(copiado && "text-status-available", className)}
      aria-label={compacto ? `${rotulo}: ${valor}` : undefined}
    >
      <Icone aria-hidden />
      {!compacto && (copiado ? "Copiado" : rotulo)}
      <span className="sr-only" aria-live="polite">
        {copiado ? "Copiado para a área de transferência" : ""}
      </span>
    </Button>
  );
}
