"use client";

import { useEffect, useState } from "react";
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
import { Segmented } from "@/components/ui/segmented";
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
        "font-condensed flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold tracking-wide text-background",
        className,
      )}
    >
      {iniciais || "?"}
    </span>
  );
}

// Staff leva o amarelo da marca: é quem opera o balcão. Membro fica neutro.
export function PapelBadge({ papel, className }: { papel: Usuario["papel"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-semibold",
        papel === "STAFF" ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
        className,
      )}
    >
      {ROTULO_PAPEL[papel]}
    </span>
  );
}

type Tema = "light" | "dark" | "system";

const TEMAS = [
  { valor: "light" as Tema, rotulo: "Claro", icone: <Sun aria-hidden /> },
  { valor: "dark" as Tema, rotulo: "Escuro", icone: <Moon aria-hidden /> },
  { valor: "system" as Tema, rotulo: "Sistema", icone: <Monitor aria-hidden /> },
];

export function UserMenu({ usuario }: { usuario: Usuario }) {
  const { theme, setTheme } = useTheme();
  const [saindo, setSaindo] = useState(false);
  // O tema só é conhecido no cliente; antes disso nenhuma opção aparece marcada.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-foreground/[0.05]"
        aria-label={`Conta de ${usuario.nome}`}
      >
        <Avatar nome={usuario.nome} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold leading-5">{usuario.nome}</span>
          <span className="block truncate text-sm text-muted-foreground">{ROTULO_PAPEL[usuario.papel]}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-subtle" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[15rem]">
        <DropdownMenuLabel className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{usuario.nome}</span>
            <span className="block truncate text-sm font-normal text-muted-foreground">{usuario.email}</span>
          </span>
          <PapelBadge papel={usuario.papel} className="mt-0.5" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROTAS.perfil}>
            <CircleUserRound aria-hidden />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-1 pb-1 pt-1.5">
          <p className="mb-1.5 px-1.5 text-sm text-muted-foreground">Tema</p>
          <Segmented
            rotulo="Tema da interface"
            opcoes={TEMAS}
            valor={montado ? ((theme as Tema | undefined) ?? "system") : ("" as Tema)}
            onChange={setTheme}
            className="flex w-full"
          />
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
