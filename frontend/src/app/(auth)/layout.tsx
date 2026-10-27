import type { CSSProperties, ReactNode } from "react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const GARANTIAS = [
  "Retirada e devolução registradas com checklist de conservação.",
  "Prazo de devolução calculado na hora, com bloqueio automático por atraso.",
  "Nada se apaga: ferramenta inativada mantém todo o histórico.",
];

// Telas públicas. No desktop, a parede grafite com as etiquetas penduradas ocupa a esquerda e o
// formulário fica à direita, sobre a folha clara. No celular, a parede vira uma faixa curta.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="ink-panel relative hidden flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-16" aria-label="Sobre o Monitoolring">
        <Logo className="text-[hsl(var(--ink-fg))]" />

        <div className="max-w-[34rem]">
          <p className="font-display text-5xl font-bold xl:text-6xl">Toda ferramenta tem um lugar.</p>
          <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-[hsl(var(--ink-muted))]">
            O Monitoolring registra quem retirou, quando devolve e em que estado cada ferramenta saiu e voltou para a
            bancada.
          </p>
        </div>

        <ParedeDeEtiquetas />

        <ul className="grid max-w-[38rem] divide-y divide-[hsl(var(--ink-line))] border-y border-[hsl(var(--ink-line))]">
          {GARANTIAS.map((texto) => (
            <li key={texto} className="flex items-start gap-3 py-3 text-base text-[hsl(var(--ink-muted))]">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
              {texto}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <div className="ink-panel flex items-center justify-between px-5 py-4 lg:hidden">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-bold leading-none">Monitoolring</span>
          </span>
          <span className="text-sm text-[hsl(var(--ink-muted))]">Acervo da oficina</span>
        </div>
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-5 py-12 sm:py-16">{children}</main>
        <p className="px-5 pb-6 text-center text-sm text-subtle lg:text-left lg:px-12">
          Gestão de ferramentas e empréstimos para makerspaces e oficinas compartilhadas.
        </p>
      </div>
    </div>
  );
}

interface EtiquetaDecorativa {
  codigo: string;
  nome: string;
  situacao: string;
  cor: string;
  cordao: string;
  giro: string;
  destaque?: boolean;
  larga?: boolean;
}

// Ilustração: etiquetas penduradas num trilho, como no armário de ferramentas. Exemplos fixos,
// sem dados do sistema. É o único movimento automático das telas públicas: as etiquetas caem no
// gancho e balançam até parar (desligado com prefers-reduced-motion).
const ETIQUETAS: EtiquetaDecorativa[] = [
  { codigo: "FUR-012", nome: "Furadeira de impacto", situacao: "Disponível", cor: "bg-status-available", cordao: "h-8", giro: "-3deg" },
  { codigo: "SER-004", nome: "Serra tico-tico", situacao: "Emprestada", cor: "bg-status-loan", cordao: "h-16", giro: "2deg" },
  { codigo: "PAQ-020", nome: "Paquímetro digital", situacao: "Selecionada", cor: "bg-brand-foreground", cordao: "h-5", giro: "-1deg", destaque: true },
  { codigo: "SOL-003", nome: "Estação de solda", situacao: "Em reparo", cor: "bg-status-repair", cordao: "h-12", giro: "4deg", larga: true },
];

function ParedeDeEtiquetas() {
  return (
    <div aria-hidden className="relative -mx-2 my-10">
      <div className="h-1.5 rounded-full bg-[hsl(var(--ink-line))]" />
      <ul className="flex gap-6 px-6">
        {ETIQUETAS.map((etiqueta, indice) => (
          <li
            key={etiqueta.codigo}
            className={cn("flex origin-top animate-swing-in flex-col items-center", etiqueta.larga && "hidden xl:flex")}
            style={{ "--giro": etiqueta.giro, animationDelay: `${250 + indice * 140}ms` } as CSSProperties}
          >
            <span className="size-2.5 rounded-full border-2 border-[hsl(var(--ink-line))] bg-[hsl(var(--ink-bg))]" />
            <span className={cn("w-px bg-[hsl(var(--ink-muted)/0.5)]", etiqueta.cordao)} />
            <div
              className={cn(
                "relative w-36 px-3.5 pb-3.5 pt-7 text-[hsl(204_16%_10%)] [clip-path:polygon(22%_0,78%_0,100%_16%,100%_100%,0_100%,0_16%)]",
                etiqueta.destaque ? "bg-brand" : "bg-[hsl(90_8%_92%)]",
              )}
            >
              <span className="absolute left-1/2 top-2.5 size-3 -translate-x-1/2 rounded-full border-2 border-[hsl(204_16%_10%/0.7)] bg-[hsl(var(--ink-bg))]" />
              <p className="font-condensed text-lg font-bold uppercase leading-none tracking-wide">{etiqueta.codigo}</p>
              <p className="mt-1.5 text-sm leading-snug">{etiqueta.nome}</p>
              <p className="mt-3 flex items-center gap-1.5 border-t border-dashed border-[hsl(204_16%_10%/0.3)] pt-2 text-xs font-semibold">
                <span className={cn("size-2 rounded-full", etiqueta.cor)} />
                {etiqueta.situacao}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
