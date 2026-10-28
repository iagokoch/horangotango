"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import type { Usuario } from "@/lib/auth/types";
import { ROTAS } from "@/lib/rotas";

import { Breadcrumbs } from "./breadcrumbs";
import { CatalogSearch } from "./catalog-search";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function SidebarConteudo({ usuario, onNavigate }: { usuario: Usuario; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link
          href={ROTAS.painel}
          onClick={onNavigate}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Monitoolring, ir para o painel"
        >
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2">
        <SidebarNav papel={usuario.papel} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 border-t border-foreground/[0.07] p-2">
        <UserMenu usuario={usuario} />
      </div>
    </>
  );
}

// Estrutura da área autenticada. No desktop, a navegação fica na chapa (canvas) e o conteúdo numa
// folha clara encaixada nela; no celular a folha ocupa a tela inteira e a navegação vira gaveta.
export function AppShell({ usuario, children }: { usuario: Usuario; children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-surface lg:bg-canvas lg:pl-[var(--sidebar-width)]">
      <a
        href="#conteudo"
        className="sr-only z-[60] focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-overlay"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col lg:flex">
        <SidebarConteudo usuario={usuario} />
      </aside>

      <Dialog open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent aria-describedby="menu-descricao">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <DialogDescription id="menu-descricao" className="sr-only">
            Navegação do Monitoolring
          </DialogDescription>
          <SidebarConteudo usuario={usuario} onNavigate={() => setMenuAberto(false)} />
        </SheetContent>
      </Dialog>

      <div className="flex min-h-dvh flex-col lg:py-2 lg:pr-2">
        <div className="flex flex-1 flex-col bg-surface lg:rounded-sheet lg:shadow-sheet">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur-md sm:px-6 lg:static lg:h-16 lg:rounded-t-sheet lg:bg-transparent lg:px-10 lg:backdrop-blur-none">
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-1.5 lg:hidden"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              aria-expanded={menuAberto}
            >
              <Menu aria-hidden />
            </Button>
            <Link href={ROTAS.painel} className="lg:hidden" aria-label="Monitoolring, ir para o painel">
              <Logo compacto />
            </Link>
            <div className="hidden min-w-0 flex-1 sm:block">
              <Breadcrumbs />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <CatalogSearch />
            </div>
          </header>

          <main
            id="conteudo"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-20 pt-7 focus:outline-none sm:px-6 lg:px-10 lg:pt-10"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
