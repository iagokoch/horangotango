# Evolução do frontend do Monitoolring

Documento de apoio à disciplina de **Manutenção de Software**. Registra o estado em que o frontend
foi herdado, os problemas encontrados, as duas etapas de manutenção realizadas e como cada uma foi
validada:

1. **Reconstrução funcional (N1 → N2):** integração com a API real, autenticação, permissões e os
   fluxos de empréstimo.
2. **Redesign "Etiqueta & Bancada":** nova identidade visual e design system, sem mudar regras de
   negócio nem contratos da API.

Tudo o que está descrito aqui pode ser conferido no código de `frontend/src`. Os resultados da
seção [Validações](#9-validações) vêm de execuções reais em 27/10/2026.

## Sumário

1. [Contexto](#1-contexto)
2. [Problemas identificados](#2-problemas-identificados)
3. [Reconstrução funcional](#3-reconstrução-funcional)
4. [Redesign "Etiqueta & Bancada"](#4-redesign-etiqueta--bancada)
5. [Componentes reformulados](#5-componentes-reformulados)
6. [Telas reformuladas](#6-telas-reformuladas)
7. [Relação com Manutenção de Software](#7-relação-com-manutenção-de-software)
8. [Correções feitas durante a validação](#8-correções-feitas-durante-a-validação)
9. [Validações](#9-validações)
10. [Limitações conhecidas](#10-limitações-conhecidas)
11. [Conclusão](#11-conclusão)

## 1. Contexto

O **Monitoolring** controla o acervo de ferramentas de makerspaces e oficinas compartilhadas. Há
dois papéis:

- **Membro:** consulta o acervo e os próprios empréstimos.
- **Staff:** opera o balcão (retirada com checklist de conservação, devolução), mantém o catálogo,
  configura o prazo de devolução e cria outras contas Staff.

A regra crítica do domínio é o **bloqueio por inadimplência** (FR-12): um membro com empréstimo
em atraso não pode retirar outra ferramenta até devolver as pendências.

O frontend herdado ([horangotango/monitoolring--frontend](https://github.com/horangotango/monitoolring--frontend),
branch `master`) usava Next.js 14, React 18, TypeScript, Tailwind e shadcn/ui. Tinha três telas de
ferramentas (consulta, cadastro e edição) com exclusão física e falava com o contrato da API da N1.

Pontos positivos do código herdado que foram preservados como ideia:

- Chamadas à API somente no servidor (`server-only`), com Server Actions devolvendo erro como dado
  (`ActionResult`) em vez de exceção.
- Validação de respostas com Zod e mensagens de erro em linguagem do operador.
- Mapeamento de `campo: mensagem` do Bean Validation para o campo do formulário.
- Rotas centralizadas em um módulo e `revalidatePath` após mutações.

## 2. Problemas identificados

### 2.1 Técnicos e de integração (frontend herdado)

| # | Problema | Impacto |
|---|---|---|
| 1 | Contrato da N1: `quantidade`, `PUT /tools/{id}` e `DELETE` físico | Nenhuma tela funcionava com a API da N2 (`PATCH`, `categoria`, `valorEstimado`, `estadoConservacao`, `status`) |
| 2 | Exclusão física de ferramenta | Contraria o PRD: inativar não é excluir, e o histórico precisa ser preservado. A API não tem mais `DELETE` |
| 3 | Autenticação por `API_TOKEN` fixo no ambiente (marcado como `DEBT`) | Sem login, sem papéis, sem distinção Membro/Staff |
| 4 | Sem empréstimos, checklists, prazo, bloqueio por atraso ou configurações | Os fluxos principais do PRD (FR-8 a FR-18) não tinham interface |
| 5 | Página inicial de scaffolding ("Projeto inicializado com Next.js…") | Produto sem ponto de entrada |
| 6 | Sem testes | Regras críticas sem verificação automatizada |

### 2.2 Manutenção

- Componentes visuais do shadcn sem personalização nem tokens próprios: cada tela decidia cores e
  espaçamentos localmente.
- Sem organização por domínio: chamadas, tipos e componentes misturados.

### 2.3 Consistência visual (primeira identidade da reconstrução)

A reconstrução funcional introduziu uma identidade própria, "Grafite + Laranja de Sinalização".
Ela resolveu a falta de identidade do template, mas, com o produto completo, apareceram limitações
que motivaram o redesign:

- **Uma cor com três papéis.** O laranja (`--brand: 19 92% 53%`) era ao mesmo tempo marca, botão
  primário (`--primary`) e anel de foco (`--ring`). Por isso ficava perto de dois status
  semânticos: "Em reparo" (`--status-repair`, matiz 34°) e "Em atraso" (`--status-overdue`,
  matiz 0°). A cor de ação competia com as cores de alerta.
- **O código da ferramenta não tinha forma própria.** Aparecia como texto monoespaçado comum, igual
  a um UUID, embora seja o identificador que o operador procura na prateleira.
- **Motivos decorativos dispersos.** A régua milimetrada (`.scale-rule`) e o painel perfurado
  (`.pegboard`) estavam espalhados por cinco arquivos, sem uma função de leitura clara.
- **Métricas fragmentadas.** O painel usava blocos de KPI isolados (`kpi-tile.tsx`), sem uma
  leitura única da proporção entre os status do acervo.

### 2.4 Experiência do usuário

- Etapas da retirada sem indicação de progresso, e resumo da ficha pouco destacado.
- No celular, o campo de busca do cabeçalho cortava o texto "Buscar ferramenta" (corrigido e
  validado nesta etapa; veja a [seção 9.4](#94-verificação-do-cabeçalho-mobile)).

## 3. Reconstrução funcional

### 3.1 Arquitetura

```text
Navegador ──(cookie httpOnly)──▶ Servidor Next.js ──(Authorization: Bearer)──▶ API Spring Boot
            páginas e Server Actions      lib/api/client.ts (server-only)        /api/**
```

- **Next.js como BFF.** Toda chamada à API parte do servidor: Server Components para leitura e
  Server Actions para escrita. O CORS não entra no fluxo.
- **Organização por funcionalidade.** `src/features/<domínio>` (`auth`, `ferramentas`,
  `emprestimos`, `configuracoes`, `painel`) reúne tipos, schemas Zod, chamadas à API (`api.ts`),
  Server Actions (`actions.ts`), regras puras e componentes.
- **Camadas compartilhadas.** `src/lib/api` tem o cliente HTTP único (timeout, `no-store`, parsing
  do `ErrorResponse`), a conversão para `ActionResult<T>` e o tratamento de 401 em um só ponto
  (`executarAcao` e `carregar`). `src/lib/auth` tem o codec do cookie, compartilhado entre o
  middleware (Edge) e o servidor (Node). `src/lib/rotas.ts` concentra as rotas e os padrões de
  rota de Staff.
- **Design system.** `src/components/ui` (primitivos sobre Radix), `components/layout` (casca da
  aplicação) e `components/shared` (peças genéricas de conteúdo).

### 3.2 Integração com a API real

- Todos os DTOs (`ToolResponse`, `LoanResponse`, `ChecklistResponse`, `ReturnDeadlineResponse`,
  `LoginResponse`, `UserResponse`) são validados por schemas Zod. Uma divergência de contrato vira
  erro explícito, nunca dado parcial na tela.
- **Edição parcial real:** `montarEdicao` envia só os campos alterados mais a `versao`. O conflito
  de versão (`409`) é tratado com recarga, sem perder o que foi digitado.
- **Ciclo de vida:** `acoesCicloVida` oferece apenas as transições aceitas pelo backend
  (inativar/reativar). Ferramenta emprestada não exibe ações de status.
- **Tratamento por status:** `400` marca os campos; `401` encerra a sessão; `403` mostra acesso
  negado; `404` vira "não encontrado"; `409` tem tratamento específico (código repetido, versão
  desatualizada, ferramenta emprestada, bloqueio por atraso, prazo não configurado, empréstimo
  encerrado); `422` indica checklist incompleto ou tomador Staff; `500` e falhas de rede mostram uma
  mensagem genérica com orientação.
- Nenhum endpoint foi inventado. O que a API não oferece está na
  [seção 10](#10-limitações-conhecidas).

### 3.3 Autenticação e sessão

- Login com JWT real. O token fica em cookie `httpOnly` + `SameSite=Lax` (+ `Secure` em
  produção), gravado pelo servidor Next. O JavaScript do navegador nunca tem acesso a ele.
- O `middleware.ts` redireciona sem sessão, com sessão vencida e por papel, e guarda o destino em
  `?next=` (validado contra open redirect).
- As páginas repetem a verificação no servidor (`exigirUsuario` e `exigirStaff`). A autorização
  definitiva é sempre da API.
- `401` em qualquer chamada descarta a sessão e leva ao login com o aviso "sessão expirada".

### 3.4 Permissões

A navegação é derivada do papel (`components/layout/navegacao.ts`): ações de Staff nem aparecem
para Membros. Isso é apresentação. A proteção real tem três camadas:

1. o middleware;
2. a checagem no servidor da página;
3. a API (`SecurityConfig`), que responde `403`.

O roteiro E2E confirma que um cookie com papel forjado passa pelas duas primeiras camadas, mas é
barrado pela API (passo 79).

### 3.5 Principais fluxos

- **Retirada no balcão:** seleção entre as ferramentas disponíveis, ID do membro e checklist
  (estado funcional, avarias e acessórios, com "Sem avarias" e "Nenhum" explícitos, exigidos pela
  API). Ao confirmar, mostra um comprovante com o código do empréstimo.
- **Bloqueio por inadimplência (FR-12):** o frontend **não** pré-valida atraso. A API decide e
  responde `409`. O `BlockedPanel` interpreta os `details` e lista cada empréstimo atrasado com
  links.
- **Devolução guiada:** o checklist da retirada fica ao lado do novo registro, com atalho "Igual à
  retirada", diferenças destacadas campo a campo e diálogo de revisão antes de confirmar.
- **Configurações:** prazo padrão (1 a 365 dias) e criação de contas Staff.

## 4. Redesign "Etiqueta & Bancada"

O redesign trocou apenas a camada de apresentação. Server Actions, schemas, regras puras
(`status.ts`, `situacao.ts`, `schemas.ts`) e chamadas à API não mudaram. Os 44 testes unitários
continuaram passando sem alteração.

### 4.1 Conceito visual

A metáfora é a ficha sobre a bancada:

- A área de trabalho é uma **chapa de aço frio** (token `--canvas`).
- O conteúdo fica numa **folha branca encaixada** nela (`rounded-sheet` + `shadow-sheet` no
  desktop).
- O texto é **grafite**.
- O código de cada ferramenta aparece como a **etiqueta física** colada nela.

No celular, a folha ocupa a tela inteira e a navegação vira gaveta.

### 4.2 Paleta

Os tokens HSL ficam em `src/app/globals.css` e são expostos em `tailwind.config.ts`. O tema escuro
troca só as variáveis, nunca as classes.

| Papel | Token (tema claro) | Uso |
|---|---|---|
| Chapa | `--canvas: 90 6% 92.5%` | Fundo da área de trabalho |
| Folha | `--surface: 0 0% 100%` | Conteúdo |
| Grafite | `--foreground: 204 16% 10%`, `--primary: 204 16% 12%` | Texto e botão primário |
| Amarelo-etiqueta | `--brand: 45 90% 56%` | **Somente** seleção, item ativo e destaque |
| Foco | `--ring: 42 100% 30%` | Anel de foco (amarelo escurecido, para ter contraste) |
| Status | `--status-available`, `-loan`, `-repair`, `-lost`, `-inactive`, `-overdue` | Paleta semântica separada da marca |

A principal decisão foi separar ação de destaque. O botão primário passou a ser grafite, e o
amarelo deixou de disputar atenção com os status de alerta. O comentário no topo de `globals.css`
registra a meta de contraste: texto principal acima de 15:1, `muted` acima de 5,5:1 e botão
primário com 16:1. Essas razões foram calculadas para os tokens; não houve auditoria
automatizada de contraste nesta entrega.

### 4.3 Tipografia

Carregada via `next/font` em `src/app/layout.tsx`:

- **Archivo**, com eixo de largura variável (`wdth`). Uma família faz três papéis: corpo (largura
  normal), títulos `.font-display` (`wdth 116`, expandida, "placa de máquina") e códigos
  `.font-condensed` / `.tool-tag` (`wdth 80`, condensada).
- **Martian Mono**, só para identificadores técnicos (UUIDs), onde cada caractere precisa ser
  inconfundível.

A escala é compacta, com corpo de 14 px (`fontSize.base` em `tailwind.config.ts`).

### 4.4 Elemento característico: ToolTag

O código da ferramenta tem sempre a mesma forma (classe `.tool-tag` com ilhós desenhado em
`::before`) no catálogo, na ficha, no seletor de retirada, no comprovante, na devolução e nos
empréstimos acompanhados. Há uma variante grande (`.tool-tag-lg`) para cabeçalhos. Para leitores de
tela, a etiqueta é anunciada como "Código <valor>".

### 4.5 Layout

- **Desktop (≥ 1024 px):** navegação fixa sobre a chapa (`--sidebar-width: 15rem`) e folha com
  cabeçalho (trilha de navegação + busca) e conteúdo até 1240 px.
- **Tablet e celular:** cabeçalho fixo com botão de menu, logotipo compacto e busca. A navegação
  abre em gaveta (`Dialog`/`SheetContent`).
- **Formulários longos:** barra de ações presa ao pé da tela (cadastro/edição de ferramenta e
  devolução).

### 4.6 Design system

- **Primitivos (`components/ui`):** `button` (variantes `primary`, `secondary`, `ghost`,
  `destructive`, `destructive-ghost`, `link`, com estado de carregamento), `input`/`textarea`/
  `select`, `form` (associa rótulo, descrição e erro por `aria-describedby`/`aria-invalid`),
  `panel`, `badge`, `dialog`, `alert-dialog`, `dropdown-menu`, `table`, `tooltip`, `skeleton`,
  `sonner` e o novo `segmented`.
- **Tokens além de cor:** raios (`sheet`, `xl`, `lg`…), sombras (`hairline`, `raised`, `sheet`,
  `overlay`, `focus`) e animações nomeadas (`segment-grow`, `stamp-in`, `pulse-ring`, `shimmer`).

### 4.7 Responsividade

As telas foram desenhadas para 1440, 820 e 390 px:

- A tabela do catálogo vira lista no celular (`ListaFerramentas`, `md:hidden`).
- As abas de filtro rolam na horizontal sem quebrar linha.
- A comparação de checklists troca o layout de quatro colunas por blocos empilhados abaixo de
  `md`.
- A ficha de retirada sai da lateral e vai para baixo das etapas.

A ausência de rolagem horizontal foi medida em 14 telas e nas três larguras (seção 9).

### 4.8 Acessibilidade

- Status nunca dependem só de cor: sempre há ícone e rótulo.
- Foco visível com anel próprio (`:focus-visible` e `shadow-focus`).
- Link "Pular para o conteúdo".
- Grupos de rádio com `role="radiogroup"`/`role="radio"`.
- Regiões `aria-live` para contagens de filtro e diferenças de checklist.
- A régua do acervo tem `role="img"` com a descrição textual das quantidades.
- `prefers-reduced-motion` desliga as animações (`globals.css`).

### 4.9 Microinterações

Poucas, e cada uma responde a um evento:

- A régua do acervo se preenche ao abrir o painel (`animate-segment-grow`, com atraso por trecho).
- O carimbo "Devolver até" entra com movimento curto ao confirmar a retirada (`animate-stamp-in`).
- O selo "Em atraso" pulsa (`animate-pulse-ring`).
- As abas de filtro ganham o traço amarelo com transição de escala.
- O campo de busca do cabeçalho alarga ao receber foco.
- Os skeletons usam brilho (`shimmer`).

## 5. Componentes reformulados

Nomes e responsabilidades conferidos no código.

| Componente | Arquivo | Responsabilidade | Onde é usado |
|---|---|---|---|
| `ToolTag` | `components/shared/tool-tag.tsx` | **Novo.** Etiqueta do código da ferramenta, com variante `grande` | Catálogo, ficha, edição, seletor de retirada, comprovante, devolução, detalhe do empréstimo, acompanhados, diálogo de ciclo de vida |
| `FilterTabs` | `components/ui/segmented.tsx` | **Novo.** Abas de filtro com contagem, `aria-pressed` e traço amarelo na ativa; rolam na horizontal no celular | Catálogo (status) e empréstimos acompanhados (situação) |
| `Segmented` | `components/ui/segmented.tsx` | **Novo.** Alternância compacta entre poucas opções equivalentes | Modo tabela/grade do catálogo; tema no menu da conta |
| `DataList` / `DataRow` | `components/shared/data-list.tsx` | **Novo.** Ficha técnica rótulo → valor; o rótulo sobe para cima do valor no celular | Ficha da ferramenta, detalhe do empréstimo, perfil |
| `SectionHeading` | `components/shared/section-heading.tsx` | **Novo.** Título de seção fora de painel, com descrição e ações alinhadas | Painel, empréstimos, detalhe do empréstimo |
| `InventoryStrip` | `features/painel/components/inventory-strip.tsx` | **Novo**, substitui `kpi-tile.tsx`. Régua única do acervo por status; cada número leva ao catálogo filtrado | Painel |
| `ChecklistComparison` | `features/emprestimos/components/checklist-view.tsx` | **Reformulado.** Comparação campo a campo (retirada × devolução) com "=" ou "mudou" | Diálogo de revisão da devolução; detalhe do empréstimo encerrado |
| `ChecklistView` | mesmo arquivo | **Reformulado.** Leitura de um checklist com destaque dos campos divergentes | Comprovante, devolução, detalhe |
| `ShadowBoard` | `features/painel/components/shadow-board.tsx` | **Reformulado.** Quadro de sombras: cada vaga é uma ferramenta; vaga tracejada = fora da oficina | Painel |
| `DeadlineBar` | `features/emprestimos/components/deadline-bar.tsx` | **Reformulado.** Régua retirada → prazo, com estado de atraso | Detalhe, devolução, acompanhados |
| `LifecycleTrack` | `features/ferramentas/components/lifecycle-track.tsx` | **Reformulado.** Trilha do ciclo de vida da ferramenta | Ficha da ferramenta |
| `PageHeader`, `Callout`, `EmptyState`, `MonoId` | `components/shared/` | **Reformulados** na nova tipografia e paleta | Todas as telas |
| `AppShell`, `SidebarNav`, `UserMenu`, `CatalogSearch`, `Logo` | `components/layout/` | **Reformulados.** Chapa + folha, gaveta móvel, menu da conta com tema | Área autenticada |

## 6. Telas reformuladas

| Área | Melhorias |
|---|---|
| **Login e cadastro** | Layout de autenticação refeito; títulos em Archivo expandida; avisos de sessão expirada, sessão encerrada e conta criada em `Callout` |
| **Painel** | Saudação com data; atalhos de balcão; `InventoryStrip` no lugar dos KPIs; quadro de sombras por categoria; prazo vigente e patrimônio (Staff) ou ID do balcão (Membro); próximos vencimentos |
| **Ferramentas** | Busca grande, categoria, `Segmented` tabela/grade, `FilterTabs` por status com contagem; grade em formato de etiqueta pendurada; lista dedicada no celular |
| **Ficha / cadastro / edição** | `ToolTag` grande no cabeçalho, `DataList`, trilha do ciclo de vida; formulário em seções com prévia da etiqueta e barra de ações fixa |
| **Registrar retirada** | Etapas numeradas ligadas por trilho, que viram "visto" quando preenchidas; ficha de retirada lateral com carimbo "Devolver até"; comprovante com picote |
| **Empréstimos / detalhe** | Abertura por código; acompanhados com `FilterTabs`; régua de prazo; responsáveis; checklists com `ChecklistComparison` |
| **Devolução** | "Como saiu" × "Como voltou" lado a lado; aviso de diferenças em tempo real; barra fixa com contagem de diferenças; revisão em diálogo largo |
| **Configurações** | Prazo com botões −/+ e sugestões; valor vigente em destaque com autoria; criação de conta Staff |
| **Meu perfil** | Cartão de conta com o ID para o balcão e botão de cópia; validade da sessão |
| **Acesso negado / não encontrado / erro** | `EmptyState` padronizado com ação de retorno |

## 7. Relação com Manutenção de Software

| Qualidade | Como o trabalho contribui |
|---|---|
| **Manutenibilidade** | Cores, raios, sombras e animações são tokens. Mudar a identidade inteira mexeu em `globals.css`, `tailwind.config.ts` e nos componentes, não nas regras |
| **Modularidade** | Separação `features/<domínio>` × `components/ui` × `components/shared` × `lib`. O redesign tocou só a camada visual de cada módulo |
| **Reutilização** | `ToolTag` substituiu a renderização avulsa do código em 10 arquivos; `FilterTabs` e `Segmented` servem a três telas; `ChecklistComparison` serve à revisão e ao detalhe |
| **Consistência** | Uma cor de destaque com papel único; o mesmo objeto visual para o mesmo conceito (código = etiqueta, UUID = `MonoId`) |
| **Legibilidade** | Comentários curtos explicam o porquê de cada componente; nomes no vocabulário do domínio (`Etapa`, `Comprovante`, `acoesCicloVida`) |
| **Redução de duplicação** | Os motivos decorativos espalhados (`.scale-rule`, `.pegboard`) saíram; `InventoryStrip` substituiu os blocos de KPI; `AccountFields` é compartilhado entre cadastro de Membro e de Staff |
| **Testabilidade** | Regras puras (`situacao.ts`, `status.ts`, `schemas.ts`, `session-codec.ts`) testadas sem navegador; o roteiro E2E desta etapa exercita a interface contra a API real |
| **Evolução da interface** | O tema escuro e as larguras de tela saem dos mesmos tokens; novos status ou telas reaproveitam os componentes existentes |
| **Preservação das regras de negócio** | O redesign não alterou `actions.ts`, `api.ts`, schemas nem testes; o bloqueio por atraso continua decidido só pela API; os 44 testes unitários passam sem modificação |

A correção desta etapa (seção 8) também ilustra uma manutenção corretiva típica. O defeito vinha da
interação entre a revalidação de cache do framework e o estado local do componente. Foi isolado e
corrigido em 7 linhas, sem efeito colateral nas outras 93 verificações do roteiro.

## 8. Correções feitas durante a validação

| Defeito | Causa | Correção | Tipo |
|---|---|---|---|
| O comprovante de retirada mostrava o UUID da ferramenta em vez da etiqueta e do nome | A Server Action chama `revalidatePath`, e o Next 14 rerrenderiza a rota na resposta. A lista `ferramentas`, que só tem as disponíveis, chegava sem a ferramenta recém-emprestada, então `ferramentas.find(...)` não encontrava nada e o `Comprovante` caía no fallback `MonoId` | `checkout-form.tsx` guarda a ferramenta selecionada antes da chamada e a passa ao comprovante junto com o empréstimo | Defeito de frontend, já presente desde a reconstrução (não introduzido pelo redesign) |

A correção do campo de busca do cabeçalho mobile, feita na sessão anterior (`catalog-search.tsx`:
`pr-3` no celular, porque o atalho `/` fica oculto, `w-44` e `sm:w-60`), foi revalidada sem
necessidade de ajuste (seção 9.4).

Durante a primeira execução do roteiro, 10 falhas vieram dos seletores do próprio roteiro: os
títulos de `EmptyState` e `Callout` são `<p>`, não headings. Os seletores foram ajustados para
procurar o texto. A verificação continua exigindo o mesmo conteúdo.

## 9. Validações

### 9.1 Ambiente

| Item | Configuração |
|---|---|
| Sistema | Windows 11, Node.js 24, Git Bash |
| Banco de testes | Contêiner Docker **dedicado** `monitoolring-e2e-pg` (`postgres:16`, porta 5434, dados em `tmpfs`, descartável). O contêiner de desenvolvimento existente não foi tocado |
| Backend | `./mvnw spring-boot:run` com JDK 21 e `DB_URL=jdbc:postgresql://localhost:5434/monitoolring_e2e`; código do backend sem alterações |
| Frontend | Build de produção (`npm run build`) servido por `next start -p 3100` com `API_URL=http://localhost:8080/api` |
| Navegador | Microsoft Edge headless via `playwright-core` 1.64.1 (dependência de desenvolvimento) |

O build foi executado diretamente em `frontend/`, depois de `npm ci`. Não foi necessária cópia
temporária nem junction de `node_modules`.

### 9.2 Verificações estáticas e build

Executadas em `frontend/` depois da correção da seção 8:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Sem erros |
| `npm run lint` | `✔ No ESLint warnings or errors` |
| `npm test` | 3 arquivos, **44/44** testes passando |
| `npm run build` | `✓ Compiled successfully`, 16 páginas geradas + middleware |

### 9.3 Roteiro funcional pela interface (E2E)

Roteiro automatizado com **94 passos** (`frontend/e2e/roteiro.mjs`, executado com
`npm run test:e2e`; preparação em [`e2e/README.md`](../e2e/README.md)). Ele roda pela interface
real contra a API e o banco de testes, sem mocks. Os dados de teste usam um sufixo único (ex.: `E2E-FUR-XLD2`).

**Resultado final: 94 executados, 94 aprovados, 0 falhos, 0 não executados.** Execução sobre o
banco recriado do zero, depois da correção.

| Área | Passos | O que foi verificado |
|---|---:|---|
| Autenticação | 9 | Redirecionamento sem sessão; `?next=` preservado; login vazio e inválido (401, mensagem neutra, senha limpa); destino externo ignorado (sem open redirect); `/login` com sessão vai ao painel; logout remove o cookie e volta a proteger as rotas |
| Cadastro | 4 | Validação (e-mail, senha curta, confirmação); cadastro de membro com aviso e e-mail preenchido; e-mail repetido (409) |
| Permissões | 10 | ID do balcão no painel do membro; menu sem ações de Staff; estado vazio do catálogo sem botão de cadastro; membro barrado em `/configuracoes`, `/ferramentas/nova`, `/emprestimos/nova` e na devolução; membro abre o próprio empréstimo sem "Registrar devolução"; outro membro recebe 403; **papel forjado no cookie é recusado pela API (403) sem gravar nada** |
| Staff | 5 | Navegação administrativa; estado vazio com cadastro; criação de conta Staff; e-mail repetido (409); novo Staff entra |
| Prazos | 4 | Retirada desabilitada sem prazo; 0 e 366 rejeitados sem gravar; prazo de 7 dias definido; alerta do painel some |
| Ferramentas | 21 | Validação de todos os campos; valor zero e 3 casas decimais; 4 cadastros; código duplicado (409); ficha; **edição parcial com incremento de `versao` conferido no banco**; edição sem alterações; **conflito de versão entre duas abas (409) com "Recarregar dados" e sem sobrescrita**; inativação e reativação com confirmação; inativa fora da seleção; filtro por status; busca sem acento ("medicao" → "Medição"); filtro por categoria e limpeza; estado vazio da busca; grade; busca do cabeçalho; catálogo e ficha sem ações de Staff para o membro |
| Retirada | 8 | Pré-seleção pelo atalho do catálogo; envio vazio valida os três blocos sem gravar; membro inexistente (404); tomador Staff (422); **comprovante com código, etiqueta, nome, checklist e prazo**; ferramenta passa a Emprestada e sem ações de status; sai da seleção; segunda retirada sem atraso aceita |
| Empréstimos | 2 | Detalhe para Staff (régua, responsáveis, checklists, devolução); código inexistente |
| Atraso | 5 | Prazo retroagido no banco de teste; selo "Em atraso"; **bloqueio 409 com link para a pendência, sem alterar a ferramenta**; filtro "Em atraso"; **liberação após a devolução** |
| Devolução | 7 | Diferenças destacadas em tempo real (3 diferenças); revisão compara os checklists e "Voltar e revisar" não grava; confirmação encerra o empréstimo; detalhe encerrado com os dois checklists; ferramenta volta a Disponível; devolução repetida impedida; "Igual à retirada" sem diferenças |
| Sessão | 4 | Cookie `httpOnly` + `SameSite=Lax`, ausente de `document.cookie`; sessão vencida (aviso + destino preservado + cookie removido); token adulterado (401 da API → login); cookie corrompido |
| Responsividade | 9 | Em 390, 820 e 1440 px: login e cadastro, busca do cabeçalho e 12 telas autenticadas sem rolagem horizontal |
| Mobile 390 px | 6 | Gaveta de navegação; catálogo em lista; **retirada e devolução completas pelo celular**; tema escuro; logout |

**Manipulação de datas (atraso).** Para simular atraso, um único `UPDATE` foi aplicado no banco de
testes, restrito ao empréstimo criado pelo roteiro e ainda ativo:
`data_hora_retirada - 10 dias` e `prazo_devolucao = retirada original - 3 dias`. Isso respeita a
restrição `prazo_devolucao > data_hora_retirada`. Nenhum outro dado foi alterado diretamente.

### 9.4 Verificação do cabeçalho mobile

Medição automatizada do campo `#busca-global`. A largura do placeholder foi calculada com a fonte
real (Archivo 14 px) e comparada com a área útil do campo (largura − padding):

| Largura | Campo em repouso | Texto / área útil | Campo com foco | Texto / área útil | Transborda? |
|---|---:|---:|---:|---:|---|
| 390 px | 176 px | 114,9 / 126 px | 224 px | 114,9 / 174 px | Não |
| 820 px | 240 px | 114,9 / 166 px | 288 px | 114,9 / 214 px | Não |
| 1440 px | 240 px | 114,9 / 166 px | 288 px | 114,9 / 214 px | Não |

As capturas em 390 e 820 px mostram "Buscar ferramenta" inteiro, e o desktop mantém o atalho `/`.

### 9.5 Inspeção visual

Capturas geradas pelo roteiro (cadastro e painel nas três larguras; catálogo, comprovante, revisão
da devolução e tema escuro em 390 px) e revisadas manualmente. Não foram encontradas sobreposições,
cortes de texto ou rolagem horizontal.

### 9.6 Não verificado nesta entrega

- Execução via Docker do frontend.
- Dispositivos móveis reais: o celular foi emulado no Edge (390×844, toque, DPR 2), sem iOS
  Safari nem Android Chrome físicos.
- Leitores de tela reais (NVDA/VoiceOver). A acessibilidade foi tratada por semântica, ARIA e
  teclado.
- Auditoria automatizada de contraste.

## 10. Limitações conhecidas

As limitações abaixo decorrem do escopo atual da API (N2). Nenhuma foi simulada no frontend.

| Item | Situação no frontend | Depende de |
|---|---|---|
| Histórico de empréstimos por membro (**FR-6**) | **Não implementado.** Há abertura por código e uma lista "acompanhados neste dispositivo", que guarda só IDs no `localStorage` e sempre consulta a API | `GET /loans?memberId=` |
| Meus empréstimos (**FR-7**) e indicador `bloqueado` | **Não implementado.** O membro abre pelo código do comprovante | `GET /members/{id}/loans`, `GET /members/{id}` |
| Busca de membro na retirada | Retirada pelo ID exibido em *Meu perfil* e no painel do membro | Endpoint de consulta de membros |
| Divergência na devolução (**FR-15**) | **Parcial.** As diferenças são calculadas e mostradas como alerta, mas a ferramenta volta como disponível; a orientação é inativá-la manualmente | Flag e justificativa em `POST /loans/{id}/return` |
| Registro de perda (**FR-19**) | **Não implementado.** Sem interface | `POST /loans/{id}/loss` |
| Atrasos globais no painel | O painel só conhece os empréstimos acompanhados no dispositivo; o bloqueio continua aplicado pela API em toda retirada | Endpoint de empréstimos em atraso |
| Revogação do token no logout | O cookie é descartado, mas o token segue válido no servidor até expirar | Denylist ou refresh token no backend |
| Ferramenta emprestada sem link para o empréstimo | A API não relaciona ferramenta e empréstimo ativo em uma consulta | Campo ou endpoint de empréstimo ativo |

Observações visuais:

- No quadro de ferramentas do painel, códigos longos (o limite é de 18 caracteres) são abreviados
  com reticências na vaga.
- Os campos usam o corpo de 14 px. Em iOS Safari, campos abaixo de 16 px podem provocar zoom ao
  receber foco; isso não foi verificado em dispositivo real.

## 11. Conclusão

A primeira etapa transformou um frontend que não funcionava com a API da N2 em uma aplicação
integrada. Ela tem autenticação real, permissões em três camadas, os fluxos de balcão do PRD
suportados pela API e tratamento explícito de cada resposta de erro.

A segunda etapa trocou a identidade visual por um design system com tokens, tipografia de uma só
família com eixo de largura e um elemento próprio do domínio (a etiqueta da ferramenta). Regras de
negócio e contratos não mudaram.

A validação desta entrega deu os seguintes resultados:

- Typecheck, lint, 44 testes unitários e build sem falhas.
- Roteiro de 94 passos pela interface real, com 94 aprovados.
- Ausência de rolagem horizontal em 14 telas nas três larguras.
- Cabeçalho mobile corrigido e medido.

A validação encontrou e corrigiu um defeito no comprovante de retirada, anterior ao redesign. As
pendências que restam (FR-6, FR-7, FR-15 completo e FR-19) dependem de endpoints que a API ainda
não oferece e estão documentadas como tal.
