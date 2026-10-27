"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ActionError } from "@/lib/api/errors";
import { errosDeCampo } from "@/lib/api/mensagens";
import { ROTAS } from "@/lib/rotas";

import { acaoCadastrar } from "../actions";
import { cadastroSchema, CAMPOS_CONTA, type DadosCadastro } from "../schemas";
import { AccountFields } from "./account-fields";

export function RegisterForm() {
  const router = useRouter();
  const [erro, setErro] = useState<ActionError | null>(null);
  const form = useForm<DadosCadastro>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: "", email: "", senha: "", confirmacao: "" },
    mode: "onTouched",
  });

  async function cadastrar({ confirmacao: _confirmacao, ...dados }: DadosCadastro) {
    setErro(null);
    const resultado = await acaoCadastrar(dados);
    if (!resultado.ok) {
      setErro(resultado.error);
      for (const { campo, mensagem } of errosDeCampo(resultado.error.details, CAMPOS_CONTA)) {
        form.setError(campo, { type: "server", message: mensagem });
      }
      if (resultado.error.status === 409) {
        form.setError("email", { type: "server", message: "Este e-mail já tem cadastro." });
      }
      return;
    }
    toast.success("Conta criada. Agora é só entrar.");
    router.push(`${ROTAS.login}?motivo=cadastro&email=${encodeURIComponent(resultado.data.email)}`);
  }

  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Novo membro</p>
      <h1 className="mt-2 text-3xl font-semibold">Criar conta</h1>
      <p className="mt-2 text-base text-muted-foreground">
        O cadastro cria uma conta de <strong className="font-medium text-foreground">Membro</strong>. Contas de
        Staff são criadas pela equipe da oficina.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(cadastrar)} noValidate className="mt-6 space-y-4">
          <AccountFields control={form.control} />
          <FormField
            control={form.control}
            name="confirmacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirme a senha</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {erro && (
            <ErrorPanel
              erro={erro}
              titulo="Não foi possível criar a conta"
              contexto={{
                409: { motivo: "Já existe uma conta com este e-mail.", orientacao: "Entre com ela ou use outro e-mail." },
              }}
            />
          )}

          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            {!form.formState.isSubmitting && <UserPlus aria-hidden />}
            {form.formState.isSubmitting ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href={ROTAS.login} className="font-medium text-brand-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
