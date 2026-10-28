"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { ToolTag } from "@/components/shared/tool-tag";
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
// A escolhida recebe o marcador amarelo de seleção.
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
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-surface transition-[border-color,box-shadow] focus-within:border-foreground/60",
        invalido && "border-destructive",
      )}
    >
      <div className="group relative border-b">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Filtrar por código, nome ou categoria"
          aria-label="Filtrar ferramentas disponíveis"
          className="h-11 w-full bg-transparent pl-10 pr-3 text-base placeholder:text-subtle focus-visible:outline-none"
        />
      </div>
      <div role="radiogroup" aria-labelledby={idRotulo} className="max-h-80 overflow-y-auto p-1.5">
        {filtradas.length === 0 ? (
          <p className="px-3 py-8 text-center text-base text-muted-foreground">
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
                  "flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selecionada && "border-brand bg-brand-soft hover:bg-brand-soft",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selecionada ? "border-brand-foreground bg-brand text-brand-foreground" : "border-border-strong",
                  )}
                >
                  {selecionada && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <ToolTag codigo={ferramenta.codigo} />
                <span className="min-w-0 flex-1 truncate text-base font-medium">{ferramenta.nome}</span>
                <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">{ferramenta.categoria}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
