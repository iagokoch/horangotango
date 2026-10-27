"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronsUpDown, CircleUserRound, LogOut, Monitor, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { acaoSair } from "@/features/auth/actions";
import { ROTULO_PAPEL, type Usuario } from "@/lib/auth/types";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

export function Avatar({ nome, className }: { nome: string; className?: string }) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface-sunken font-mono text-xs font-semibold text-foreground",
        className,
      )}
    >
      {iniciais || "?"}
    </span>
  );
}

export function PapelBadge({ papel }: { papel: Usuario["papel"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-px font-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em]",
        papel === "STAFF" ? "bg-brand-soft text-brand-ink" : "bg-surface-sunken text-muted-foreground ring-1 ring-inset ring-border",
      )}
    >
      {ROTULO_PAPEL[papel]}
    </span>
  );
}

const TEMAS = [
  { valor: "light", rotulo: "Claro", icone: Sun },
  { valor: "dark", rotulo: "Escuro", icone: Moon },
  { valor: "system", rotulo: "Sistema", icone: Monitor },
] as const;

export function UserMenu({ usuario }: { usuario: Usuario }) {
  const { theme, setTheme } = useTheme();
  const [saindo, setSaindo] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        aria-label={`Conta de ${usuario.nome}`}
      >
        <Avatar nome={usuario.nome} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{usuario.nome}</span>
          <span className="mt-0.5 block">
            <PapelBadge papel={usuario.papel} />
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-subtle" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]">
        <DropdownMenuLabel>
          <span className="block truncate font-medium">{usuario.nome}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{usuario.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROTAS.perfil}>
            <CircleUserRound aria-hidden />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="eyebrow px-2 pb-1 pt-1.5">Tema</p>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1" role="group" aria-label="Tema da interface">
          {TEMAS.map(({ valor, rotulo, icone: Icone }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTheme(valor)}
              aria-pressed={theme === valor}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border border-transparent py-1.5 text-2xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                theme === valor && "border-border bg-surface-sunken text-foreground",
              )}
            >
              <Icone className="size-4" aria-hidden />
              {rotulo}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={saindo}
          onSelect={(evento) => {
            evento.preventDefault();
            setSaindo(true);
            // acaoSair redireciona para o login; o estado só volta se a navegação falhar.
            acaoSair().catch(() => setSaindo(false));
          }}
        >
          <LogOut aria-hidden />
          {saindo ? "Encerrando…" : "Encerrar sessão"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
