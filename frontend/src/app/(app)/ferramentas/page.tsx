import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";

import { ErrorPanel } from "@/components/shared/error-panel";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { Button } from "@/components/ui/button";
import { listarFerramentas } from "@/features/ferramentas/api";
import { CatalogSkeleton } from "@/features/ferramentas/components/catalog-skeleton";
import { ToolCatalog } from "@/features/ferramentas/components/tool-catalog";
import { contarPorStatus } from "@/features/ferramentas/status";
import { carregar } from "@/lib/api/server";
import { exigirUsuario } from "@/lib/auth/session";
import { plural } from "@/lib/format";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Ferramentas" };

export default async function FerramentasPage() {
  const usuario = exigirUsuario();
  const staff = usuario.papel === "STAFF";
  const resultado = await carregar(() => listarFerramentas());

  const contagem = resultado.ok ? contarPorStatus(resultado.data) : null;

  return (
    <>
      <PageHeader
        eyebrow="Acervo da oficina"
        title="Ferramentas"
        description={
          contagem && resultado.ok
            ? `${plural(resultado.data.length, "ferramenta cadastrada", "ferramentas cadastradas")}, ${plural(contagem.AVAILABLE, "disponível", "disponíveis")} para retirada agora.`
            : "Consulte a disponibilidade de cada ferramenta do acervo."
        }
        actions={
          staff && (
            <Button asChild>
              <Link href={ROTAS.novaFerramenta}>
                <PackagePlus aria-hidden />
                Cadastrar ferramenta
              </Link>
            </Button>
          )
        }
      />
      {resultado.ok ? (
        <Suspense fallback={<CatalogSkeleton />}>
          <ToolCatalog ferramentas={resultado.data} podeGerenciar={staff} />
        </Suspense>
      ) : (
        <ErrorPanel erro={resultado.error} titulo="Não foi possível carregar o catálogo" acao={<RetryButton />} />
      )}
    </>
  );
}
