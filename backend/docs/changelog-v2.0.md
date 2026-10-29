# Monitoolring — changelog da v2.0 do backend

Este documento reúne as mudanças do backend na entrega N2 (versão **v2.0**) da equipe checkflow e as
pendências para a N3. A base de comparação é a branch `master` da N1, importada no
monorepo, que já continha validação de JWT, JPA/PostgreSQL, Liquibase, MapStruct,
Swagger e o CRUD inicial de ferramentas.

## Estado da v2.0

Estado conferido em **29/10/2026**, sobre a `main` em `8a8dd23` (merge do
[PR #35](https://github.com/iagokoch/horangotango/pull/35), de 28/10/2026):

- Os **15 FRs do escopo N2** estão implementados no backend.
- Backend e requisitos integrados por Pull Request: [#23](https://github.com/iagokoch/horangotango/pull/23)
  (requisitos), [#24](https://github.com/iagokoch/horangotango/pull/24),
  [#25](https://github.com/iagokoch/horangotango/pull/25),
  [#30](https://github.com/iagokoch/horangotango/pull/30),
  [#31](https://github.com/iagokoch/horangotango/pull/31) e
  [#32](https://github.com/iagokoch/horangotango/pull/32) em 26/10/2026;
  [#33](https://github.com/iagokoch/horangotango/pull/33) (decimais em `dias` e `versao`) e
  [#34](https://github.com/iagokoch/horangotango/pull/34) (documentação) em 27/10/2026.
- O [PR #35](https://github.com/iagokoch/horangotango/pull/35) reconstruiu o
  [frontend](../../frontend/README.md) integrado a esta API, sem alterar o código do backend.
- A validação final de 29/10/2026 (seção [Validação da v2.0](#validação-da-v20)) passou no backend
  com **264 testes em 28 classes**, zero falhas, erros ou ignorados, e no frontend com 44 testes
  Vitest; `clean package` e `npm run validate` também passaram.

As evidências abaixo identificam o commit em que foram obtidas. A tag e a release **v2.0**
congelam este estado, depois do merge da documentação de entrega.

## Funcionalidades implementadas na main

| Requisitos | Entrega do backend |
|---|---|
| FR-1 / FR-2 | Cadastro de Membro, login e emissão de JWT com papel/expiração; criação de Staff por Staff; bootstrap da primeira conta Staff |
| FR-3 / FR-4 / FR-5 | Ferramenta individual com categoria, valor estimado, estado de conservação e cinco status; cadastro, edição parcial, inativação/reativação e catálogo filtrável |
| FR-8 | Prazo padrão configurável por Staff, de 1 a 365 dias; prazo copiado para cada empréstimo, calculado em UTC como N × 24 horas |
| FR-9 / FR-10 / FR-11 | Retirada confirmada por Staff, checklist obrigatório e imutável, cálculo de prazo e ferramenta marcada como `ON_LOAN` na mesma transação |
| FR-12 / FR-17 / FR-18 | Atraso derivado em tempo real com `Clock`; bloqueio de nova retirada com `409` antes do checklist; liberação quando não restam empréstimos em atraso |
| FR-13 / FR-14 / FR-16 | Devolução por Staff com checklist `RETURN`, auditoria de horário/Staff, consulta comparativa dos checklists e liberação da ferramenta como `AVAILABLE` |

São **15 de 19 FRs** do PRD, aproximadamente 79%. Os quatro FRs restantes estão
identificados na seção de continuidade para a N3.

### Autenticação e autorização

- `POST /api/auth/register` cria sempre um `MEMBER`; `POST /api/staff` exige `STAFF`.
- Login devolve `token`, `tipo`, `expiraEm` e `usuario`. Respostas não expõem senha/hash.
- JWT sem expiração é recusado. Login inválido não distingue e-mail inexistente de senha incorreta.
- Logout responde `204`; o cliente descarta o token, que permanece válido até expirar.
  Revogação no servidor permanece na N3.
- Membro consulta somente seus próprios empréstimos e checklists; Staff consulta qualquer um.
- CORS está integrado ao Spring Security, incluindo o preflight dos métodos utilizados.
- Cadastro e bootstrap limitam senhas a 72 bytes UTF-8, e o encoder recusa entradas
  acima desse limite antes do BCrypt. O PR #30 mitiga a equivalência por truncamento
  nos fluxos da aplicação; a dependência `spring-security-crypto` permanece em 6.3.1.
  O upgrade e a redefinição controlada de senhas legadas acima de 72 bytes continuam
  pendentes de decisão específica; não há fluxo novo de recuperação de senha.

### Ferramentas e compatibilidade com a N1

| Antes, na N1 | Na N2 |
|---|---|
| `POST /api/tools` respondia `200` | Responde `201`, com status inicial `AVAILABLE` |
| Edição por `PUT` | Edição parcial por `PATCH`, com `versao` obrigatória |
| Exclusão física por `DELETE` | Inativação por `PATCH`; métodos removidos recebem `405` após autorização |
| Campo `quantidade` | Cada cadastro representa uma ferramenta individual |
| Código repetido respondia `400` | Duplicidade responde `409` |

O modelo de Ferramenta passa a exigir `categoria`, `valorEstimado` e
`estadoConservacao`. A migração preserva ferramentas antigas com os valores
sentinela `NAO_INFORMADA`, `0.01`, `Não informado (migração)` e status `AVAILABLE`;
esses dados podem ser revisados pelo Staff.

O PR #31 trata também a disputa concorrente pelo mesmo código: POSTs resultam em
`201`/`409` e PATCHs em `200`/`409`, sem duplicação ou alteração parcial da linha
recusada. A tradução para conflito é específica da constraint de código único.

### Empréstimos, atraso e devolução

- Retirada exige tomador Membro, ferramenta disponível e checklist completo.
  Ausência de avarias/acessórios deve ser explícita, como `"Sem avarias"` e `["Nenhum"]`.
- Um empréstimo está em atraso quando permanece `ACTIVE` e o instante do `Clock`
  ultrapassa estritamente o `prazoDevolucao`. O atraso não é coluna nem job.
- A recusa por atraso identifica todos os empréstimos pendentes, ferramentas e prazos
  vencidos em `message` e `details`. Devolver apenas um de vários atrasos mantém o bloqueio.
- A devolução recebe `{ "checklist": { ... } }`, registra `dataHoraDevolucao` e
  `staffDevolucaoId` e encerra o empréstimo como `RETURNED`.
- `GET /api/loans/{id}/checklists` retorna `emprestimoId`, `checklistRetirada` e
  `checklistDevolucao`, nulo antes da devolução. Ambos permanecem consultáveis após
  a ferramenta participar de um novo empréstimo.
- Lock pessimista e índice único parcial protegem a retirada da mesma ferramenta.
  Devoluções concorrentes do mesmo empréstimo resultam em um sucesso e um conflito.
- Os GETs de detalhes e checklists usam o mesmo snapshot durante uma devolução
  concorrente (PR #32). Uma consulta em andamento pode retornar o estado anterior
  completo; uma nova consulta após o commit retorna o estado devolvido completo.

### Fronteira de erros

| Código | Exemplos |
|---|---|
| `400` | JSON malformado, enum inválido, campo fora dos limites ou falha de Bean Validation |
| `401` | Token ausente/inválido ou login inválido |
| `403` | Papel sem permissão ou consulta de empréstimo de outro Membro |
| `404` | Recurso inexistente; GET do prazo antes da primeira configuração |
| `409` | Duplicidade, versão divergente, ferramenta indisponível, bloqueio por atraso, prazo não configurado na retirada ou empréstimo já encerrado |
| `422` | Checklist incompleto, tomador Staff ou status não atribuível manualmente |
| `500` | Erro inesperado com mensagem genérica e detalhe interno no log |

Os erros tratados no MVC e nos handlers de segurança usam
`ErrorResponse {timestamp, status, error, message, details}`. Erros de outros filtros
do servlet ainda podem utilizar o formato padrão do Spring Boot.

### Banco e testes

- Liquibase mantém o master SQL único, com os changesets 1 a 7 e rollback.
- Novos changesets da N2: usuários; modelo de Ferramenta; configuração de prazo;
  empréstimos; checklists/acessórios; auditoria de devolução.
- JPA valida o schema, sem substituir as migrations por geração automática.
- `./mvnw test` inclui os testes `*IT`. Testcontainers 1.21.4 utiliza PostgreSQL
  para verificar persistência, concorrência, aplicação e rollback das migrations.
- Os ITs usuais compartilham o container singleton e usam dados únicos.
  `ChangelogMigrationIT` utiliza banco isolado para aplicação e rollback.

## Revisão da retirada e contratos (PR #24)

As mudanças do [PR #24](https://github.com/iagokoch/horangotango/pull/24), integradas em
26/10/2026 (já presentes na `main@9e352b4`):

1. Revalidar o bloqueio depois de obter o lock da ferramenta. Um vencimento durante
   a espera passa a impedir a retirada com `409`.
2. Ler novamente os dias vigentes diretamente no banco após a espera, evitando usar
   configuração antiga do contexto de persistência. A alteração de 7 para 30 dias
   durante a espera passa a valer para a nova retirada.
3. Acrescentar dois testes com relógio controlável e lock real para esses cenários.
4. Declarar os schemas de sucesso/erro de Settings e Loans no Swagger e ampliar a
   coleção Postman para essas rotas, com documentação e status dos FRs atualizados.

## Correção de inteiros JSON (PR #33)

O [PR #33](https://github.com/iagokoch/horangotango/pull/33) atende à
[issue #29](https://github.com/iagokoch/horangotango/issues/29): desabilita
`ACCEPT_FLOAT_AS_INT` no Jackson da aplicação. Entradas como `dias: 1.9` e
`versao: 0.9`, assim como tokens `1.0` ou `1e0` nos campos inteiros, passam a
receber `400` com `ErrorResponse`, preservando os dados, a versão e a auditoria.
Inteiros válidos, limites de dias de 1 a 365, conflito de versão inteira com `409`
e valores monetários decimais continuam aceitos conforme seus contratos.

O PR foi integrado em 27/10/2026 (merge `80652d5`); o comportamento foi validado no commit
`86c882a` e faz parte da `main` a partir daí.

## Evidências já obtidas

| Código validado | Verificação | Resultado registrado |
|---|---|---|
| Backend antes do PR, base `149ec3d` | `./mvnw test`, com JDK 21 e Docker | 181 testes, sem falhas ou erros |
| Código do PR #24, consolidado em `0f49860` | `./mvnw test`, com JDK 21 e Docker | 183 testes, sem falhas ou erros |
| Código do PR #24 | Newman 6.2.3 em aplicação/banco temporários | Duas execuções de 71 requisições; 129 e 128 asserções aprovadas |
| Código do PR #24 | OpenAPI da aplicação em execução | 6 operações de Settings/Loans e 24 schemas de erro conferidos |
| Main integrada `9e352b4` | `./mvnw -o test`, com JDK 21 e Docker | 239 testes em 27 classes; zero falhas/erros/ignorados |
| PR #33, commit `86c882a` (integrado em 27/10/2026) | `./mvnw -o -Dtest=IntegerJsonValidationIT,ReturnDeadlineControllerIT,ToolControllerIT test` | 64 testes; zero falhas/erros/ignorados |
| PR #33, commit `86c882a` (integrado em 27/10/2026) | `./mvnw -o test`, com JDK 21 e Docker | 264 testes em 28 classes; zero falhas/erros/ignorados |

Esses resultados são registros das verificações executadas durante o desenvolvimento.
Os totais pertencem aos commits identificados e não devem ser somados. As execuções
de 239 e 264 testes foram locais, em exportações limpas no TEMP, com dependências
em cache; não representam checks de CI. Os registros acima são históricos e não foram reexecutados.
A validação do commit entregue está em [Validação da v2.0](#validação-da-v20).

## Validação da v2.0

Código validado: `main@8a8dd23`. Os commits seguintes, na branch `docs/entrega-n2`, alteram apenas
documentação e não tocam em `backend/src` nem em `frontend/src`.

| Verificação | Ambiente | Resultado |
|---|---|---|
| `./mvnw -B test` em `backend/` | JDK 21 (`eclipse-temurin:21-jdk`) num contêiner, com Docker Engine do WSL2 e Testcontainers 1.21.4 sobre PostgreSQL | **264 testes em 28 classes**; falhas 0, erros 0, ignorados 0; `BUILD SUCCESS` |
| `./mvnw -B clean package` em `backend/` | Mesmo ambiente | `BUILD SUCCESS`; JAR `api-0.0.1-SNAPSHOT.jar` gerado, com os mesmos 264 testes aprovados |
| `npm ci && npm run validate` em `frontend/` | Node.js 20.20.2, Windows | `tsc --noEmit` sem erros; ESLint sem avisos; Vitest **44/44** em 3 arquivos; `next build` concluído |

Observações: o total de 264 coincide com o do PR #33 (`86c882a`); os PRs seguintes só alteraram
documentação e frontend. A execução foi local, em uma cópia do diretório `backend/` sem `target/`;
não é um check de CI. Os `ERROR ... uq_ferramentas_codigo` no log do Maven vêm de
`ToolCodigoConcurrencyIT`, que provoca a violação de propósito. Newman e o roteiro E2E do frontend
(`npm run test:e2e`) não foram reexecutados nesta validação; seus resultados são os registrados em
[Evidências já obtidas](#evidências-já-obtidas) e em `frontend/docs/EVOLUCAO_FRONTEND.md` §9.3.

## Continuidade para a N3

| Item | Situação de continuidade |
|---|---|
| FR-6 | Consulta de histórico de qualquer Membro por Staff |
| FR-7 | Histórico dos próprios empréstimos e representação do Membro com bloqueio derivado |
| FR-15 | Sinalização de divergência com justificativa e destino `UNDER_REPAIR` |
| FR-19 | Registro de perda/furto e encerramento sem devolução física |
| Treinamento prévio | Cadastro/verificação de treinamentos; adiado para N3 por decisão de escopo |
| Multas | Cálculo automatizado por atraso |
| Logout | Revogação de tokens no servidor |
| Performance | Medição das metas e testes de carga |
| LGPD | Revisão de minimização de dados, retenção e base legal |
| Erros de filtros | Padronização do retorno fora do MVC em `ErrorResponse` |
| Rotas inexistentes | Avaliação da política fora de `/api` e em prefixos restritos por papel; sob `/api`, com token e papel permitidos, já há `404` |

O enum `LOST` já existe, mas não representa implementação do fluxo de perda.
A devolução da N2 libera a ferramenta como `AVAILABLE`; sinalização de divergência
e decisão de encaminhamento para reparo pertencem à N3.

## Referências

- [PRD](prd.md) e [convenções HTTP](api-convencoes-http.md).
- [Nomenclatura da API](api-nomenclatura-recursos.md).
- [Guia de testes manuais](testing-manual.md).
- [Roteiro de demonstração do backend](roteiro-demonstracao-n2.md).
- [Visão geral do projeto](../../README.md), [DER](../../docs/DER/README.md),
  [débitos técnicos](../../docs/debitos-tecnicos/README.md) e [handoff](../../docs/handoff/README.md).
