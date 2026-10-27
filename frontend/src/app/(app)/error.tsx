"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

import { Callout } from "@/components/shared/callout";
import { Button } from "@/components/ui/button";

// Erro inesperado (ex.: resposta da API fora do contrato). Falhas HTTP previstas são tratadas na
// própria página; este boundary só aparece para o que não se resolve corrigindo dados.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[tela] erro inesperado", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-xl">
      <Callout
        tone="danger"
        title="Algo não saiu como esperado"
        role="alert"
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            <RotateCw aria-hidden />
            Tentar novamente
          </Button>
        }
      >
        A resposta do servidor não pôde ser exibida. Tente de novo; se continuar, avise o responsável pelo sistema
        {error.digest ? (
          <>
            {" "}
            informando o código <span className="font-mono">{error.digest}</span>
          </>
        ) : null}
        .
      </Callout>
    </div>
  );
}
