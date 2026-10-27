# Monitoolring — Frontend

Interface web do Monitoolring, sistema de gestão de ferramentas e empréstimos para makerspaces e
oficinas compartilhadas. Membros consultam o acervo e os próprios empréstimos; o Staff opera o
balcão (retirada, checklist e devolução), mantém o catálogo e configura o prazo de devolução.

Esta é a reconstrução do frontend da N1 ([horangotango/monitoolring--frontend](https://github.com/horangotango/monitoolring--frontend)),
integrada à API Spring Boot da N2 em [`../backend`](../backend). O histórico das mudanças e suas
justificativas estão em [`docs/EVOLUCAO_FRONTEND.md`](docs/EVOLUCAO_FRONTEND.md).

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Instalação e inicialização](#instalação-e-inicialização)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Integração com o backend](#integração-com-o-backend)
- [Funcionalidades](#funcionalidades)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Design system](#design-system)
- [Validação](#validação)
- [Limitações conhecidas](#limitações-conhecidas)

## Tecnologias

| Área | Escolha |
|---|---|
| Framework | Next.js 14.2 (App Router, Server Components, Server Actions, Middleware) |
| UI | React 18, Tailwind CSS 3, componentes shadcn/ui sobre Radix UI, personalizados |
| Formulários | React Hook Form + Zod 4 (`@hookform/resolvers`) |
| Ícones e tipografia | Lucide React; IBM Plex Sans e IBM Plex Mono (`next/font`) |
| Feedback | Sonner (toasts), `next-themes` (tema claro, escuro e do sistema) |
| Testes | Vitest (regras de domínio, validação, sessão e mensagens) |

A stack do frontend original foi mantida. Foram adicionados apenas os primitivos Radix necessários
(`dialog`, `dropdown-menu`, `tooltip`) e o Vitest.

## Arquitetura

```text
Navegador ──(cookie httpOnly)──▶ Servidor Next.js ──(Authorization: Bearer)──▶ API Spring Boot
            páginas e Server Actions      lib/api/client.ts (server-only)        /api/**
```

- **BFF no servidor Next.** Toda chamada à API parte do servidor: Server Components para
  leitura e Server Actions para escrita. O JWT devolvido por `POST /api/auth/login` fica num
  cookie `httpOnly` (`mt_session`), nunca no JavaScript do navegador nem em logs. Por isso o CORS
  não entra no fluxo.
- **Sessão e permissões.** O `middleware.ts` redireciona sem sessão, com sessão vencida e por
  papel (rotas de Staff). As páginas repetem a checagem no servidor (`exigirUsuario`/`exigirStaff`).
  A autorização definitiva é sempre da API: `401` encerra a sessão e leva ao login com aviso;
  `403` vira uma tela de acesso negado.
- **Contratos tipados.** Cada resposta da API é validada por um schema Zod (`features/*/types.ts`).
  Uma divergência de contrato vira erro explícito, nunca dado parcial na tela.
- **Erros como dado.** Server Actions devolvem `ActionResult<T>`. A tradução de status para
  linguagem de balcão fica em `lib/api/mensagens.ts`, e os detalhes `campo: mensagem` do Bean
  Validation são associados ao campo do formulário correspondente.
- **Organização por funcionalidade.** `features/<domínio>` reúne tipos, schemas, chamadas à API
  (`api.ts`), Server Actions (`actions.ts`), regras puras e componentes. `components/ui` é o design
  system; `components/layout` e `components/shared` são genéricos.

## Instalação e inicialização

Pré-requisitos: Node.js 18.18+ (recomendado 20 LTS) e o backend em execução (veja o
[README da raiz](../README.md#como-iniciar)).

```bash
cd frontend
npm install
cp .env.example .env.local   # ajuste API_URL se a API não estiver em localhost:8080
npm run dev                  # http://localhost:3000
```

A primeira conta Staff vem do bootstrap do backend (`staff@monitoolring.local` em desenvolvimento).
Antes da primeira retirada, um Staff precisa definir o prazo padrão em **Configurações**.

Build de produção:

```bash
npm run build
npm run start   # o Next avisa que a saída é "standalone"; o Dockerfile usa .next/standalone/server.js
```

Com Docker (o backend continua rodando no host):

```bash
docker compose up --build
```

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `API_URL` | `http://localhost:8080/api` (só em desenvolvimento) | Endereço da API lido pelo servidor Next. Obrigatória em produção |
| `NEXT_PUBLIC_API_URL` | — | Compatibilidade com o frontend N1; usada se `API_URL` faltar |
| `NEXT_PUBLIC_TIME_ZONE` | `America/Sao_Paulo` | Fuso de exibição das datas (a API trabalha em UTC) |
| `COOKIE_INSECURE` | — | `true` grava o cookie sem `Secure` em produção, para testar sem HTTPS fora de `localhost` |

Nenhum segredo é necessário no frontend. O antigo `API_TOKEN` fixo foi removido.

## Integração com o backend

Endpoints consumidos (todos sob `/api`):

| Método | Rota | Onde |
|---|---|---|
| `POST` | `/auth/login` | Login (`features/auth/actions.ts`) |
| `POST` | `/auth/register` | Cadastro de Membro |
| `POST` | `/auth/logout` | Encerrar sessão (aviso ao servidor; o cookie é descartado de qualquer forma) |
| `POST` | `/staff` | Configurações → nova conta Staff |
| `GET` | `/tools`, `/tools?status=AVAILABLE` | Catálogo, painel, seleção de ferramenta na retirada |
| `GET` | `/tools/{id}` | Ficha da ferramenta; nome da ferramenta nos empréstimos |
| `POST` | `/tools` | Cadastro de ferramenta |
| `PATCH` | `/tools/{id}` | Edição parcial (só campos alterados + `versao`), inativação e reativação |
| `GET`/`PUT` | `/settings/return-deadline` | Configurações; prazo na retirada; alerta no painel |
| `POST` | `/loans` | Registrar retirada com checklist |
| `GET` | `/loans/{id}` | Detalhe do empréstimo, com os dois checklists |
| `POST` | `/loans/{id}/return` | Registrar devolução com checklist |

`GET /loans/{id}/checklists` não é chamado: `GET /loans/{id}` já traz os dois checklists, e a
segunda requisição seria redundante.

Tratamento por status: `400` mostra a mensagem da API e marca os campos; `401` encerra a sessão;
`403` mostra acesso negado; `404` vira página de não encontrado; `409` recebe tratamento específico
(código repetido, versão desatualizada, ferramenta emprestada, **bloqueio por atraso**, prazo não
configurado, empréstimo já encerrado); `422` lista o que falta no checklist ou indica tomador Staff;
`500` e falhas de rede mostram uma mensagem genérica com orientação, sem detalhes internos.

**CORS:** o backend permite `http://localhost:3000`, mas o frontend não depende disso, porque as
chamadas saem do servidor Next. Nenhuma configuração de segurança do backend foi alterada.

## Funcionalidades

| Tela | Perfil | O que faz |
|---|---|---|
| Login / Cadastro | Público | JWT real, feedback de credenciais inválidas, regras de senha da API (8+ caracteres, até 72 bytes UTF-8), destino pós-login seguro |
| Painel | Ambos | Disponíveis, emprestadas, fora de circulação; quadro de sombras com cada ferramenta; disponibilidade por categoria; próximos vencimentos. Staff vê o prazo vigente, o patrimônio e o alerta de prazo não configurado. Membro vê seu ID de balcão |
| Ferramentas | Ambos | Busca sem acento, filtro por status com contagem, filtro por categoria, tabela ou grade (estado na URL) |
| Ficha da ferramenta | Ambos | Ficha técnica, auditoria, ciclo de vida. Staff: editar, inativar/reativar com confirmação, registrar retirada |
| Cadastro / edição | Staff | Validação espelhando o Bean Validation; PATCH parcial com controle de versão e recarga em caso de conflito |
| Registrar retirada | Staff | Ferramenta disponível + ID do membro + checklist; resumo com prazo vigente; comprovante com o código do empréstimo; painel dedicado ao bloqueio por atraso (409) |
| Empréstimos | Ambos | Abrir por código; lista dos acompanhados neste dispositivo com filtros (em aberto, em atraso, encerrados) |
| Detalhe do empréstimo | Ambos (membro só os próprios) | Régua de prazo, responsáveis, checklists lado a lado com diferenças destacadas |
| Devolução | Staff | Checklist guiado ao lado do registro da retirada, "igual à retirada", alerta de diferenças, confirmação |
| Configurações | Staff | Prazo padrão (1 a 365 dias) e criação de conta Staff |
| Meu perfil | Ambos | Dados da conta, ID para o balcão, validade da sessão |

## Estrutura de diretórios

```text
src/
├── app/
│   ├── (auth)/               # login e cadastro (layout público)
│   ├── (app)/                # área autenticada: painel, ferramentas, empréstimos, configurações, perfil
│   ├── sessao/expirada/      # route handler que descarta a sessão após 401
│   ├── layout.tsx, providers.tsx, globals.css (tokens do design system)
├── components/
│   ├── ui/                   # design system (button, input, form, panel, badge, dialog, table…)
│   ├── layout/               # app shell, sidebar, navegação por papel, breadcrumbs, menu do usuário
│   └── shared/               # page header, callout, empty state, error panel, copy, mono id
├── features/
│   ├── auth/                 # schemas, actions (login, cadastro, logout), formulários
│   ├── ferramentas/          # tipos, status/ciclo de vida, schemas, api, actions, catálogo, formulário
│   ├── emprestimos/          # tipos, situação/atraso/bloqueio, checklist, retirada, devolução, acompanhamento
│   ├── configuracoes/        # prazo padrão e conta Staff
│   └── painel/               # KPIs, quadro de sombras, barras por categoria
├── lib/
│   ├── api/                  # cliente HTTP server-only, ActionResult, mensagens de erro
│   ├── auth/                 # cookie de sessão (codec compartilhado com o middleware)
│   ├── env.ts, format.ts, rotas.ts, utils.ts
└── middleware.ts             # proteção de rotas e papéis
```

## Design system

Identidade **"Grafite + Laranja de Sinalização"**: neutros quentes de concreto (claro) e grafite
(escuro), com uma única cor de marca, o laranja de segurança das máquinas de oficina, reservada
para a ação principal, o foco e a navegação ativa.

- **Tokens** em `src/app/globals.css` (variáveis HSL por tema) expostos no `tailwind.config.ts`:
  superfícies (`surface`, `surface-sunken`), bordas, `brand`, `primary`, `destructive` e cores de
  status (`status-available`, `-loan`, `-repair`, `-lost`, `-inactive`, `-overdue`).
- **Tipografia:** IBM Plex Sans para interface, IBM Plex Mono para códigos, IDs, rótulos técnicos
  e leituras numéricas. Escala compacta (corpo de 14 px).
- **Motivos visuais:** régua milimetrada sob os cabeçalhos, painel perfurado (pegboard) e o
  **quadro de sombras**, em que cada vaga é uma ferramenta real e uma vaga tracejada mostra o que
  está fora da oficina.
- **Status nunca dependem só da cor:** sempre ícone + rótulo (e texto para leitores de tela).
- **Botões:** `primary`, `secondary`, `ghost`, `destructive`, `destructive-ghost`, `link`, com
  estado de carregamento embutido.
- **Acessibilidade:** contraste AA nos dois temas, foco visível, link "pular para o conteúdo",
  rótulos e mensagens de erro ligados aos campos (`aria-describedby`/`aria-invalid`), grupos de
  rádio com teclado, `prefers-reduced-motion` respeitado.

## Validação

| Comando | O que verifica |
|---|---|
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm test` | 44 testes Vitest: atraso e bloqueio, comparação de checklists, ciclo de vida, conversão de valores, PATCH parcial, sessão, redirect seguro, regras de senha e rotas de Staff |
| `npm run build` | Build de produção |
| `npm run validate` | Todos os anteriores em sequência |

Os fluxos ponta a ponta (login, permissões, cadastro e edição de ferramentas, inativação,
retirada, bloqueio por atraso, devolução com divergência, consulta pelo membro, expiração de
sessão, responsividade e tema escuro) foram verificados contra a API real. O registro está em
[`docs/EVOLUCAO_FRONTEND.md`](docs/EVOLUCAO_FRONTEND.md#validação).

## Limitações conhecidas

Todas decorrem do escopo atual da API (N2) e estão documentadas como pendências de N3. Nenhuma
foi simulada no frontend.

- **Não há listagem de empréstimos nem de membros** (FR-6 e FR-7). Empréstimos são abertos pelo
  código do comprovante. A lista "acompanhados neste dispositivo" guarda apenas os IDs no
  `localStorage`, por usuário, e sempre busca os dados atuais na API. Ela não substitui o
  histórico completo.
- **Retirada pelo ID do membro:** sem busca de membros na API, o membro informa o ID exibido em
  *Meu perfil* (e no painel).
- **Atrasos globais:** o painel não consegue contar todos os empréstimos atrasados da oficina,
  apenas os acompanhados no dispositivo. O bloqueio por atraso continua sendo aplicado pela API em
  toda retirada.
- **Divergência na devolução (FR-15) e perda (FR-19)** não existem na API. A devolução mostra as
  diferenças entre os checklists apenas como alerta, e a ferramenta volta como disponível. O Staff
  pode inativá-la em seguida.
- **Logout stateless:** o cookie é descartado, mas o token continua válido no servidor até
  expirar (revogação é N3).
- Ferramenta emprestada não mostra qual empréstimo a contém: a API não relaciona ferramenta e
  empréstimo ativo numa consulta.
