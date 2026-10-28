"use client";

import { useState, type KeyboardEvent } from "react";
import { CircleCheck, Plus, TriangleAlert, X } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { LIMITES_CHECKLIST, NENHUM_ACESSORIO, SEM_AVARIAS } from "../schemas";
import { ROTULO_ESTADO_FUNCIONAL, type EstadoFuncional } from "../types";

interface ChecklistFieldsProps<T extends FieldValues> {
  control: Control<T>;
  // Prefixo do objeto checklist no formulário (ex.: "checklist").
  prefixo: string;
  legenda?: string;
}

const OPCOES_ESTADO: { valor: EstadoFuncional; descricao: string; icone: typeof CircleCheck }[] = [
  { valor: "INTACT", descricao: "Liga, corta, aperta: funciona como esperado.", icone: CircleCheck },
  { valor: "DEFECTIVE", descricao: "Apresenta falha de funcionamento.", icone: TriangleAlert },
];

// Campos do Checklist de Conservação (ChecklistRequest), usados na retirada e na devolução.
// "Sem avarias" e "Nenhum" precisam ser explícitos: campo vazio não completa o checklist (422).
export function ChecklistFields<T extends FieldValues>({ control, prefixo, legenda }: ChecklistFieldsProps<T>) {
  const nome = (campo: string) => `${prefixo}.${campo}` as FieldPath<T>;

  return (
    <fieldset className="space-y-5">
      {legenda && <legend className="sr-only">{legenda}</legend>}

      <FormField
        control={control}
        name={nome("estadoFuncional")}
        render={({ field, fieldState }) => (
          <FormItem>
            {/* Grupo de rádio: o rótulo nomeia o grupo via aria-labelledby, não um único controle. */}
            <span id={`${prefixo}-estado-rotulo`} className="block text-sm font-semibold leading-none">
              Estado funcional
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${prefixo}-estado-rotulo`}
              aria-invalid={!!fieldState.error}
              className="grid gap-2 sm:grid-cols-2"
            >
              {OPCOES_ESTADO.map(({ valor, descricao, icone: Icone }) => {
                const selecionado = field.value === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={selecionado}
                    onClick={() => field.onChange(valor)}
                    onBlur={field.onBlur}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-input bg-surface p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selecionado &&
                        (valor === "INTACT"
                          ? "border-status-available bg-status-available/[0.06] ring-1 ring-status-available"
                          : "border-status-repair bg-status-repair/[0.06] ring-1 ring-status-repair"),
                      fieldState.error && !field.value && "border-destructive",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selecionado ? "border-foreground" : "border-border-strong",
                      )}
                    >
                      {selecionado && <span className="size-2 rounded-full bg-foreground" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-base font-semibold">
                        <Icone
                          className={cn("size-4", valor === "INTACT" ? "text-status-available" : "text-status-repair")}
                          aria-hidden
                        />
                        {ROTULO_ESTADO_FUNCIONAL[valor]}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{descricao}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={nome("avariasVisiveis")}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-end justify-between gap-2">
              <FormLabel>Avarias visíveis</FormLabel>
              <button
                type="button"
                onClick={() => field.onChange(SEM_AVARIAS)}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-3 text-sm font-medium transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  field.value === SEM_AVARIAS ? "border-brand bg-brand text-brand-foreground hover:border-brand" : "text-muted-foreground",
                )}
              >
                {SEM_AVARIAS}
              </button>
            </div>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={3}
                maxLength={LIMITES_CHECKLIST.avarias}
                placeholder="Riscos, amassados, peças faltando, desgaste do cabo…"
              />
            </FormControl>
            <FormDescription>Se não houver nenhuma, registre explicitamente &quot;{SEM_AVARIAS}&quot;.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <AcessoriosField control={control} name={nome("acessoriosInclusos")} />
    </fieldset>
  );
}

function AcessoriosField<T extends FieldValues>({ control, name }: { control: Control<T>; name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <AcessoriosInput
          itens={Array.isArray(field.value) ? (field.value as string[]) : []}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

interface AcessoriosInputProps {
  itens: string[];
  onChange: (itens: string[]) => void;
  onBlur: () => void;
}

function AcessoriosInput({ itens, onChange, onBlur }: AcessoriosInputProps) {
  const [rascunho, setRascunho] = useState("");
  const nenhum = itens.length === 1 && itens[0] === NENHUM_ACESSORIO;

  function adicionar() {
    const valor = rascunho.trim();
    if (!valor) return;
    const semNenhum = itens.filter((item) => item !== NENHUM_ACESSORIO);
    const repetido = semNenhum.some((item) => item.toLowerCase() === valor.toLowerCase());
    if (!repetido && semNenhum.length < LIMITES_CHECKLIST.acessorios) {
      onChange([...semNenhum, valor.slice(0, LIMITES_CHECKLIST.acessorio)]);
    }
    setRascunho("");
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter" || evento.key === ",") {
      evento.preventDefault();
      adicionar();
    } else if (evento.key === "Backspace" && !rascunho && itens.length > 0) {
      onChange(itens.slice(0, -1));
    }
  }

  return (
    <FormItem>
      <div className="flex items-end justify-between gap-2">
        <FormLabel>Acessórios inclusos</FormLabel>
        <button
          type="button"
          aria-pressed={nenhum}
          onClick={() => onChange(nenhum ? [] : [NENHUM_ACESSORIO])}
          className={cn(
            "inline-flex h-7 items-center rounded-full border px-3 text-sm font-medium transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            nenhum ? "border-brand bg-brand text-brand-foreground hover:border-brand" : "text-muted-foreground",
          )}
        >
          {NENHUM_ACESSORIO}
        </button>
      </div>
      <div className="rounded-md border border-input bg-surface p-1.5 transition-[border-color,box-shadow] hover:border-border-strong focus-within:border-foreground/70 focus-within:shadow-focus">
        {itens.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 p-0.5 pb-1.5" aria-label="Acessórios adicionados">
            {itens.map((item) => (
              <li key={item} className="flex items-center gap-1 rounded-sm border bg-surface-sunken py-0.5 pl-2 pr-0.5 text-base animate-in fade-in-0 zoom-in-95">
                {item}
                <button
                  type="button"
                  onClick={() => onChange(itens.filter((atual) => atual !== item))}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remover ${item}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-1.5">
          <FormControl>
            <Input
              value={rascunho}
              onChange={(evento) => setRascunho(evento.target.value)}
              onKeyDown={aoTeclar}
              onBlur={() => {
                adicionar();
                onBlur();
              }}
              placeholder={nenhum ? "Nenhum acessório registrado" : "Ex.: maleta, 2 baterias, carregador"}
              disabled={nenhum}
              maxLength={LIMITES_CHECKLIST.acessorio}
              className="h-8 border-0 bg-transparent shadow-none hover:border-0 focus-visible:shadow-none"
            />
          </FormControl>
          <button
            type="button"
            onClick={adicionar}
            disabled={nenhum || !rascunho.trim()}
            className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            Adicionar
          </button>
        </div>
      </div>
      <FormDescription>Enter ou vírgula adiciona o item. Sem acessórios, marque &quot;{NENHUM_ACESSORIO}&quot;.</FormDescription>
      <FormMessage />
    </FormItem>
  );
}
