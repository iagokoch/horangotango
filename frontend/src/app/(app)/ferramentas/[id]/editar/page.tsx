import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorPanel } from "@/components/shared/error-panel";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { ToolTag } from "@/components/shared/tool-tag";
import { buscarFerramenta, listarFerramentas } from "@/features/ferramentas/api";
import { StatusBadge } from "@/features/ferramentas/components/status-badge";
import { ToolForm } from "@/features/ferramentas/components/tool-form";
import { carregar } from "@/lib/api/server";
import { exigirStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editar ferramenta" };

export default async function EditarFerramentaPage({ params }: { params: { id: string } }) {
  exigirStaff();
  const [ferramenta, lista] = await Promise.all([
    carregar(() => buscarFerramenta(params.id)),
    carregar(() => listarFerramentas()),
  ]);

  if (!ferramenta.ok) {
    if (ferramenta.error.status === 404) notFound();
    return <ErrorPanel erro={ferramenta.error} titulo="Não foi possível carregar a ferramenta" acao={<RetryButton />} />;
  }

  const categorias = lista.ok
    ? Array.from(new Set(lista.data.map((f) => f.categoria))).sort((a, b) => a.localeCompare(b, "pt-BR"))
    : [];

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            <ToolTag codigo={ferramenta.data.codigo} />
            <span>Editando</span>
          </>
        }
        title={ferramenta.data.nome}
        description="O status muda pela inativação ou reativação, na ficha da ferramenta."
        meta={
          <>
            <StatusBadge status={ferramenta.data.status} />
            <span className="text-sm text-muted-foreground">
              Versão <span className="tabular font-semibold text-foreground">{ferramenta.data.versao}</span> do registro
            </span>
          </>
        }
      />
      {/* key: após recarregar uma versão nova, o formulário reinicia com os dados atuais. */}
      <ToolForm key={ferramenta.data.versao} ferramenta={ferramenta.data} categoriasExistentes={categorias} />
    </div>
  );
}
