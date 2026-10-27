"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Papel } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

import { gruposDoPapel, itemAtivo } from "./navegacao";

export function SidebarNav({ papel, onNavigate }: { papel: Papel; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-5">
      {gruposDoPapel(papel).map((grupo) => (
        <div key={grupo.titulo}>
          <p className="eyebrow mb-1.5 px-2.5">{grupo.titulo}</p>
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
                      "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      ativo && "bg-accent text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand opacity-0 transition-opacity",
                        ativo && "opacity-100",
                      )}
                    />
                    <Icone
                      className={cn("size-4 shrink-0 transition-colors", ativo ? "text-brand-ink" : "text-subtle group-hover:text-muted-foreground")}
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
