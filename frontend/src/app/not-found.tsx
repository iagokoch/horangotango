import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";

// 404 global: uma etiqueta vazia, tracejada, como a vaga de uma ferramenta que não está no quadro.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-5 py-6 sm:px-10">
      <Link href={ROTAS.inicio} className="self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo />
      </Link>
      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div
          aria-hidden
          className="relative flex h-44 w-32 flex-col items-center border-2 border-dashed border-border-strong pt-12 [clip-path:polygon(22%_0,78%_0,100%_16%,100%_100%,0_100%,0_16%)]"
        >
          <span className="absolute left-1/2 top-4 size-4 -translate-x-1/2 rounded-full border-2 border-border-strong" />
          <span className="font-condensed text-5xl font-bold text-subtle">404</span>
        </div>
        <h1 className="mt-8 font-display text-4xl font-bold">Página não encontrada</h1>
        <p className="mt-3 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
          O endereço não corresponde a nenhuma tela do Monitoolring. Confira o link ou volte ao início.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={ROTAS.inicio}>Ir para o início</Link>
        </Button>
      </main>
    </div>
  );
}
