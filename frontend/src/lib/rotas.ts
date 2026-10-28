// Rotas das telas num só lugar: links, redirecionamentos, middleware e revalidação de cache usam
// estes valores, então renomear uma rota muda um arquivo.
export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  sessaoExpirada: "/sessao/expirada",
  acessoNegado: "/acesso-negado",
  painel: "/painel",
  ferramentas: "/ferramentas",
  novaFerramenta: "/ferramentas/nova",
  emprestimos: "/emprestimos",
  novaRetirada: "/emprestimos/nova",
  configuracoes: "/configuracoes",
  perfil: "/perfil",
} as const;

export function rotaFerramenta(id: string): string {
  return `${ROTAS.ferramentas}/${encodeURIComponent(id)}`;
}

export function rotaEdicaoFerramenta(id: string): string {
  return `${rotaFerramenta(id)}/editar`;
}

export function rotaRetiradaDaFerramenta(id: string): string {
  return `${ROTAS.novaRetirada}?ferramenta=${encodeURIComponent(id)}`;
}

export function rotaEmprestimo(id: string): string {
  return `${ROTAS.emprestimos}/${encodeURIComponent(id)}`;
}

export function rotaDevolucao(id: string): string {
  return `${rotaEmprestimo(id)}/devolucao`;
}

// Prefixos exclusivos de Staff (espelham o SecurityConfig da API). Usado pelo middleware.
export const PADROES_STAFF: RegExp[] = [
  /^\/ferramentas\/nova\/?$/,
  /^\/ferramentas\/[^/]+\/editar\/?$/,
  /^\/emprestimos\/nova\/?$/,
  /^\/emprestimos\/[^/]+\/devolucao\/?$/,
  /^\/configuracoes(\/.*)?$/,
];

export const ROTAS_PUBLICAS = [ROTAS.login, ROTAS.cadastro];
