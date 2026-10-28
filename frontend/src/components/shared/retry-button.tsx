"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

// Refaz a renderização no servidor (nova consulta à API) sem recarregar a página inteira.
export function RetryButton({ rotulo = "Tentar novamente", onRetry }: { rotulo?: string; onRetry?: () => void }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pendente}
      onClick={() => {
        onRetry?.();
        startTransition(() => router.refresh());
      }}
    >
      {!pendente && <RotateCw aria-hidden />}
      {rotulo}
    </Button>
  );
}
