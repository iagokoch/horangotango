import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorPanel } from "@/components/shared/error-panel";
import { MonoId } from "@/components/shared/mono-id";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { ToolTag } from "@/components/shared/tool-tag";
import { Button } from "@/components/ui/button";
import { buscarEmprestimo } from "@/features/emprestimos/api";
import { DeadlineBar } from "@/features/emprestimos/components/deadline-bar";
import { ReturnForm } from "@/features/emprestimos/components/return-form";
import { SituacaoBadge } from "@/features/emprestimos/components/situacao-badge";
import { buscarFerramenta } from "@/features/ferramentas/api";
import { carregar } from "@/lib/api/server";
import { exigirStaff } from "@/lib/auth/session";
import { rotaEmprestimo } from "@/lib/rotas";

export const metadata: Metadata = { title: "Registrar devolução" };

export default async function DevolucaoPage({ params }: { params: { id: string } }) {
  const staff = exigirStaff();
  const resultado = await carregar(() => buscarEmprestimo(params.id));

  if (!resultado.ok) {
    if (resultado.error.status === 404) notFound();
    return <ErrorPanel erro={resultado.error} titulo="Não foi possível carregar o empréstimo" acao={<RetryButton />} />;
  }

  const emprestimo = resultado.data;
  const ferramenta = await carregar(() => buscarFerramenta(emprestimo.ferramentaId));

  if (emprestimo.status !== "ACTIVE") {
    return (
      <EmptyState
        className="mt-6 rounded-xl border"
        icon={<CheckCheck />}
        title="Este empréstimo já foi encerrado"
        description="A devolução já foi registrada. O checklist pode ser consultado no empréstimo."
        action={
          <Button asChild variant="secondary">
            <Link href={rotaEmprestimo(emprestimo.id)}>Abrir empréstimo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            {ferramenta.ok && <ToolTag codigo={ferramenta.data.codigo} grande />}
            <span className="inline-flex items-center gap-1.5">
              membro <MonoId id={emprestimo.membroId} />
            </span>
          </>
        }
        title={ferramenta.ok ? `Devolução: ${ferramenta.data.nome}` : "Registrar devolução"}
        description="Preencha o checklist com a ferramenta em mãos. A comparação com a retirada acontece enquanto você preenche."
        meta={<SituacaoBadge emprestimo={emprestimo} />}
      />
      <div className="mb-8 max-w-xl">
        <DeadlineBar emprestimo={emprestimo} />
      </div>
      <ReturnForm emprestimo={emprestimo} staffId={staff.id} />
    </>
  );
}
