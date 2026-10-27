"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";

import { Callout } from "@/components/shared/callout";
import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ActionError } from "@/lib/api/errors";
import { ROTAS } from "@/lib/rotas";

import { acaoEntrar } from "../actions";
import { loginSchema, type DadosLogin } from "../schemas";

const AVISOS: Record<string, { tom: "info" | "warning" | "success"; titulo: string; texto: string }> = {
  expirada: {
    tom: "warning",
    titulo: "Sua sessão expirou",
    texto: "Por segurança, entre novamente para continuar de onde parou.",
  },
  saiu: { tom: "info", titulo: "Sessão encerrada", texto: "Até a próxima bancada." },
  cadastro: {
    tom: "success",
    titulo: "Conta criada",
    texto: "Entre com o e-mail e a senha que você acabou de cadastrar.",
  },
};

interface LoginFormProps {
  destino?: string;
  motivo?: string;
  emailInicial?: string;
}

export function LoginForm({ destino, motivo, emailInicial }: LoginFormProps) {
  const [erro, setErro] = useState<ActionError | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const form = useForm<DadosLogin>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailInicial ?? "", senha: "" },
  });
  const aviso = motivo ? AVISOS[motivo] : undefined;

  async function entrar(dados: DadosLogin) {
    setErro(null);
    // Em caso de sucesso a action redireciona e esta função não retorna.
    const resultado = await acaoEntrar(dados, destino);
    if (resultado && !resultado.ok) {
      setErro(resultado.error);
      if (resultado.error.status === 401) {
        form.setValue("senha", "");
        form.setFocus("senha");
      }
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">Entrar</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
        Membros consultam o acervo e os próprios empréstimos. O Staff opera o balcão.
      </p>

      {aviso && !erro && (
        <Callout tone={aviso.tom} title={aviso.titulo} className="mt-8" role="status">
          {aviso.texto}
        </Callout>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(entrar)} noValidate className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" inputMode="email" autoFocus={!emailInicial} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={senhaVisivel ? "text" : "password"}
                      autoComplete="current-password"
                      autoFocus={!!emailInicial}
                      className="h-11 pr-11"
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setSenhaVisivel((visivel) => !visivel)}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={senhaVisivel}
                  >
                    {senhaVisivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {erro && (
            <ErrorPanel
              erro={erro}
              titulo="Não foi possível entrar"
              mostrarDetalhes={false}
              contexto={{
                401: {
                  motivo: "E-mail ou senha incorretos.",
                  orientacao: "Confira os dados e tente de novo. A mensagem é a mesma nos dois casos, por segurança.",
                },
                400: { orientacao: "Preencha e-mail e senha." },
              }}
            />
          )}

          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            {!form.formState.isSubmitting && <LogIn aria-hidden />}
            {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Form>

      <p className="mt-8 border-t pt-6 text-base text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href={ROTAS.cadastro}
          className="font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Cadastre-se como membro
        </Link>
      </p>
    </div>
  );
}
