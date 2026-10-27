import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";

export default function FerramentaNaoEncontrada() {
  return (
    <EmptyState
      className="mt-8"
      icon={<SearchX />}
      title="Ferramenta não encontrada"
      description="O identificador não corresponde a nenhuma ferramenta do acervo."
      action={
        <Button asChild variant="secondary">
          <Link href={ROTAS.ferramentas}>
            <ArrowLeft aria-hidden />
            Voltar ao catálogo
          </Link>
        </Button>
      }
    />
  );
}
