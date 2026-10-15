# Monitoolring — Backend

Backend do projeto Monitoolring: Java 21, Spring Boot 3, Maven.

Este é o backend de um monorepo (`backend/` + `frontend/`), no repositório
[iagokoch/horangotango](https://github.com/iagokoch/horangotango). Branch única: `main`.

É a entrega da **N2**, construída sobre o backend da N1. O que foi herdado, o que a N2
acrescenta e o que fica para a N3 está em [O que mudou desde a N1](#o-que-mudou-desde-a-n1)
e [Pendências para a N3](#pendências-para-a-n3).

## Stack

- Java 21
- [Spring Boot 3](https://spring.io/projects/spring-boot) (Web, Validation, Security/JWT, Actuator, springdoc)
- PostgreSQL + JPA/Hibernate, migrations com Liquibase
- Maven (com Maven Wrapper)

## Pré-requisitos

- JDK 21+
- **Docker** — a API não sobe sem um Postgres acessível (o Liquibase roda as migrations no
  start), e os testes de integração usam Testcontainers
- Não é necessário ter o Maven instalado — o projeto usa o Maven Wrapper (`mvnw` / `mvnw.cmd`)

## Como iniciar

1. Clone o repositório e entre na pasta do backend:

   ```bash
   git clone https://github.com/iagokoch/horangotango.git
   cd horangotango/backend
   ```

2. Suba o Postgres:

   ```bash
   docker compose up -d
   ```

   O compose publica o Postgres na porta **5433** do host (a 5432 costuma estar ocupada
   por uma instalação local).

3. Aponte a aplicação para essa porta. O `application.yml` usa
   `${DB_URL:jdbc:postgresql://localhost:5432/monitoolring}`, ou seja, a variável de
   ambiente vence o valor padrão:

   ```bash
   export DB_URL="jdbc:postgresql://localhost:5433/monitoolring"   # Linux/macOS
   ```

   ```powershell
   $env:DB_URL="jdbc:postgresql://localhost:5433/monitoolring"     # Windows PowerShell
   ```

   A variável vale só para aquela janela de terminal. Diferença de porta entre máquinas se
   resolve assim — não editando o `application.yml`, que é versionado.

4. Suba a aplicação, no mesmo terminal:

   ```bash
   ./mvnw spring-boot:run
   ```

   No Windows (PowerShell), `./mvnw` também funciona, de dentro de `backend/`.

5. Verifique se a API está no ar:

   ```
   GET http://localhost:8080/api/health
   ```

   Esperado: `200` com `{"status":"UP","service":"monitoolring-api","timestamp":"..."}`.

   > No PowerShell, `curl` é apelido de `Invoke-WebRequest` e lança erro em respostas 4xx.
   > Para testar rotas manualmente use `curl.exe`.

## Comandos úteis

| Comando                  | Descrição                            |
|---------------------------|--------------------------------------|
| `./mvnw compile`          | Só compila — verificação mais rápida |
| `./mvnw spring-boot:run`  | Sobe a aplicação em modo dev         |
| `./mvnw test`             | Executa os testes (ver nota abaixo)  |
| `./mvnw clean package`    | Gera o JAR em `target/`              |
| `docker compose up -d`    | Sobe o Postgres local                |

> **O que `./mvnw test` roda hoje:** os testes unitários (`*Test`) e o `ApiApplicationTests`,
> que sobe um Postgres via Testcontainers (por isso precisa de Docker). Os testes de
> integração `*IT` (ex.: `ToolControllerIT`) **não** são executados por esse comando, porque
> o pom não configura o Surefire/Failsafe para eles. A correção está em andamento.

> **Testcontainers no Windows:** se `./mvnw test` falhar com *"Could not find a valid Docker
> environment"* mesmo com o Docker Desktop rodando, crie `~/.testcontainers.properties` com
> `docker.host=npipe:////./pipe/dockerDesktopLinuxEngine`.

## Autenticação

Ainda não existe endpoint de login. A API apenas **valida** tokens JWT já emitidos
(assinatura HMAC e, se o token tiver a claim `exp`, a expiração — hoje um token sem `exp`
é aceito), extraindo o usuário da claim `sub`. Não há papéis: qualquer token válido acessa
todas as rotas de `/api/tools`. Rotas públicas: `/api/health`,
`/error`, `/actuator/**` e a documentação (`/swagger-ui/**`, `/v3/api-docs/**`). Todo o
resto exige `Authorization: Bearer <token>`.

Para gerar um token de teste, veja [`docs/testing-insomnia.md`](docs/testing-insomnia.md).

## Documentação

- `docs/prd.md` — requisitos (FR-x) e regras de negócio
- `docs/api-convencoes-http.md` — verbo HTTP e status code de cada rota
- `docs/api-nomenclatura-recursos.md` — nomes de recursos
- `docs/api-justificativa-tecnica.md` — porquê das decisões
- `docs/testing-insomnia.md` — como testar a API manualmente

Swagger com a aplicação no ar: `http://localhost:8080/swagger-ui.html`

## Estrutura

```
docs/                        # Documentação do projeto (PRD, padrões de API)

src/main/java/com/monitoolring/api/
├── ApiApplication.java      # Entry point
├── config/                  # Configurações (SecurityConfig, CorsConfig, OpenApiConfig)
├── controller/              # Endpoints REST e tratamento global de exceções
├── dto/                     # Objetos de transferência de dados
├── mapper/                  # Conversão entidade <-> DTO
├── service/                 # Regras de negócio
├── repository/              # Acesso a dados
├── domain/                  # Entidades/modelo de domínio
├── security/                # Filtro e serviços de JWT
└── exception/               # Exceções customizadas

src/main/resources/
├── application.yml
└── db/changelog/            # Migrations Liquibase
```

## O que mudou desde a N1

A N1 está em [iagokoch/monitoolring--backend](https://github.com/iagokoch/monitoolring--backend)
(fork de `horangotango/monitoolring--backend`). A N2 importou a branch **`master`** da N1
(PRs #2 "Feature/api ferramentas" e #3 "Feature/delete", merge em 2026-09-17) no commit
`db5f4b1` deste repositório. Essa é a base de comparação abaixo.

> **Ressalva sobre o README da N1.** O README da N1, inclusive na `master`, descreve a branch
> `inicializacao-projeto`: só Web/Validation/Actuator, sem banco, e um pacote `enums/` que
> nunca existiu no código. Ele não foi atualizado quando os PRs #2 e #3 entraram. Por isso,
> lendo só o README da N1, parece que JWT, Spring Security, Liquibase, JPA/PostgreSQL e
> Swagger são novidades da N2. **Não são — vieram da `master` da N1.**

### Herdado da N1 (`master`)

- Spring Boot 3.3 com Web, Validation e Actuator; `GET /api/health`; CORS para
  `http://localhost:3000`.
- Spring Security stateless com **validação** de JWT HS256 (jjwt): o filtro lê
  `Authorization: Bearer`, valida a assinatura e usa a claim `sub` como usuário. Não há
  emissão de token, login nem papéis.
- JPA/Hibernate + PostgreSQL; Liquibase com um único changeset, que cria a tabela
  `ferramentas` (`codigo`, `nome`, `quantidade`, campos de auditoria e `versao`).
- CRUD de ferramentas em `/api/tools`: `POST` (responde `200`), `PUT /{id}` com optimistic
  lock pelo campo `versao` (`409` se desatualizado), `GET` lista e `GET /{id}`,
  `DELETE /{id}` **físico** (`204`). Código duplicado responde `400`.
- springdoc/Swagger UI, MapStruct (`mapper/`) e `GlobalExceptionHandler` com `ErrorResponse`.
- Testes unitários (`ToolServiceTest`, `JwtServiceTest`), base de integração com
  Testcontainers (`AbstractIntegrationTest`, `ToolControllerIT`) e `docker-compose.yml` com
  Postgres na porta 5433.
- Documentação em `docs/`: PRD e os padrões de API (`api-*.md`), além do guia do Insomnia.

### O que a N2 acrescenta

Legenda: ✅ na `main` · 🚧 em andamento (fora da `main`) · 📋 planejado

| Item | Status |
|---|---|
| Reorganização em monorepo (`backend/` + `frontend/`) | ✅ |
| `/api/health` e `/error` liberados sem token no `SecurityConfig` (na N1 caíam no `denyAll`) | ✅ |
| Instruções de setup corrigidas (Postgres na 5433 via `DB_URL`, guia do Insomnia) | ✅ |
| FR-1/FR-2: cadastro de Membro, login, logout, cadastro de Staff por Staff, papéis MEMBER/STAFF e criação do primeiro Staff no setup | 🚧 |
| FR-3/4/5: modelo de Ferramenta do PRD (categoria, valor estimado, estado de conservação, status com 5 estados); `POST` → `201`; `PUT` substituído por `PATCH` com inativação; fim do `DELETE` físico; código duplicado → `409` | 🚧 |
| `./mvnw test` passar a executar os `*IT`; compatibilidade Testcontainers × Docker 29 | 🚧 |
| CORS: corrigir o preflight (`OPTIONS`) | 🚧 |
| FR-8: prazo padrão de devolução (`/settings/return-deadline`) | 📋 |
| FR-9/10/11: Retirada com Checklist de Conservação e Prazo de Devolução (`POST /loans`) | 📋 |
| FR-12/17/18: Bloqueio por Inadimplência, marcação de Atraso e liberação do Bloqueio | 📋 |
| FR-13/14/16: Devolução com Checklist e consulta comparativa (`POST /loans/{id}/return`, `GET /loans/{id}/checklists`) | 📋 |
| Token sem `exp` passar a ser recusado | 📋 planejado na N2, rodada 2 |
| Mesmo formato de erro (`ErrorResponse`) para JSON malformado e erro `500` | 📋 planejado na N2, rodada 2 |

Escopo da N2: 15 dos 19 FRs do PRD (~79%): FR-1 a FR-5, FR-8 a FR-14 e FR-16 a FR-18.
As rotas citadas seguem [`docs/api-convencoes-http.md`](docs/api-convencoes-http.md), todas
sob o prefixo `/api`. Esta tabela é atualizada a cada rodada.

## Pendências para a N3

O que **não** entra na N2, para a próxima equipe saber onde continuar. Nomes de rota de
[`docs/api-convencoes-http.md`](docs/api-convencoes-http.md) e
[`docs/api-nomenclatura-recursos.md`](docs/api-nomenclatura-recursos.md), sob `/api`.

- **FR-6 — histórico de Membro (Staff):** falta a consulta de Staff aos Empréstimos de
  qualquer Membro, com Atrasos, Perdas e divergências. Começa em `GET /loans?memberId={id}`
  (nomenclatura §3), sobre o resource `loans` que a N2 cria.
- **FR-7 — próprios Empréstimos (Membro):** falta `GET /members/{id}/loans` e
  `GET /members/{id}` com o campo derivado `bloqueado` (nomenclatura §4), devolvendo `403`
  quando um Membro consulta outro.
- **FR-15 — divergência de Checklist:** falta a flag de divergência com justificativa
  obrigatória em `POST /loans/{id}/return`, que manda a Ferramenta para "em reparo/inspeção".
  O FR-16 da N2 cobre só a Devolução sem divergência (Ferramenta volta a "disponível").
- **FR-19 — Perda/furto:** falta `POST /loans/{id}/loss`: encerra o Empréstimo como "Perda
  registrada", muda a Ferramenta para "perdida" e precisa liberar o Bloqueio (FR-18), que
  na N2 considera só Devoluções.
- **Treinamento Prévio:** o PRD (§3, §7.2 e §11) o rotula como evolução **"N2"**, mas foi
  **adiado para a N3 por decisão de escopo** da equipe da N2. Começa estendendo o cadastro
  de `tools` (marcar quais exigem treinamento), registrando treinamentos por Membro e
  acrescentando a verificação à regra do FR-12 em `POST /loans`. O desenho de resource
  ainda não foi decidido.
- **Multas automatizadas:** PRD §11 (N3). Depende do Atraso (FR-17). A justificativa
  técnica (§5) cita `GET /loans/{id}/fine` só como exemplo do padrão.
- **Revogação do token no logout:** o logout planejado na N2 (FR-1) não invalida o JWT no
  servidor; um token copiado continua válido até expirar. Falta uma denylist ou tokens de vida curta com
  refresh.
- **NFRs de performance (PRD §5):** nada mede as metas de 1s para a consulta de
  disponibilidade (FR-5) nem de 2s para Retirada/Devolução (FR-11, FR-13). Falta um teste
  de carga com catálogo na casa das centenas.
- **LGPD (PRD §5):** falta revisar a minimização dos dados de Membro, a retenção e a base
  legal. A restrição de um Membro ver dados de outro depende do FR-7, acima.
- **Endurecimentos menores:** recusar token sem `exp` e padronizar o erro de JSON
  malformado/`500` estão planejados na N2, rodada 2. Se não entrarem, ficam para a N3.
