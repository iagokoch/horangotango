"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { idCurto } from "@/lib/format";

const ROTULOS: Record<string, string> = {
  painel: "Painel",
  ferramentas: "Ferramentas",
  emprestimos: "Empréstimos",
  configuracoes: "Configurações",
  perfil: "Meu perfil",
  editar: "Editar",
  devolucao: "Devolução",
  "acesso-negado": "Acesso negado",
};

function rotuloNovo(pai: string | undefined) {
  return pai === "emprestimos" ? "Nova retirada" : "Nova ferramenta";
}

// Trilha derivada da URL. Segmentos desconhecidos são IDs e aparecem na forma curta, em mono.
export function Breadcrumbs() {
  const pathname = usePathname();
  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length === 0) return null;

  const itens = segmentos.map((segmento, indice) => {
    const href = `/${segmentos.slice(0, indice + 1).join("/")}`;
    const conhecido = segmento === "nova" ? rotuloNovo(segmentos[indice - 1]) : ROTULOS[segmento];
    return { href, rotulo: conhecido ?? idCurto(decodeURIComponent(segmento)), id: !conhecido };
  });

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-base">
        {itens.map((item, indice) => {
          const ultimo = indice === itens.length - 1;
          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1">
              {indice > 0 && <ChevronRight className="size-3.5 shrink-0 text-border-strong" aria-hidden />}
              {ultimo ? (
                <span aria-current="page" className={item.id ? "truncate font-mono text-xs" : "truncate font-semibold"}>
                  {item.rotulo}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`truncate text-muted-foreground transition-colors hover:text-foreground ${item.id ? "font-mono text-xs" : ""}`}
                >
                  {item.rotulo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
