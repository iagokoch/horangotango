import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CircleUserRound,
  Gauge,
  PackagePlus,
  Settings2,
  Hammer,
  ArrowUpRight,
} from "lucide-react";

import type { Papel } from "@/lib/auth/types";
import { ROTAS } from "@/lib/rotas";

export interface ItemNavegacao {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  // Prefixos que também marcam o item como ativo.
  ativoEm?: RegExp;
}

export interface GrupoNavegacao {
  titulo: string;
  itens: ItemNavegacao[];
  papeis: Papel[];
}

// A navegação é derivada do papel: ações de Staff nem aparecem para Membros. Isso é apresentação;
// o middleware, as páginas e principalmente a API continuam barrando o acesso.
export const GRUPOS_NAVEGACAO: GrupoNavegacao[] = [
  {
    titulo: "Operação",
    papeis: ["MEMBER", "STAFF"],
    itens: [
      { href: ROTAS.painel, rotulo: "Painel", icone: Gauge },
      {
        href: ROTAS.ferramentas,
        rotulo: "Ferramentas",
        icone: Hammer,
        ativoEm: /^\/ferramentas(?!\/nova)(\/.*)?$/,
      },
      {
        href: ROTAS.emprestimos,
        rotulo: "Empréstimos",
        icone: ArrowLeftRight,
        ativoEm: /^\/emprestimos(?!\/nova)(\/.*)?$/,
      },
    ],
  },
  {
    titulo: "Balcão",
    papeis: ["STAFF"],
    itens: [
      { href: ROTAS.novaRetirada, rotulo: "Registrar retirada", icone: ArrowUpRight },
      { href: ROTAS.novaFerramenta, rotulo: "Cadastrar ferramenta", icone: PackagePlus },
    ],
  },
  {
    titulo: "Administração",
    papeis: ["STAFF"],
    itens: [{ href: ROTAS.configuracoes, rotulo: "Configurações", icone: Settings2 }],
  },
  {
    titulo: "Conta",
    papeis: ["MEMBER", "STAFF"],
    itens: [{ href: ROTAS.perfil, rotulo: "Meu perfil", icone: CircleUserRound }],
  },
];

export function gruposDoPapel(papel: Papel): GrupoNavegacao[] {
  return GRUPOS_NAVEGACAO.filter((grupo) => grupo.papeis.includes(papel));
}

export function itemAtivo(item: ItemNavegacao, pathname: string): boolean {
  if (item.ativoEm) return item.ativoEm.test(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
