# Justificativa Técnica do Padrão de Rotas

Este documento registra o **motivo** das decisões tomadas em
[`api-nomenclatura-recursos.md`](./api-nomenclatura-recursos.md) e
[`api-convencoes-http.md`](./api-convencoes-http.md), não apenas o "como".

## 1. Por que REST orientado a recursos, e não RPC/verbos na URL

A stack do projeto (`spring-boot-starter-webmvc`) é construída em torno do
modelo de controllers mapeando rotas para recursos, o que casa
naturalmente com REST orientado a substantivos. Alternativas baseadas em
RPC (`POST /confirmCheckout`, `POST /getTools`) foram descartadas
porque:

- **Previsibilidade para o consumidor.** Um frontend (ou qualquer cliente
  da API) consegue inferir a rota de uma nova funcionalidade a partir do
  padrão existente, sem precisar de um dicionário de nomes de ação por
  endpoint.
- **Aderência a boas práticas de mercado.** O modelo adotado segue o
  espírito de guias amplamente usados na indústria — *Microsoft REST API
  Guidelines*, *Google API Design Guide* e *Zalando RESTful API
  Guidelines* — adaptado ao vocabulário do domínio do projeto.
- **Menor acoplamento entre rota e implementação.** Rotas RPC tendem a
  vazar detalhes de implementação/fluxo na própria URL; rotas orientadas a
  recurso descrevem *o que* existe no sistema, não *como* uma tela
  específica opera sobre ele.

## 2. Por que nomes de resource em inglês

O `docs/prd.md` fixa o vocabulário de domínio em português (Membro,
Ferramenta, Empréstimo, Retirada, Devolução, Checklist de Conservação,
Bloqueio por Inadimplência, Perda) — isso continua sendo a fonte de
verdade conceitual do produto e não muda. A decisão aqui é sobre a
**API**: os nomes de resource nas rotas passam a ser em inglês, para
alinhar com o restante do projeto, que também está migrando para inglês
(variáveis, métodos, classes), evitando um código-base bilíngue onde só a
camada HTTP fica em português.

Como o vocabulário do PRD é a referência conceitual, mantemos aqui um
pequeno glossário de tradução entre o termo do PRD e o resource da API,
para preservar a rastreabilidade entre requisito e rota:

| Termo do PRD | Resource (API) |
|---|---|
| Ferramenta | `tool` |
| Empréstimo | `loan` |
| Retirada | `checkout` |
| Devolução | `return` |
| Perda | `loss` |
| Membro | `member` |

- **Consistência com o restante do código.** Variáveis, métodos e classes
  do projeto também vão adotar inglês; manter as rotas em português
  criaria uma inconsistência de idioma logo na camada mais visível da
  API.
- **Um único glossário central.** A tabela acima é o ponto único de
  tradução entre o PRD (português) e a API (inglês) — qualquer nova rota
  parte dela em vez de decidir a tradução ad-hoc.
- **Sem perda de rastreabilidade.** Como o glossário é fixo e pequeno,
  revisar/validar uma rota contra o requisito correspondente do PRD
  continua sendo trivial (ex.: FR-9 fala em "Retirada", a rota é
  `POST /loans` seguida de eventos de checkout).

## 3. Por que sub-resources de ação em vez de verbo ou flag de status

A alternativa mais simples seria expor a transição de estado de um
Empréstimo como `PATCH /loans/{id}` com um campo `status` no corpo.
Essa abordagem foi descartada em favor de sub-resources de ação
(`POST /loans/{id}/return`, `POST /loans/{id}/loss`)
porque:

- **RNF de integridade e auditoria (PRD §5) exige imutabilidade.** Todo
  registro de Retirada, Devolução, Perda e Checklist deve ser imutável uma
  vez confirmado; correções exigem um novo registro, nunca edição
  silenciosa. Um `PATCH` de status sugere que o registro anterior foi
  editado; um `POST` de sub-resource deixa explícito que um novo evento,
  com seu próprio timestamp e responsável, foi criado.
- **Rastreabilidade por rota.** Com sub-resources de ação, é possível
  auditar por rota qual operação de negócio ocorreu (quem chamou
  `POST /loans/108/loss` e quando) sem precisar inspecionar o corpo
  da requisição para descobrir qual transição foi solicitada.
- **Alinhamento com a regra crítica FR-12.** A tentativa de Retirada
  precisa ser rejeitada de forma explícita (com `409` e motivo) quando o
  Membro está bloqueado — um endpoint de ação dedicado deixa esse ponto de
  decisão isolado e fácil de testar, em vez de misturado na lógica genérica
  de um `PATCH` de status.

## 4. Por que não há `DELETE` físico

A mesma RNF de integridade e auditoria (§5) exige que o histórico de
Ferramentas, Membros, Empréstimos e Checklists seja preservado
indefinidamente. Por isso nenhuma rota `DELETE` é definida sobre esses
recursos — a "remoção" de uma Ferramenta é sempre uma mudança de estado
(`inativa`), reversível e auditável, nunca uma exclusão física de
registro.

## 5. Benefícios de consistência, legibilidade e escalabilidade

- **Consistência:** todo novo endpoint segue as mesmas três regras
  (substantivo plural em português, verbo HTTP mapeado por semântica,
  sub-resource de ação para transições de estado), reduzindo decisões
  ad-hoc a cada nova funcionalidade.
- **Legibilidade:** a URL descreve o recurso e, quando aplicável, o evento
  de negócio (`loans/{id}/return`), sem exigir consulta a
  documentação externa para entender o que uma rota faz.
- **Escalabilidade do padrão:** funcionalidades hoje fora do escopo do MVP
  mas já mapeadas no PRD (§7.1) — Treinamento Prévio (N2) e Multas
  automatizadas (N3) — encaixam-se no mesmo padrão sem exigir uma nova
  convenção: por exemplo, `POST /loans/{id}/training` ou
  `GET /loans/{id}/fine` seguiriam a mesma lógica de sub-resource já
  estabelecida aqui.
