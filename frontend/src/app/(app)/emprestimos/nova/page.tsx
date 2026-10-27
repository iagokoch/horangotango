import type { Metadata } from "next";

import { ErrorPanel } from "@/components/shared/error-panel";
import { PageHeader } from "@/components/shared/page-header";
import { RetryButton } from "@/components/shared/retry-button";
import { buscarPrazo } from "@/features/configuracoes/api";
import { CheckoutForm } from "@/features/emprestimos/components/checkout-form";
import { listarFerramentas } from "@/features/ferramentas/api";
import { carregar } from "@/lib/api/server";
import { exigirStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Registrar retirada" };

export default async function NovaRetiradaPage({ searchParams }: { searchParams: { ferramenta?: string } }) {
  const staff = exigirStaff();
  const [disponiveis, prazo] = await Promise.all([
    carregar(() => listarFerramentas("AVAILABLE")),
    carregar(() => buscarPrazo()),
  ]);

  // 404 no prazo é estado do sistema (nunca configurado), não falha de consulta.
  const diasPrazo = prazo.ok ? prazo.data.dias : prazo.error.status === 404 ? null : undefined;

  return (
    <>
      <PageHeader
        title="Registrar retirada"
        description="Escolha a ferramenta, identifique o membro e registre o checklist com ele presente. A API confere a disponibilidade e as pendências em atraso."
      />
      {disponiveis.ok ? (
        <CheckoutForm
          ferramentas={disponiveis.data}
          ferramentaInicialId={searchParams.ferramenta}
          diasPrazo={diasPrazo}
          staffId={staff.id}
        />
      ) : (
        <ErrorPanel erro={disponiveis.error} titulo="Não foi possível carregar as ferramentas disponíveis" acao={<RetryButton />} />
      )}
    </>
  );
}
