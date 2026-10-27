"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Papel } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

import { gruposDoPapel, itemAtivo } from "./navegacao";

// A página ativa vira uma ficha clara "puxada" para fora da chapa, marcada pelo traço amarelo:
// o mesmo marcador de seleção usado nos filtros.
export function SidebarNav({ papel, onNavigate }: { papel: Papel; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-6">
      {gruposDoPapel(papel).map((grupo) => (
        <div key={grupo.titulo}>
          <p className="mb-1.5 px-3 text-sm font-medium text-subtle">{grupo.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const ativo = itemAtivo(item, pathname);
              const Icone = item.icone;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-md px-3 text-base font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      ativo && "bg-surface text-foreground shadow-raised ring-1 ring-border hover:bg-surface",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-transform duration-200 ease-out",
                        ativo ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <Icone
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        ativo ? "text-foreground" : "text-subtle group-hover:text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
