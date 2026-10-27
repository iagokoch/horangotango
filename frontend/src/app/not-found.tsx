import Link from "next/link";
import { Compass } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <EmptyState
        className="w-full max-w-md bg-surface"
        icon={<Compass />}
        title="Página não encontrada"
        description="O endereço não corresponde a nenhuma tela do Monitoolring."
        action={
          <Button asChild variant="secondary">
            <Link href={ROTAS.inicio}>Ir para o início</Link>
          </Button>
        }
      />
    </div>
  );
}
