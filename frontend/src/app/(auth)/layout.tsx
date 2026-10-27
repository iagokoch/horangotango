import type { ReactNode } from "react";
import { ArrowLeftRight, ClipboardCheck, ShieldAlert } from "lucide-react";

import { Logo } from "@/components/layout/logo";

const PILARES = [
  {
    icone: ArrowLeftRight,
    titulo: "Retirada e devolução no balcão",
    texto: "Cada empréstimo registra quem retirou, quando e até quando.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Checklist nas duas pontas",
    texto: "Estado funcional, avarias e acessórios ficam registrados de forma imutável.",
  },
  {
    icone: ShieldAlert,
    titulo: "Atraso bloqueia nova retirada",
    texto: "Quem tem pendência vencida só retira de novo depois de regularizar.",
  },
];

// Telas públicas: formulário à esquerda e, no desktop, o painel perfurado de oficina com a
// proposta do produto. No celular, só o formulário.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-xs text-muted-foreground">
          Monitoolring · Gestão de ferramentas e empréstimos para makerspaces
        </p>
      </div>

      <aside className="pegboard relative hidden overflow-hidden border-l lg:flex lg:flex-col lg:justify-between lg:p-12" aria-label="Sobre o Monitoolring">
        <div className="relative z-10 max-w-md">
          <p className="eyebrow">Controle de acervo</p>
          <p className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
            Toda ferramenta tem um lugar.
            <span className="block text-muted-foreground">E alguém responsável por ela.</span>
          </p>
        </div>

        <ShadowBoardIllustration />

        <ul className="relative z-10 grid max-w-lg gap-3">
          {PILARES.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex gap-3 rounded-lg border bg-surface/80 p-3 backdrop-blur-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                <Icone className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-sm text-muted-foreground">{texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

// Quadro de sombras estilizado: vagas preenchidas (no lugar), uma vazia (emprestada) e uma em
// destaque (atrasada). Ilustração decorativa, sem dados.
function ShadowBoardIllustration() {
  return (
    <svg viewBox="0 0 420 170" className="relative z-10 my-8 w-full max-w-lg" aria-hidden>
      <g fill="none" strokeWidth="2">
        <rect x="8" y="20" width="70" height="130" rx="10" className="fill-[hsl(var(--surface))] stroke-[hsl(var(--border-strong))]" />
        <path d="M43 40v70m-14 0h28l-6 26H35z" className="stroke-[hsl(var(--foreground))]" strokeLinejoin="round" />
        <rect x="92" y="20" width="70" height="130" rx="10" className="stroke-[hsl(var(--border-strong))]" strokeDasharray="5 5" />
        <path d="M127 44a14 14 0 1 1 0 28m0 0v60" className="stroke-[hsl(var(--subtle))]" strokeDasharray="5 5" />
        <rect x="176" y="20" width="70" height="130" rx="10" className="fill-[hsl(var(--surface))] stroke-[hsl(var(--border-strong))]" />
        <path d="M196 120l30-62m-8-6l14 6-6 14" className="stroke-[hsl(var(--foreground))]" strokeLinecap="round" />
        <rect x="260" y="20" width="70" height="130" rx="10" className="stroke-[hsl(var(--status-overdue))]" strokeDasharray="5 5" />
        <path d="M282 56h26v50h-26zM295 106v28" className="stroke-[hsl(var(--status-overdue))]" strokeDasharray="5 5" />
        <rect x="344" y="20" width="70" height="130" rx="10" className="fill-[hsl(var(--brand))] stroke-[hsl(var(--brand))]" />
        <circle cx="379" cy="70" r="16" className="stroke-[hsl(var(--primary-foreground))]" strokeWidth="5" />
        <rect x="375" y="48" width="8" height="12" rx="2" className="fill-[hsl(var(--brand))]" />
      </g>
    </svg>
  );
}
