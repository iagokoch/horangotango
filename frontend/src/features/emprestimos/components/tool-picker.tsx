"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { Ferramenta } from "@/features/ferramentas/types";
import { cn, normalizarBusca } from "@/lib/utils";

interface ToolPickerProps {
  ferramentas: Ferramenta[];
  valor: string;
  onChange: (id: string) => void;
  onBlur: () => void;
  invalido?: boolean;
  idRotulo: string;
}

// Seleção da ferramenta no balcão: só lista as disponíveis no momento da consulta. Se outra
// estação retirar a mesma ferramenta antes, a API recusa com 409 e a lista é atualizada.
export function ToolPicker({ ferramentas, valor, onChange, onBlur, invalido, idRotulo }: ToolPickerProps) {
  const [busca, setBusca] = useState("");
  const filtradas = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return ferramentas;
    return ferramentas.filter((ferramenta) =>
      [ferramenta.codigo, ferramenta.nome, ferramenta.categoria].some((campo) => normalizarBusca(campo).includes(termo)),
    );
  }, [busca, ferramentas]);

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-surface", invalido && "border-destructive")}>
      <div className="relative border-b">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Filtrar por código, nome ou categoria"
          aria-label="Filtrar ferramentas disponíveis"
          className="h-10 w-full bg-transparent pl-9 pr-3 text-sm placeholder:text-subtle focus-visible:outline-none"
        />
      </div>
      <div role="radiogroup" aria-labelledby={idRotulo} className="max-h-72 overflow-y-auto p-1">
        {filtradas.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {ferramentas.length === 0 ? "Nenhuma ferramenta disponível para retirada agora." : "Nenhuma ferramenta corresponde ao filtro."}
          </p>
        ) : (
          filtradas.map((ferramenta) => {
            const selecionada = ferramenta.id === valor;
            return (
              <button
                key={ferramenta.id}
                type="button"
                role="radio"
                aria-checked={selecionada}
                onClick={() => onChange(ferramenta.id)}
                onBlur={onBlur}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selecionada && "bg-brand-soft hover:bg-brand-soft",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    selecionada ? "border-brand-ink" : "border-border-strong",
                  )}
                >
                  {selecionada && <span className="size-2 rounded-full bg-brand-ink" />}
                </span>
                <span className="w-24 shrink-0 font-mono text-xs font-semibold">{ferramenta.codigo}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{ferramenta.nome}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{ferramenta.categoria}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
