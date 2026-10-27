"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { ROTAS } from "@/lib/rotas";

// Busca global do catálogo no cabeçalho. A tecla "/" foca o campo, como em ferramentas de
// desenvolvimento; Enter leva ao catálogo filtrado.
export function CatalogSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const campo = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState("");

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      const editando = alvo && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));
      if (evento.key === "/" && !editando && !evento.metaKey && !evento.ctrlKey) {
        evento.preventDefault();
        campo.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  // No próprio catálogo a busca da página já está à vista; o campo do cabeçalho seria duplicado.
  if (pathname === ROTAS.ferramentas) return null;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const valor = termo.trim();
    router.push(valor ? `${ROTAS.ferramentas}?q=${encodeURIComponent(valor)}` : ROTAS.ferramentas);
    setTermo("");
    campo.current?.blur();
  }

  return (
    <form role="search" onSubmit={enviar} className="group relative">
      <label htmlFor="busca-global" className="sr-only">
        Buscar ferramenta no catálogo
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-foreground"
        aria-hidden
      />
      <input
        ref={campo}
        id="busca-global"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        placeholder="Buscar ferramenta"
        className="h-9 w-44 rounded-md border bg-surface-sunken pl-9 pr-3 text-base sm:pr-9 transition-[width,border-color,background-color,box-shadow] duration-200 ease-out placeholder:text-subtle hover:border-border-strong focus:w-56 focus:border-foreground/60 focus:bg-surface focus:shadow-focus focus:outline-none sm:w-60 sm:focus:w-72"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-surface px-1 text-xs text-muted-foreground group-focus-within:opacity-0 sm:flex">
        /
      </kbd>
    </form>
  );
}
