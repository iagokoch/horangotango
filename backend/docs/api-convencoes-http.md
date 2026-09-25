# Padrão de Operações HTTP nos Endpoints

Este documento define como os métodos HTTP (`GET`, `POST`, `PUT`, `PATCH`,
`DELETE`) devem ser usados sobre os resources definidos em
[`api-nomenclatura-recursos.md`](./api-nomenclatura-recursos.md).

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
| `POST` | `/auth/logout` | Encerra a sessão atual | Membro/Staff | `204` |
| `POST` | `/staff` | Staff cadastra outro Staff (FR-2) | Staff | `201` |
| `GET` | `/tools` | Lista catálogo com disponibilidade em tempo real (FR-5) | Membro/Staff | `200` |
| `POST` | `/tools` | Cadastra nova Ferramenta (FR-3) | Staff | `201` |
| `GET` | `/tools/{id}` | Detalha uma Ferramenta | Membro/Staff | `200` |
| `PATCH` | `/tools/{id}` | Edita dados ou inativa (FR-4) | Staff | `200` |
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
| `400 Bad Request` | Corpo da requisição malformado ou faltando campo obrigatório |
| `401 Unauthorized` | Requisição sem sessão autenticada em rota que exige autenticação |
| `403 Forbidden` | Sessão autenticada, mas sem permissão para o recurso (ex.: Membro tentando acessar histórico de outro Membro, ou rota exclusiva de Staff) |
| `404 Not Found` | Resource referenciado não existe |
| `409 Conflict` | Violação de regra de estado/concorrência — ex.: tentativa de Retirada com Membro bloqueado por inadimplência (FR-12), ou duas Retiradas simultâneas da mesma Ferramenta (RNF de consistência) |
| `422 Unprocessable Entity` | Corpo bem formado, mas com valor inválido para a regra de negócio (ex.: Checklist com campo obrigatório vazio, FR-10) |
