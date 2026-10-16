# Padrão de Operações HTTP nos Endpoints

Este documento define como os métodos HTTP (`GET`, `POST`, `PUT`, `PATCH`,
`DELETE`) devem ser usados sobre os resources definidos em
[`api-nomenclatura-recursos.md`](./api-nomenclatura-recursos.md).

> **Prefixo `/api`.** As rotas deste documento são escritas sem prefixo, mas no
> código todas ficam sob `/api`: `GET /tools` é `GET /api/tools`,
> `POST /auth/login` é `POST /api/auth/login`, e o health check é
> `GET /api/health`.
>
> **Desenho-alvo, não estado atual.** Este documento descreve a API planejada.
> Hoje existem no código as rotas de `auth`, `staff` e `tools` da tabela da
> seção 2, além de `GET /api/health`. As de `members`, `loans` e `settings`
> ainda não estão na `main`. O estado de cada item está no
> [README do backend](../README.md#o-que-mudou-desde-a-n1).

## 1. Semântica adotada por verbo

### `GET` — leitura
Sempre idempotente, sem efeito colateral no estado do sistema. Usado para
catálogo de ferramentas (FR-5), histórico de empréstimos (FR-6/FR-7) e
consulta de configuração.

### `POST` — criação de resource ou de sub-resource de ação
`POST` é usado tanto para criar um resource "normal" (`POST /tools`)
quanto para registrar um **evento de transição de estado** como
sub-resource de ação: `POST /loans/{id}/return`,
`POST /loans/{id}/loss`. Essa segunda forma existe porque o PRD
exige que retirada, devolução e perda gerem **registros imutáveis e
auditáveis** (§5, Integridade e auditoria) — logo cada transição é
modelada como a criação de um novo registro de evento, nunca como a edição
de um campo `status`. Ver justificativa completa em
[`api-justificativa-tecnica.md`](./api-justificativa-tecnica.md).

### `PATCH` — atualização parcial de campos mutáveis
Usado apenas em resources cujos campos podem ser corrigidos sem violar a
regra de auditoria — por exemplo, editar nome/categoria de uma Ferramenta
ou inativá-la (FR-4). Nunca usado para transicionar o estado de um
Empréstimo (isso é `POST` de sub-resource de ação, ver acima).

### `PUT` — substituição integral de resource singleton
Reservado para o único resource singleton do sistema:
`settings/return-deadline` (FR-8). Substitui o valor de configuração
por inteiro; não existe caso de uso de atualização parcial de configuração
no MVP.

### `DELETE` — não utilizado para dados de negócio críticos
Ferramenta, Membro, Staff, Empréstimo, Checklist **nunca são excluídos
fisicamente** via API. A regra de integridade/auditoria do PRD (§5) exige
histórico permanente. "Remoção" de uma Ferramenta é sempre lógica, via
`PATCH` de status para `inativa` (FR-4) — não existe rota `DELETE /tools/{id}`.

## 2. Tabela de exemplos práticos

| Método | Rota | Descrição | Quem chama | Status de sucesso |
|---|---|---|---|---|
| `POST` | `/auth/register` | Membro cria a própria conta | Público | `201` |
| `POST` | `/auth/login` | Autentica e inicia sessão | Público | `200` |
| `POST` | `/auth/logout` | Encerra a sessão no cliente. É stateless: o servidor não invalida o token, que segue válido até expirar (revogação é N3) | Membro/Staff | `204` |
| `POST` | `/staff` | Staff cadastra outro Staff (FR-2) | Staff | `201` |
| `GET` | `/tools` | Lista catálogo com disponibilidade em tempo real (FR-5) | Membro/Staff | `200` |
| `POST` | `/tools` | Cadastra nova Ferramenta (FR-3) | Staff | `201` |
| `GET` | `/tools/{id}` | Detalha uma Ferramenta | Membro/Staff | `200` |
| `PATCH` | `/tools/{id}` | Edita dados, inativa ou reativa (FR-4); exige `versao` (optimistic lock) | Staff | `200` |
| `GET` | `/members/{id}` | Consulta dados e bloqueio do próprio Membro (FR-7) ou de qualquer Membro (Staff, FR-6) | Membro (próprio)/Staff | `200` |
| `GET` | `/members/{id}/loans` | Histórico de empréstimos do Membro | Membro (próprio)/Staff | `200` |
| `GET` | `/loans` | Lista empréstimos (Staff filtra por status/membro) | Staff | `200` |
| `POST` | `/loans` | Staff confirma Retirada, com Checklist embutido (FR-9–11); rejeitado com `409` se o Membro tiver empréstimo em atraso (FR-12) | Staff | `201` |
| `GET` | `/loans/{id}` | Detalha um Empréstimo | Membro (próprio)/Staff | `200` |
| `GET` | `/loans/{id}/checklists` | Consulta checklist(s) de retirada e devolução lado a lado (FR-14) | Membro (próprio)/Staff | `200` |
| `POST` | `/loans/{id}/return` | Staff confirma Devolução com Checklist; aceita flag de divergência (FR-13–16) | Staff | `200` |
| `POST` | `/loans/{id}/loss` | Staff registra Perda, fechando o Empréstimo sem Checklist de devolução (FR-19) | Staff | `200` |
| `GET` | `/settings/return-deadline` | Consulta o prazo padrão configurado | Staff | `200` |
| `PUT` | `/settings/return-deadline` | Define/atualiza o prazo padrão (FR-8) | Staff | `200` |

## 3. Convenção de status codes

| Código | Quando usar |
|---|---|
| `200 OK` | Leitura bem-sucedida, ou ação/transição que retorna a representação atualizada do resource (ex.: `POST /loans/{id}/return`) |
| `201 Created` | Criação de um novo resource identificável (ex.: `POST /tools`, `POST /loans`) |
| `204 No Content` | Ação bem-sucedida sem corpo de resposta (ex.: `logout`) |
| `400 Bad Request` | A requisição não tem a forma esperada: JSON malformado, tipo errado, parâmetro inválido (ex.: `?status=` com valor inexistente) ou falha de Bean Validation em algum campo (obrigatório ausente ou em branco, tamanho, formato de e-mail, `valorEstimado` ≤ 0). Ver 3.1 |
| `401 Unauthorized` | Requisição sem token válido (ausente, malformado, assinatura errada, expirado ou sem `exp`) em rota que exige autenticação; também login com credenciais inválidas |
| `403 Forbidden` | Sessão autenticada, mas sem permissão para o recurso (ex.: Membro tentando acessar histórico de outro Membro, ou rota exclusiva de Staff) |
| `404 Not Found` | Resource referenciado não existe |
| `405 Method Not Allowed` | Método não suportado na rota (ex.: `DELETE` ou `PUT` em `/tools/{id}`) |
| `409 Conflict` | Conflito com o estado atual do sistema: identificador já usado (e-mail, código de Ferramenta), `versao` desatualizada no `PATCH` (optimistic lock), mudança de status de Ferramenta emprestada, tentativa de Retirada com Membro bloqueado por inadimplência (FR-12) ou duas Retiradas simultâneas da mesma Ferramenta (RNF de consistência) |
| `422 Unprocessable Entity` | Corpo bem formado e válido campo a campo, mas que viola uma regra de negócio (ex.: Checklist incompleto, FR-10; `status` não permitido no `PATCH` de Ferramenta). Ver 3.1 |
| `500 Internal Server Error` | Erro inesperado no servidor. A mensagem é genérica e não expõe detalhe interno; o stack trace fica só no log |

Todo erro volta no mesmo formato JSON (`ErrorResponse`: `timestamp`, `status`,
`error`, `message`, `details`). Em `400` por Bean Validation, `details` lista
os campos com problema. A exceção conhecida são os erros lançados em filtros do
servlet fora do Spring MVC, que ainda saem no formato padrão do Spring Boot
(pendência menor, registrada no README).

### 3.1 Fronteira entre `400`, `422` e `409`

Decisão da equipe na N2:

- **`400` — forma.** O servidor não consegue interpretar o pedido ou algum campo,
  olhado isoladamente, não tem o formato exigido. Isso cobre JSON malformado, tipo
  errado e as anotações de Bean Validation do DTO (`@NotBlank`, `@Size`,
  `@Positive`, `@Email`, `@NotNull` etc.). Exemplo: `PATCH /tools/{id}` sem `versao`.
- **`422` — regra de negócio.** O corpo está bem formado e cada campo é válido, mas o
  pedido viola uma regra do domínio. Exemplos: Checklist de Conservação sem o mínimo
  exigido pelo PRD (FR-10) e `PATCH /tools/{id}` pedindo `status` `ON_LOAN`, `LOST` ou
  `UNDER_REPAIR`, que só os fluxos de Empréstimo, Devolução e Perda podem definir.
- **`409` — estado atual.** O pedido seria aceito em outro momento, mas conflita com o
  estado atual dos dados: duplicidade, versão desatualizada, Ferramenta emprestada,
  Membro bloqueado.
