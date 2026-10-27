import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Acesso negado" };

export default function AcessoNegadoPage() {
  return (
    <EmptyState
      className="mt-10"
      icon={<ShieldX />}
      title="Área exclusiva do Staff"
      description="Seu perfil de membro não tem acesso a esta operação. Se precisar, procure o responsável pela oficina."
      action={
        <Button asChild variant="secondary">
          <Link href={ROTAS.painel}>Voltar ao painel</Link>
        </Button>
      }
    />
  );
}
