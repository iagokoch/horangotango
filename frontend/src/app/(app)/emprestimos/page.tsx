import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
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
        title={staff ? "Empréstimos" : "Meus empréstimos"}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="titulo-acompanhados" className="min-w-0">
          <SectionHeading
            id="titulo-acompanhados"
            title="Acompanhados neste dispositivo"
            description="Os dados são consultados na API a cada abertura da tela."
            className="mb-2"
          />
          <TrackedLoans usuarioId={usuario.id} papel={usuario.papel} />
        </section>

        <aside className="space-y-6 lg:pt-1">
          <div className="rounded-lg border bg-surface-sunken p-5">
            <LoanLookup />
          </div>
          <div className="px-1 text-base leading-relaxed text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <Info className="size-4 text-subtle" aria-hidden />
              Por que a lista é por dispositivo?
            </p>
            <p>
              A API atual consulta empréstimos apenas pelo código. A listagem completa{" "}
              {staff ? "do histórico de cada membro" : "dos seus empréstimos"} está prevista para a próxima entrega (N3).
              Até lá, o Monitoolring lembra neste navegador os códigos que você registrou ou abriu e sempre busca os dados
              atuais na API.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
