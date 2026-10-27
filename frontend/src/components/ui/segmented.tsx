"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface OpcaoFiltro<T extends string> {
  valor: T;
  rotulo: string;
  quantidade?: number;
  marcador?: ReactNode;
  // Destaca o rótulo em vermelho quando há itens (ex.: atrasados), mesmo sem estar selecionado.
  alerta?: boolean;
}

interface FilterTabsProps<T extends string> {
  opcoes: OpcaoFiltro<T>[];
  valor: T;
  onChange: (valor: T) => void;
  rotulo: string;
  className?: string;
}

// Abas de filtro com contagem. A aba ativa recebe o traço amarelo da marca embaixo, o mesmo
// marcador de "selecionado" usado na navegação. Rola na horizontal no celular, sem quebrar linha.
export function FilterTabs<T extends string>({ opcoes, valor, onChange, rotulo, className }: FilterTabsProps<T>) {
  return (
    <div className={cn("scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div role="group" aria-label={rotulo} className="flex w-max min-w-full gap-1 border-b">
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(opcao.valor)}
              className={cn(
                "group relative flex h-11 items-center gap-2 whitespace-nowrap rounded-t-md px-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                ativo ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                opcao.alerta && !ativo && "text-status-overdue hover:text-status-overdue",
              )}
            >
              {opcao.marcador}
              {opcao.rotulo}
              {opcao.quantidade !== undefined && (
                <span
                  className={cn(
                    "tabular min-w-[1.5rem] rounded-full px-1.5 py-px text-center text-sm transition-colors",
                    ativo ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {opcao.quantidade}
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 -bottom-px h-[3px] origin-center rounded-full bg-brand transition-transform duration-200 ease-out",
                  ativo ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  opcoes: { valor: T; rotulo: string; icone?: ReactNode; somenteIcone?: boolean }[];
  valor: T;
  onChange: (valor: T) => void;
  rotulo: string;
  className?: string;
}

// Alternância compacta entre poucas opções equivalentes (modo de visualização, tema).
export function Segmented<T extends string>({ opcoes, valor, onChange, rotulo, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={rotulo} className={cn("inline-flex h-10 rounded-md border bg-surface-sunken p-1", className)}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            aria-label={opcao.somenteIcone ? opcao.rotulo : undefined}
            title={opcao.somenteIcone ? opcao.rotulo : undefined}
            onClick={() => onChange(opcao.valor)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
              ativo ? "bg-surface text-foreground shadow-raised ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opcao.icone}
            {!opcao.somenteIcone && opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
