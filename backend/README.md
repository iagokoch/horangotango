# Monitoolring — Backend

Backend do projeto Monitoolring: Java 21, Spring Boot 3, Maven.

Este é o backend de um monorepo (`backend/` + `frontend/`), no repositório
[iagokoch/horangotango](https://github.com/iagokoch/horangotango). Branch única: `main`.

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
| `./mvnw test`             | Executa os testes                    |
| `./mvnw clean package`    | Gera o JAR em `target/`              |
| `docker compose up -d`    | Sobe o Postgres local                |

> **Testcontainers no Windows:** se `./mvnw test` falhar com *"Could not find a valid Docker
> environment"* mesmo com o Docker Desktop rodando, crie `~/.testcontainers.properties` com
> `docker.host=npipe:////./pipe/dockerDesktopLinuxEngine`.

## Autenticação

Ainda não existe endpoint de login. A API apenas **valida** tokens JWT já emitidos
(HMAC + expiração), extraindo o usuário da claim `sub`. Rotas públicas: `/api/health`,
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
