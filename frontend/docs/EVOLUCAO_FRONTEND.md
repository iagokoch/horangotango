# Evolução do frontend — N1 → N2

Documento de apoio à disciplina de Manutenção de Software: registra o estado do frontend herdado,
os problemas encontrados, o que mudou e por quê.

## 1. Situação anterior

O frontend herdado ([horangotango/monitoolring--frontend](https://github.com/horangotango/monitoolring--frontend), branch `master`)
usava Next.js 14, React 18, TypeScript, Tailwind e shadcn/ui, e tinha três telas de ferramentas
(consulta, cadastro, edição) com exclusão.

Pontos positivos, preservados como ideia:

- Chamadas à API somente no servidor (`server-only`), com Server Actions devolvendo erro como dado
  (`ActionResult`) em vez de exceção.
- Validação de respostas com Zod e mensagens de erro em linguagem do operador (motivo +
  orientação), com o bloco de erro ancorado na tela além do toast.
- Mapeamento de `campo: mensagem` do Bean Validation para o campo do formulário.
- Rotas centralizadas num módulo; `revalidatePath` após mutações.

## 2. Problemas encontrados

| # | Problema | Impacto |
|---|---|---|
| 1 | O contrato era o da N1: `quantidade`, `PUT /tools/{id}` e `DELETE` físico | Nenhuma tela funcionava com a API da N2 (`PATCH`, `categoria`, `valorEstimado`, `estadoConservacao`, `status`) |
| 2 | Exclusão física de ferramenta | Contraria o PRD: inativar não é excluir, e o histórico precisa ser preservado. A API não tem mais `DELETE` |
| 3 | Autenticação por `API_TOKEN` fixo no ambiente (marcado como `DEBT`) | Sem login, sem papéis, sem distinção Membro/Staff; todos agiam com o mesmo token |
| 4 | Sem empréstimos, checklists, prazo, bloqueio por atraso ou configurações | 0 dos fluxos principais do PRD (FR-8 a FR-18) tinham interface |
| 5 | Visual padrão do shadcn (slate), sem identidade, sem navegação, dark mode desligado | Aparência de template; nenhuma estrutura para crescer |
| 6 | Página inicial de scaffolding ("Projeto inicializado com Next.js…") | Produto sem ponto de entrada |
| 7 | Sem testes | Regras críticas sem verificação automatizada |

## 3. Melhorias realizadas

### 3.1 Integração com a API da N2

- Todos os DTOs (`ToolResponse`, `LoanResponse`, `ChecklistResponse`, `ReturnDeadlineResponse`,
  `LoginResponse`, `UserResponse`) foram tipados com schemas Zod, e as respostas são validadas.
- **Edição parcial real:** `montarEdicao` envia só os campos alterados mais a `versao`. Isso
  respeita o PATCH e evita sobrescrever o que outra pessoa mudou. O conflito de versão (`409`) é
  tratado com recarga dos dados.
- **Ciclo de vida:** `acoesCicloVida` oferece apenas as transições aceitas pelo backend
  (inativar/reativar). Ferramenta emprestada não exibe ações de status.
- Nenhum endpoint foi inventado. O que a API não oferece foi documentado (seção 7).

### 3.2 Autenticação e sessão

- Login real com JWT. O token fica num cookie `httpOnly` + `SameSite=Lax` (+ `Secure` em produção)
  gravado pelo servidor Next. O navegador nunca tem acesso ao token, o que reduz o impacto de XSS.
- O middleware protege as rotas, guarda o destino em `?next=` (validado contra open redirect) e
  barra Membros nas rotas de Staff. As páginas repetem a verificação no servidor.
- `401` em qualquer chamada descarta a sessão e leva ao login com o aviso "sessão expirada".
  Expiração por `expiraEm` é detectada antes mesmo de chamar a API.
- O logout chama `POST /auth/logout` e descarta o cookie mesmo se a API estiver indisponível.

### 3.3 Fluxos novos

- **Retirada no balcão:** seleção entre as ferramentas disponíveis, ID do membro, checklist
  (estado funcional, avarias, acessórios, com atalhos explícitos "Sem avarias" e "Nenhum", exigidos
  pela API), resumo com prazo vigente e **comprovante** com o código do empréstimo.
- **Bloqueio por inadimplência (regra crítica, FR-12):** o frontend **não** pré-valida atraso. A
  API decide e responde `409`. O painel de bloqueio interpreta os `details` e mostra cada empréstimo
  atrasado, a ferramenta e a data, com links. Linhas fora do formato esperado são exibidas como
  texto, nunca descartadas.
- **Devolução guiada:** o checklist da retirada fica ao lado do novo registro, há um atalho
  "igual à retirada", as diferenças são destacadas campo a campo e a confirmação passa por um
  diálogo de revisão.
- **Detalhe do empréstimo:** régua de prazo (retirada → limite, com estado em atraso), responsáveis
  e checklists lado a lado com as diferenças marcadas.
- **Configurações:** prazo padrão (1 a 365, inteiro) e criação de contas Staff.
- **Painel por papel:** métricas calculadas sobre `GET /tools` (não há endpoint agregador), quadro
  de sombras, disponibilidade por categoria, próximos vencimentos e alerta de prazo não
  configurado (que bloqueia todas as retiradas).

### 3.4 Experiência e design

- Identidade própria: neutros de concreto/grafite com um único laranja de sinalização, IBM Plex
  Sans/Mono e motivos de oficina (régua milimetrada, painel perfurado, quadro de sombras).
- App shell com sidebar agrupada por contexto (Operação, Balcão, Administração, Conta), gaveta no
  celular, trilha de navegação e busca global (tecla `/`).
- Estados completos em todas as telas: carregamento (skeletons), vazio, erro com orientação e ação
  de nova tentativa, sucesso (toast e, quando importa, comprovante).
- Tema claro e escuro desenhados (não uma inversão automática), com contraste AA.

## 4. Justificativas técnicas

| Decisão | Por quê | Alternativa descartada |
|---|---|---|
| Next como BFF, com token em cookie httpOnly | Mantém o padrão `server-only` herdado, protege o token contra XSS e elimina a dependência de CORS | Guardar o JWT no `localStorage` e chamar a API do navegador: mais simples, mas expõe o token |
| Zod nas respostas | Detecta divergência de contrato no ponto de entrada; foi exatamente o que faltou quando a API mudou da N1 para a N2 | Confiar nos tipos TypeScript, que não existem em tempo de execução |
| Regras puras separadas (`status.ts`, `situacao.ts`, `schemas.ts`) | Testáveis sem navegador e reutilizadas por várias telas | Lógica dentro dos componentes |
| Filtros do catálogo no cliente | A API devolve o acervo inteiro sem paginação; uma chamada permite contar cada status sem N requisições | Uma chamada por filtro (`?status=`) |
| Atraso derivado no cliente só para exibição | Espelha a definição da API (`prazo < agora`), mas o bloqueio continua exclusivo do backend | Validar o bloqueio no frontend, o que duplicaria uma regra crítica |
| Índice local de empréstimos acompanhados | Única forma honesta de listar sem endpoint: guarda só IDs e sempre consulta a API | Dados simulados ou endpoints inventados |
| `PATCH` com somente os campos alterados | Respeita a semântica parcial e reduz conflitos | Enviar o formulário inteiro |

## 5. Funcionalidades preservadas

- Consulta, cadastro e edição de ferramentas, agora no contrato da N2.
- Tratamento de erro em camadas (toast + bloco persistente), mensagens por status e mapeamento de
  erros de campo.
- Conflito de versão com "recarregar dados" sem perder o que foi digitado.
- Arquitetura server-only e `ActionResult`, generalizados para `ActionResult<T>`.
- Docker multi-stage com saída `standalone`.

**Removido de propósito:** a exclusão física. O equivalente correto no domínio é a inativação.

## 6. Decisões de arquitetura

- `src/features/<domínio>`: tipos, schemas, `api.ts` (server-only), `actions.ts` (Server Actions),
  regras puras e componentes.
- `src/lib/api`: cliente HTTP único (timeout, `no-store`, parsing do `ErrorResponse`), conversão
  para `ActionResult` e o redirecionamento de 401 num só ponto (`executarAcao`/`carregar`).
- `src/lib/auth`: codec do cookie compartilhado entre o middleware (Edge) e o servidor (Node).
- `src/lib/rotas.ts`: rotas e padrões de rotas de Staff num só lugar (usado por links, middleware e
  revalidação).
- `src/components/ui`: design system sobre Radix, com variantes via `class-variance-authority`.

## 7. Pendências

Sem suporte na API atual. Nada disso foi simulado.

| Item | Situação no frontend | Depende de |
|---|---|---|
| Histórico de empréstimos por membro (FR-6) | Lista por dispositivo + abertura por código | `GET /loans?memberId=` |
| Meus empréstimos (FR-7) e indicador `bloqueado` | Idem; o membro abre pelo código do comprovante | `GET /members/{id}/loans`, `GET /members/{id}` |
| Busca de membro na retirada | Retirada pelo ID exibido no perfil do membro | Endpoint de consulta de membros |
| Divergência na devolução (FR-15) | Diferenças mostradas como alerta; orientação para inativar | Flag e justificativa em `POST /loans/{id}/return` |
| Registro de perda (FR-19) | Sem interface | `POST /loans/{id}/loss` |
| Revogação do token no logout | Cookie descartado; token válido até expirar | Denylist ou refresh token no backend |
| Testes de componentes no navegador | Cobertos pelo roteiro E2E manual/automatizado da seção 8 | Adotar Playwright no repositório, se a equipe quiser |

## 8. Validação

Executado nesta entrega:

| Verificação | Resultado |
|---|---|
| `npm install` | OK |
| `npm run typecheck` | Sem erros |
| `npm run lint` | Sem avisos |
| `npm test` (Vitest) | 44/44 |
| `npm run build` | OK (16 rotas + middleware) |
| E2E contra a API real (Spring Boot + PostgreSQL 16 local) com Microsoft Edge headless | 58/58 passos |

O roteiro E2E percorreu, nesta ordem:

1. Redirecionamentos sem sessão.
2. Login inválido.
3. Validação de cadastro e e-mail repetido (`409`).
4. Painel de membro e bloqueio de rotas de Staff.
5. Logout.
6. Login do Staff do bootstrap.
7. Prazo fora da faixa e definição do prazo.
8. Cadastro de 4 ferramentas.
9. Código repetido (`409`) e valor inválido.
10. Edição parcial.
11. Inativação e reativação com confirmação.
12. Busca sem acento, filtro por status e visualização em grade.
13. Retirada com checklist incompleto, membro inexistente (`404`) e retirada confirmada com
    comprovante.
14. Ferramenta passa a emprestada e sai da seleção.
15. **Bloqueio por atraso (`409`).** O prazo de um empréstimo foi retroagido no banco de teste.
16. Devolução com divergência.
17. Devolução repetida.
18. **Liberação automática do bloqueio.**
19. Tomador Staff (`422`).
20. Criação de conta Staff.
21. Membro abre o próprio empréstimo; outro membro recebe `403`; código inexistente.
22. Sessão vencida e token adulterado (`401`).
23. Cookie inacessível ao JavaScript.
24. Ausência de rolagem horizontal em 390 px e 820 px.
25. Gaveta móvel e telas em tema escuro.

Não verificado nesta entrega: execução via Docker (Docker indisponível na máquina de
desenvolvimento) e leitores de tela reais (a acessibilidade foi tratada por semântica, ARIA e
navegação por teclado, sem teste com NVDA/VoiceOver).
