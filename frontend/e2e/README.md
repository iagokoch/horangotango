# Roteiro E2E

`roteiro.mjs` percorre 94 passos pela interface real: autenticação, permissões, ferramentas,
retirada, atraso e bloqueio, devolução, sessão, responsividade em 390/820/1440 px e fluxos no
celular. Ele roda contra o **build de produção do frontend**, a **API Spring Boot** e um
**PostgreSQL de teste descartável**. Não há mocks.

O roteiro cria contas, ferramentas e empréstimos e retroage o prazo de um empréstimo
**diretamente no banco**. Por isso ele só roda em um ambiente isolado.

## Proteções

O roteiro aborta antes do primeiro passo (código de saída 2) quando:

- `BASE_URL` não é local (`localhost`, `127.0.0.1` ou `[::1]`);
- o banco `monitoolring_e2e` do contêiner de teste não pode ser consultado. O nome do banco é fixo
  no código e não é configurável;
- esse banco não está vazio. O esperado é só o Staff do bootstrap, sem ferramentas, empréstimos
  ou prazo configurado.

As escritas diretas (`UPDATE` do prazo) acontecem apenas via `docker exec` nesse contêiner.

## Requisitos

- Node.js 20+ e as dependências do frontend (`npm ci`). O `playwright-core` é dependência de
  desenvolvimento e **não baixa navegadores**: usa um navegador instalado (Edge por padrão).
- Docker em execução.
- JDK 21 para o backend.

## Execução

Todos os comandos abaixo são para Git Bash, a partir da raiz do repositório.

1. **Banco de teste isolado**, com os dados em memória (somem ao parar o contêiner):

   ```bash
   MSYS_NO_PATHCONV=1 docker run -d --name monitoolring-e2e-pg \
     -e POSTGRES_DB=monitoolring_e2e -e POSTGRES_USER=monitoolring -e POSTGRES_PASSWORD=monitoolring \
     -p 5434:5432 --tmpfs /var/lib/postgresql/data postgres:16
   ```

   Se o contêiner já existir, `docker restart monitoolring-e2e-pg` devolve o banco vazio.

2. **Backend** apontando para esse banco (em outro terminal):

   ```bash
   cd backend
   export JAVA_HOME="/c/Program Files/Java/jdk-21.0.12.1"   # ajuste para o seu JDK 21
   export DB_URL="jdbc:postgresql://localhost:5434/monitoolring_e2e"
   ./mvnw -DskipTests spring-boot:run
   ```

   Na subida, o Liquibase cria o esquema e o bootstrap cria `staff@monitoolring.local`.

3. **Frontend em produção** na porta 3100 (em outro terminal):

   ```bash
   cd frontend
   npm run build
   API_URL=http://localhost:8080/api npx next start -p 3100
   ```

4. **Roteiro:**

   ```bash
   cd frontend
   npm run test:e2e
   ```

Para repetir a execução, faça `docker restart monitoolring-e2e-pg` e reinicie o backend. O roteiro
exige o banco vazio.

## Variáveis

| Variável | Padrão | Uso |
|---|---|---|
| `BASE_URL` | `http://localhost:3100` | Frontend testado (precisa ser local) |
| `E2E_PG_CONTAINER` | `monitoolring-e2e-pg` | Contêiner do banco de teste |
| `E2E_BROWSER_CHANNEL` | `msedge` | Navegador instalado (`msedge`, `chrome`…) |
| `E2E_STAFF_EMAIL` / `E2E_STAFF_SENHA` | credenciais de desenvolvimento do bootstrap | Staff inicial do backend |
| `E2E_OUT` | `e2e/resultados/` | Capturas e `resultado.json`. A pasta está no `.gitignore` |

## Saída

Cada passo é impresso como `✔`, `✘` ou `–` (não executado por falta de pré-requisito). Os passos
que falham geram uma captura `falha-NN.png`. O resumo vai para `resultado.json`, junto com as
medidas do campo de busca do cabeçalho. O código de saída é `0` só quando todos os passos passam.
