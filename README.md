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

> **`JAVA_HOME` apontando para o JDK 21.** O wrapper usa o `JAVA_HOME` e, se ele não estiver
> definido, o `java` do PATH. Em máquinas com um Java antigo no PATH (ex.: o Java 8 que o
> instalador da Oracle coloca em `C:\Program Files (x86)\Common Files\Oracle\Java`), o build
> falha. Confira com `./mvnw -v` (linha `Java version:`) e, se não for 21, aponte o
> `JAVA_HOME` no mesmo terminal em que vai rodar o wrapper:
>
> ```bash
> export JAVA_HOME="$HOME/.jdks/ms-21.0.12.1"        # Linux/macOS/Git Bash (exemplo de caminho)
> ```
>
> ```powershell
> $env:JAVA_HOME="$HOME\.jdks\ms-21.0.12.1"          # Windows PowerShell (exemplo de caminho)
> ```
>
> `~/.jdks/` é onde o IntelliJ instala os JDKs que baixa. Use o caminho do seu JDK 21.

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

6. Teste as rotas. Na primeira subida o bootstrap cria o primeiro Staff
   (`staff@monitoolring.local` / `change-me-dev-only` em dev; ver
   [Autenticação](#autenticação-e-papéis)). O caminho mais rápido é a coleção Postman
   [`backend/docs/postman/monitoolring.postman_collection.json`](backend/docs/postman/monitoolring.postman_collection.json),
   explicada em [`backend/docs/testing-manual.md`](backend/docs/testing-manual.md):

   ```bash
   npx newman run docs/postman/monitoolring.postman_collection.json
   ```

## Variáveis de ambiente

Todas têm valor padrão no `application.yml`. Os padrões de segredo e senha servem **só para
desenvolvimento**.

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/monitoolring` | JDBC do Postgres. Com o `docker compose` deste repo, use a porta `5433` |
| `DB_USER` / `DB_PASSWORD` | `monitoolring` / `monitoolring` | Credenciais do banco (as mesmas do compose) |
| `JWT_SECRET` | `change-me-in-prod-please-use-a-real-secret-min-32-bytes` | Segredo HMAC (HS256) que assina e valida os tokens. Mínimo de 32 bytes |
| `JWT_EXPIRATION` | `PT8H` | Validade do token emitido no login. Aceita ISO-8601 (`PT8H`, `PT30M`) ou o formato do Spring (`8h`, `30m`) |
| `APP_BOOTSTRAP_STAFF_NOME` | `Staff Inicial (dev)` | Nome do primeiro Staff |
| `APP_BOOTSTRAP_STAFF_EMAIL` | `staff@monitoolring.local` | E-mail do primeiro Staff. Vazio desliga o bootstrap |
| `APP_BOOTSTRAP_STAFF_PASSWORD` | `change-me-dev-only` | Senha do primeiro Staff (mínimo de 8 caracteres) |

Como no `DB_URL` do passo 3, defina a variável no terminal antes do `./mvnw spring-boot:run`.
Não edite o `application.yml`.

## Comandos úteis

| Comando                  | Descrição                            |
|---------------------------|--------------------------------------|
| `./mvnw compile`          | Só compila — verificação mais rápida |
| `./mvnw spring-boot:run`  | Sobe a aplicação em modo dev         |
| `./mvnw test`             | Executa todos os testes (ver nota)   |
| `./mvnw clean package`    | Gera o JAR em `target/`              |
| `docker compose up -d`    | Sobe o Postgres local                |
| `docker compose down`     | Derruba o Postgres local             |

> **O que `./mvnw test` roda:** os testes unitários (`*Test`) e os de integração (`*IT` e
> `ApiApplicationTests`). Os de integração sobem um Postgres próprio via Testcontainers, então
> o Docker precisa estar rodando, mas o `docker compose` não. O Surefire está configurado
> no `pom.xml` para incluir os `*IT`.

> **Testcontainers e Docker 29:** com o Testcontainers 1.21.4 (versão atual do `pom.xml`) não
> é preciso configurar nada. O erro antigo, *"Could not find a valid Docker environment"* com
> o Docker rodando, vinha da versão de API: o Docker Engine 29 exige API ≥ 1.44 e o
> Testcontainers 1.20.1, herdado da N1, negociava uma versão mais antiga. Se aparecer de novo,
> confira a versão do `testcontainers-bom` antes de mexer em `~/.testcontainers.properties`.

## Autenticação e papéis

- **Contas.** `POST /api/auth/register` (público) cria sempre uma conta **MEMBER**: não há
  autocadastro de Staff. Contas **STAFF** são criadas por outro Staff em `POST /api/staff`.
  A exceção é o primeiro Staff, criado pelo bootstrap.
- **Login.** `POST /api/auth/login` (público) devolve
  `{"token", "tipo": "Bearer", "expiraEm", "usuario"}`. Credenciais erradas respondem `401`
  com a mesma mensagem para e-mail inexistente e senha errada. Envie o token como
  `Authorization: Bearer <token>`.
- **Token.** JWT HS256 com `sub` (id do usuário), `role` (`MEMBER` ou `STAFF`), `iat` e `exp`.
  A validade vem de `JWT_EXPIRATION` (padrão 8 h). Um token sem `exp`, sem `role`, com papel
  desconhecido, com assinatura errada ou expirado é recusado com `401`.
- **Logout é stateless.** `POST /api/auth/logout` responde `204`, mas não invalida nada no
  servidor: o token continua válido até `expiraEm`, e quem deve descartá-lo é o cliente. A
  revogação no servidor é pendência da N3
  ([#19](https://github.com/iagokoch/horangotango/issues/19)).
- **Bootstrap do primeiro Staff.** Na subida, se não existir **nenhum** Staff, a aplicação
  cria um com `APP_BOOTSTRAP_STAFF_*` (ver [Variáveis de ambiente](#variáveis-de-ambiente)).
  - É idempotente: com qualquer Staff já cadastrado, não faz nada.
  - Nunca promove uma conta de Membro que já use o mesmo e-mail.
  - Com senha menor que 8 caracteres, só registra um aviso no log e não cria o Staff.
  - Em produção, defina as variáveis e troque a senha depois do primeiro login.

| Rota | Quem acessa |
|---|---|
| `GET /api/health`, `/swagger-ui.html`, `/v3/api-docs/**`, `/actuator/health`, `/actuator/info`, `/error` | Público |
| `POST /api/auth/register`, `POST /api/auth/login` | Público |
| `POST /api/auth/logout` | Qualquer token válido |
| `GET /api/tools`, `GET /api/tools/{id}` | MEMBER e STAFF |
| `POST /api/tools`, `PATCH /api/tools/{id}` | STAFF |
| `POST /api/staff` | STAFF |

Sem token, ou com token inválido, a resposta é `401`. Com token válido de um papel sem
permissão, é `403`. Os dois voltam em JSON no formato `ErrorResponse`.

## Documentação

- `backend/docs/prd.md` — requisitos (FR-x) e regras de negócio
- `backend/docs/api-convencoes-http.md` — verbo HTTP e status code de cada rota
- `backend/docs/api-nomenclatura-recursos.md` — nomes de recursos
- `backend/docs/api-justificativa-tecnica.md` — porquê das decisões
- `backend/docs/testing-manual.md` — como testar a API manualmente (Postman, Insomnia ou curl)
- `backend/docs/postman/monitoolring.postman_collection.json` — coleção Postman (v2.1) com casos de
  sucesso e de erro

Swagger com a aplicação no ar: `http://localhost:8080/swagger-ui.html` (JSON em
`/v3/api-docs`). Para rotas protegidas, faça o login e use o botão **Authorize**.

## Estrutura

```
backend/docs/                # Documentação do projeto (PRD, padrões de API, testes manuais)
└── postman/                 # Coleção Postman

backend/src/main/java/com/monitoolring/api/
├── ApiApplication.java      # Entry point
├── config/                  # Segurança, CORS, OpenAPI, BCrypt e bootstrap do primeiro Staff
├── controller/              # Endpoints REST e tratamento global de exceções
├── dto/                     # Objetos de transferência de dados
├── mapper/                  # Conversão entidade <-> DTO
├── service/                 # Regras de negócio
├── repository/              # Acesso a dados
├── domain/                  # Entidades/modelo de domínio
├── security/                # Emissão/validação de JWT, filtro e respostas 401/403
└── exception/               # Exceções customizadas

backend/src/main/resources/
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
- Documentação em `backend/docs/`: PRD e os padrões de API (`api-*.md`), além do guia do Insomnia.

### O que a N2 acrescenta

Legenda: ✅ na `main` · 🚧 em andamento (fora da `main`) · 📋 planejado

| Item | Status |
|---|---|
| Reorganização em monorepo (`backend/` + `frontend/`) | ✅ |
| `/api/health` e `/error` liberados sem token no `SecurityConfig` (na N1 caíam no `denyAll`) | ✅ |
| Instruções de setup corrigidas (Postgres na 5433 via `DB_URL`, `JAVA_HOME`, variáveis de ambiente) | ✅ |
| FR-1/FR-2 ([#1](https://github.com/iagokoch/horangotango/issues/1)): autocadastro de Membro, login (JWT com `role` e `exp`), logout stateless, cadastro de Staff por Staff, papéis MEMBER/STAFF e bootstrap do primeiro Staff | ✅ |
| FR-3/4/5 ([#2](https://github.com/iagokoch/horangotango/issues/2)): Ferramenta do PRD (categoria, valor estimado, estado de conservação, status com 5 valores); `POST` → `201`; `PATCH` parcial com `versao`, inativação e reativação; `PUT` e `DELETE` removidos (`405`); código duplicado → `409`; filtro `?status=` | ✅ |
| `./mvnw test` executa os `*IT`; Testcontainers 1.21.4 compatível com Docker 29 ([#7](https://github.com/iagokoch/horangotango/issues/7)) | ✅ |
| CORS: preflight (`OPTIONS`) liberado no Spring Security ([#8](https://github.com/iagokoch/horangotango/issues/8)) | ✅ |
| JSON malformado, método não suportado e rota inexistente respondem no formato `ErrorResponse` | ✅ |
| Token sem `exp` recusado com `401` ([#9](https://github.com/iagokoch/horangotango/issues/9)) | ✅ |
| Erro inesperado responde `500` no formato `ErrorResponse`, com mensagem genérica e sem detalhe interno; exceções padrão do Spring MVC (ex.: `415`) mantêm o status, com corpo `ErrorResponse` ([#9](https://github.com/iagokoch/horangotango/issues/9)) | ✅ |
| CORS sem `DELETE` nos métodos permitidos (a API não tem mais `DELETE`) | ✅ |
| Coleção Postman e Swagger com respostas de erro documentadas ([#11](https://github.com/iagokoch/horangotango/issues/11)) | 🚧 |
| FR-8 ([#3](https://github.com/iagokoch/horangotango/issues/3)): prazo padrão de devolução | 🚧 |
| FR-9/10/11 ([#4](https://github.com/iagokoch/horangotango/issues/4)): Retirada com Checklist de Conservação e Prazo de Devolução | 🚧 |
| FR-12/17/18 ([#5](https://github.com/iagokoch/horangotango/issues/5)): Bloqueio por Inadimplência, marcação de Atraso e liberação do Bloqueio | 📋 |
| FR-13/14/16 ([#6](https://github.com/iagokoch/horangotango/issues/6)): Devolução com Checklist e consulta comparativa | 📋 |

Escopo da N2: 15 dos 19 FRs do PRD (~79%): FR-1 a FR-5, FR-8 a FR-14 e FR-16 a FR-18.
As rotas citadas seguem [`backend/docs/api-convencoes-http.md`](backend/docs/api-convencoes-http.md), todas
sob o prefixo `/api`. Esta tabela é atualizada a cada rodada.

## Pendências para a N3

O que **não** entra na N2, para a próxima equipe saber onde continuar. Nomes de rota de
[`backend/docs/api-convencoes-http.md`](backend/docs/api-convencoes-http.md) e
[`backend/docs/api-nomenclatura-recursos.md`](backend/docs/api-nomenclatura-recursos.md), sob `/api`.

- **FR-6 — histórico de Membro (Staff)** ([#13](https://github.com/iagokoch/horangotango/issues/13)): falta a consulta de Staff aos Empréstimos de
  qualquer Membro, com Atrasos, Perdas e divergências. Começa em `GET /loans?memberId={id}`
  (nomenclatura §3), sobre o resource `loans` que a N2 cria.
- **FR-7 — próprios Empréstimos (Membro)** ([#14](https://github.com/iagokoch/horangotango/issues/14)): falta `GET /members/{id}/loans` e
  `GET /members/{id}` com o campo derivado `bloqueado` (nomenclatura §4), devolvendo `403`
  quando um Membro consulta outro.
- **FR-15 — divergência de Checklist** ([#15](https://github.com/iagokoch/horangotango/issues/15)): falta a flag de divergência com justificativa
  obrigatória em `POST /loans/{id}/return`, que manda a Ferramenta para "em reparo/inspeção".
  O FR-16 da N2 cobre só a Devolução sem divergência (Ferramenta volta a "disponível").
- **FR-19 — Perda/furto** ([#16](https://github.com/iagokoch/horangotango/issues/16)): falta `POST /loans/{id}/loss`: encerra o Empréstimo como "Perda
  registrada", muda a Ferramenta para "perdida" e precisa liberar o Bloqueio (FR-18), que
  na N2 considera só Devoluções.
- **Treinamento Prévio** ([#17](https://github.com/iagokoch/horangotango/issues/17)): o PRD (§3, §7.2 e §11) o rotula como evolução **"N2"**, mas foi
  **adiado para a N3 por decisão de escopo** da equipe da N2. Começa estendendo o cadastro
  de `tools` (marcar quais exigem treinamento), registrando treinamentos por Membro e
  acrescentando a verificação à regra do FR-12 em `POST /loans`. O desenho de resource
  ainda não foi decidido.
- **Multas automatizadas** ([#18](https://github.com/iagokoch/horangotango/issues/18)): PRD §11 (N3). Depende do Atraso (FR-17). A justificativa
  técnica (§5) cita `GET /loans/{id}/fine` só como exemplo do padrão.
- **Revogação do token no logout** ([#19](https://github.com/iagokoch/horangotango/issues/19)): o logout da N2 é stateless e não
  invalida o JWT no servidor; um token copiado continua válido até `expiraEm` (padrão 8 h).
  Falta uma denylist ou tokens de vida curta com refresh.
- **NFRs de performance (PRD §5)** ([#20](https://github.com/iagokoch/horangotango/issues/20)): nada mede as metas de 1s para a consulta de
  disponibilidade (FR-5) nem de 2s para Retirada/Devolução (FR-11, FR-13). Falta um teste
  de carga com catálogo na casa das centenas.
- **LGPD (PRD §5)** ([#21](https://github.com/iagokoch/horangotango/issues/21)): falta revisar a minimização dos dados de Membro, a retenção e a base
  legal. A restrição de um Membro ver dados de outro depende do FR-7, acima.
- **Erros lançados em filtros (pendência menor):** o formato `ErrorResponse` vale para o que
  passa pelo Spring MVC (`GlobalExceptionHandler`) e para o `401`/`403` do Spring Security,
  que têm handlers próprios. Uma exceção lançada em outro filtro do servlet, antes do MVC,
  ainda sai pelo `/error` no formato padrão do Spring Boot (`timestamp`, `status`, `error`,
  `path`). Para cobrir isso, é preciso customizar o `/error` (ex.: um `ErrorController` ou
  `ErrorAttributes` próprio).
- **Rota inexistente pode responder `403` ou `401` em vez de `404`**
  ([#22](https://github.com/iagokoch/horangotango/issues/22)): o `SecurityConfig` decide antes de o Spring saber se a rota existe.
  Medido com a aplicação rodando:
  - sob `/api/**`, com token válido e papel permitido, rota inexistente responde `404`
    (ex.: `GET /api/naoexiste`, `GET /api/tools/a/b`);
  - fora de `/api`, cai no `anyRequest().denyAll()`: `403` com token válido e `401` sem token
    (ex.: `GET /naoexiste`);
  - sob um prefixo restrito por papel, o papel errado recebe `403` mesmo que a rota não
    exista (ex.: Membro em `GET /api/staff/x` ou `POST /api/tools/a/b`). Membro em
    `DELETE /api/tools/{id}` também recebe `403`, e não o `405` que o Staff recebe;
  - sem token, toda rota protegida (existente ou não) responde `401`.

  O caso geral do issue (rota inexistente sob `/api` com token válido) já responde `404`. O
  que sobra é o comportamento fora de `/api` e nos prefixos restritos por papel, que é a
  precedência normal do Spring Security (autorização antes do roteamento). Corrigir, se a
  equipe quiser, exige mudar o `SecurityConfig`.
