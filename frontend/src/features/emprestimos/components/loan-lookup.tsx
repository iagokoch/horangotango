"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rotaEmprestimo } from "@/lib/rotas";

// Abre um empréstimo pelo código do comprovante. A API confere a permissão: Membro só abre os
// próprios (403 para os demais).
export function LoanLookup({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  function abrir(evento: FormEvent) {
    evento.preventDefault();
    const valor = codigo.trim();
    if (!valor) {
      setErro("Informe o código do empréstimo.");
      return;
    }
    setErro(null);
    setAbrindo(true);
    router.push(rotaEmprestimo(valor));
  }

  return (
    <form onSubmit={abrir} noValidate className="space-y-2">
      <label htmlFor="codigo-emprestimo" className="block text-sm font-semibold">
        Abrir pelo código do comprovante
      </label>
      <div className="flex gap-2">
        <div className="group relative min-w-0 flex-1">
          <ScanLine
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-foreground"
            aria-hidden
          />
          <Input
            id="codigo-emprestimo"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            placeholder="Cole o código"
            aria-invalid={!!erro}
            aria-describedby={erro ? "codigo-emprestimo-erro" : undefined}
            className="pl-9 font-mono text-sm placeholder:font-sans placeholder:text-base"
          />
        </div>
        <Button type="submit" variant="secondary" loading={abrindo} className="h-10">
          Abrir
          {!abrindo && <ArrowRight aria-hidden />}
        </Button>
      </div>
      {erro && (
        <p id="codigo-emprestimo-erro" role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}
