"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Callout } from "@/components/shared/callout";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { AccountFields } from "@/features/auth/components/account-fields";
import { CAMPOS_CONTA, contaSchema, type DadosConta } from "@/features/auth/schemas";
import type { ActionError } from "@/lib/api/errors";
import { errosDeCampo } from "@/lib/api/mensagens";
import type { Usuario } from "@/lib/auth/types";

import { acaoCadastrarStaff } from "../actions";

// Cadastro de Staff por outro Staff (POST /api/staff). O autocadastro público só cria Membros.
export function StaffForm() {
  const [erro, setErro] = useState<ActionError | null>(null);
  const [criado, setCriado] = useState<Usuario | null>(null);
  const form = useForm<DadosConta>({
    resolver: zodResolver(contaSchema),
    defaultValues: { nome: "", email: "", senha: "" },
    mode: "onTouched",
  });

  async function cadastrar(dados: DadosConta) {
    setErro(null);
    setCriado(null);
    const resultado = await acaoCadastrarStaff(dados);
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
    setCriado(resultado.data);
    form.reset();
    toast.success(`Conta Staff criada para ${resultado.data.nome}.`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(cadastrar)} noValidate className="space-y-5">
        {criado && (
          <Callout tone="success" title={`${criado.nome} agora é Staff`} role="status">
            <span className="flex flex-wrap items-center gap-2">
              Entra com <strong>{criado.email}</strong> e a senha definida aqui. Oriente a pessoa a guardar a senha com segurança.
              <CopyButton valor={criado.email} rotulo="Copiar e-mail" compacto />
            </span>
          </Callout>
        )}
        <AccountFields control={form.control} />
        {erro && (
          <ErrorPanel
            erro={erro}
            titulo="Não foi possível criar a conta"
            contexto={{ 409: { motivo: "Já existe uma conta com este e-mail.", orientacao: "Use outro e-mail." } }}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            A conta terá acesso total ao balcão e às configurações.
          </p>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {!form.formState.isSubmitting && <UserPlus aria-hidden />}
            Criar conta Staff
          </Button>
        </div>
      </form>
    </Form>
  );
}
