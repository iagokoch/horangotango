import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";

export default function EmprestimoNaoEncontrado() {
  return (
    <EmptyState
      className="mt-6 rounded-xl border"
      icon={<SearchX />}
      title="Empréstimo não encontrado"
      description="Nenhum empréstimo corresponde a este código. Confira o comprovante da retirada."
      action={
        <Button asChild variant="secondary">
          <Link href={ROTAS.emprestimos}>
            <ArrowLeft aria-hidden />
            Voltar aos empréstimos
          </Link>
        </Button>
      }
    />
  );
}
