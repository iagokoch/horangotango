import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { LoanLookup } from "@/features/emprestimos/components/loan-lookup";
import { TrackedLoans } from "@/features/emprestimos/components/tracked-loans";
import { exigirUsuario } from "@/lib/auth/session";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Empréstimos" };

export default function EmprestimosPage() {
  const usuario = exigirUsuario();
  const staff = usuario.papel === "STAFF";

  return (
    <>
      <PageHeader
        eyebrow={staff ? "Balcão" : "Meus empréstimos"}
        title="Empréstimos"
        description={
          staff
            ? "Acompanhe prazos, abra empréstimos pelo código do comprovante e registre devoluções."
            : "Consulte o prazo de devolução e os checklists dos seus empréstimos."
        }
        actions={
          staff && (
            <Button asChild>
              <Link href={ROTAS.novaRetirada}>
                <ArrowUpRight aria-hidden />
                Registrar retirada
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="titulo-acompanhados" className="min-w-0 space-y-3">
          <div>
            <h2 id="titulo-acompanhados" className="text-base font-semibold">
              Acompanhados neste dispositivo
            </h2>
            <p className="text-sm text-muted-foreground">Dados atualizados na API a cada abertura da tela.</p>
          </div>
          <TrackedLoans usuarioId={usuario.id} papel={usuario.papel} />
        </section>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader title="Abrir empréstimo" description="Pelo código entregue no comprovante da retirada." />
            <PanelBody>
              <LoanLookup />
            </PanelBody>
          </Panel>
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="mb-1.5 flex items-center gap-2 font-medium text-foreground">
              <Info className="size-4" aria-hidden />
              Por que esta lista é por dispositivo?
            </p>
            <p>
              A API atual consulta empréstimos apenas pelo código. A listagem completa{" "}
              {staff ? "do histórico de cada membro" : "dos seus empréstimos"} está prevista para a próxima entrega (N3). Até lá, o
              Monitoolring lembra neste navegador os códigos que você registrou ou abriu, e sempre busca os dados atuais na API.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
