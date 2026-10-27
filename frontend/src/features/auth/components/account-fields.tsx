"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { bytesUtf8, SENHA_MAX_BYTES, SENHA_MIN } from "../schemas";

interface CamposConta {
  nome: string;
  email: string;
  senha: string;
}

// Campos de conta compartilhados pelo autocadastro de Membro e pelo cadastro de Staff, que usam o
// mesmo UserCreateRequest na API.
export function AccountFields<T extends FieldValues & CamposConta>({ control }: { control: Control<T> }) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const senha = (useWatch({ control, name: "senha" as Path<T> }) as string | undefined) ?? "";
  const minimoOk = senha.length >= SENHA_MIN;
  const bytesOk = bytesUtf8(senha) <= SENHA_MAX_BYTES;

  return (
    <>
      <FormField
        control={control}
        name={"nome" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome completo</FormLabel>
            <FormControl>
              <Input {...field} autoComplete="name" maxLength={255} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"email" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl>
              <Input {...field} type="email" autoComplete="email" inputMode="email" maxLength={255} />
            </FormControl>
            <FormDescription>Usado para entrar. É armazenado em minúsculas.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"senha" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <div className="relative">
              <FormControl>
                <Input {...field} type={senhaVisivel ? "text" : "password"} autoComplete="new-password" className="pr-10" />
              </FormControl>
              <button
                type="button"
                onClick={() => setSenhaVisivel((visivel) => !visivel)}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={senhaVisivel}
              >
                {senhaVisivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Requisitos da senha">
              <Requisito ok={minimoOk}>Pelo menos {SENHA_MIN} caracteres</Requisito>
              <Requisito ok={bytesOk && senha.length > 0}>Até 72 bytes</Requisito>
            </ul>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function Requisito({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 transition-colors", ok ? "text-status-available" : "text-muted-foreground")}>
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-full border",
          ok ? "border-status-available bg-status-available text-background" : "border-border-strong",
        )}
        aria-hidden
      >
        {ok && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {children}
      <span className="sr-only">{ok ? "(atendido)" : "(pendente)"}</span>
    </li>
  );
}
