# Testando a API manualmente

O caminho principal é a **coleção Postman** versionada em
[`postman/monitoolring.postman_collection.json`](postman/monitoolring.postman_collection.json).
Ela cobre as rotas implementadas (Health, Auth, Staff, Tools, Settings e Loans), com casos de sucesso e
de erro, e cada request tem testes de status code. Este guia explica como usá-la e, para quem
preferir, mostra o mesmo fluxo com `curl`.

> Este arquivo substitui o antigo `testing-insomnia.md`. O guia antigo descrevia um fluxo que
> deixou de existir (token gerado à mão no jwt.io, `PUT`, campo `quantidade`). A equipe passou
> a usar Postman, e o Insomnia importa a mesma coleção. Por isso o guia agora não depende de
> ferramenta.

## 1. Suba a aplicação

Siga o [README do backend](../../README.md#como-iniciar): `docker compose up -d`, `DB_URL`
apontando para a porta 5433 e `./mvnw spring-boot:run`. Confira:

```
GET http://localhost:8080/api/health   →   200 {"status":"UP","service":"monitoolring-api",...}
```

Na primeira subida, o bootstrap cria o primeiro Staff com as credenciais de desenvolvimento
`staff@monitoolring.local` / `change-me-dev-only` (variáveis `APP_BOOTSTRAP_STAFF_*`). Não é
mais preciso gerar token à mão: o token vem do login.

## 2. Coleção Postman

1. **Importe** o arquivo no Postman (*Import* → arquivo). No Insomnia, use *Import* com o
   mesmo arquivo: ele aceita coleções Postman v2.1.
2. Se a API não estiver em `http://localhost:8080`, ajuste a variável de coleção `baseUrl`.
   Se mudou as credenciais do bootstrap, ajuste também `staffEmail` e `staffPassword`.
3. **Rode a coleção inteira, em ordem** (*Run collection*). Os requests dependem uns dos outros:
   - **Auth → Login Staff (bootstrap)** grava `token`, que a coleção usa como Bearer padrão.
   - **Auth → Login Membro** grava `memberToken`, usado nos casos de `403`.
   - **Tools → Cadastrar ferramenta** grava `toolId` e `toolVersao`, usados pelo resto da pasta.
   - **Settings** consulta e configura o prazo padrão, validando limites e permissões.
   - **Loans** cria ferramentas e outro Membro próprios para a execução, confirma retiradas,
     preserva o prazo de empréstimos existentes, devolve e consulta os dois checklists.
4. E-mails e códigos de ferramenta são gerados a cada execução, então a coleção pode rodar
   várias vezes no mesmo banco.

Pela linha de comando, com Node instalado, de dentro de `backend/`:

```bash
npx newman run docs/postman/monitoolring.postman_collection.json
# outra porta: acrescente --env-var baseUrl=http://localhost:8089
```

Resultado esperado: todos os requests e asserções passando, sem falhas.

Use um banco de desenvolvimento: a coleção cria dados de teste e altera o prazo padrão.
Se já havia prazo configurado, a última requisição restaura seu valor. Se ainda não havia,
o prazo fica configurado em 7 dias; não existe DELETE da configuração.

### 2.1 Atraso e concorrência

A coleção não altera o relógio da aplicação nem espera dias para vencer um empréstimo.
Os cenários de bloqueio `409`, múltiplos atrasos e liberação após a última devolução são
verificados por `LoanOverdueIT`, com `Clock` controlável. `LoanCheckoutReviewIT` cobre
mudanças de prazo e atraso enquanto a Retirada espera o lock; `LoanControllerIT` e
`LoanReturnIT` cobrem tentativas concorrentes. Execute a suíte de dentro de `backend/`:

```bash
export JAVA_HOME="$HOME/.jdks/ms-21.0.12.1"
./mvnw test
```

## 3. O mesmo fluxo com curl

Exemplos para bash (Linux/macOS/Git Bash). No PowerShell, `curl` é apelido de
`Invoke-WebRequest`: use `curl.exe` e, como as aspas do JSON são problemáticas no PowerShell,
prefira a coleção.

> **Acentos no Windows:** o `curl.exe` chamado pelo Git Bash ou pelo PowerShell pode enviar
> texto acentuado passado em `-d` numa codificação que não é UTF-8. A API responde `400`
> ("Corpo da requisição malformado"). Para enviar acentos, salve o corpo num arquivo UTF-8 e
> use `--data-binary @corpo.json`, ou use a coleção. Os exemplos abaixo evitam acentos.

```bash
BASE=http://localhost:8080

# Login do Staff do bootstrap → copie o "token" da resposta
curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"staff@monitoolring.local","senha":"change-me-dev-only"}'
STAFF_TOKEN=cole-o-token-aqui

# Autocadastro de Membro (sempre papel MEMBER) e login dele
curl -s -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","email":"ana@example.com","senha":"senha-da-ana"}'
curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","senha":"senha-da-ana"}'
MEMBER_TOKEN=cole-o-token-aqui

# Cadastrar ferramenta (Staff) → 201, status AVAILABLE, versao 0
curl -s -X POST $BASE/api/tools -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codigo":"FUR-001","nome":"Furadeira de impacto","categoria":"Furadeiras","valorEstimado":899.90,"estadoConservacao":"Nova, com maleta"}'
TOOL_ID=cole-o-id-aqui

# Catálogo (Membro ou Staff), com filtro opcional de status
curl -s "$BASE/api/tools?status=AVAILABLE" -H "Authorization: Bearer $MEMBER_TOKEN"

# Editar (PATCH parcial; versao obrigatória e igual à atual) → 200, versao + 1
curl -s -X PATCH $BASE/api/tools/$TOOL_ID -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" -d '{"nome":"Furadeira 650W","versao":0}'

# Inativar (remoção lógica) → 200, status INACTIVE
curl -s -X PATCH $BASE/api/tools/$TOOL_ID -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"INACTIVE","versao":1}'

# Configurar prazo padrao (Staff) → 200; so vale para retiradas novas
curl -s -X PUT $BASE/api/settings/return-deadline -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" -d '{"dias":7}'

# Use uma ferramenta AVAILABLE e um membro cadastrado; copie o id do emprestimo
curl -s -X POST $BASE/api/loans -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ferramentaId":"ID_FERRAMENTA_DISPONIVEL","membroId":"ID_MEMBRO","checklist":{"estadoFuncional":"INTACT","avariasVisiveis":"Sem avarias","acessoriosInclusos":["Nenhum"]}}'
LOAN_ID=cole-o-id-aqui

# Comparar checklists (dono ou Staff); devolucao e nula antes de confirmar
curl -s $BASE/api/loans/$LOAN_ID/checklists -H "Authorization: Bearer $MEMBER_TOKEN"

# Devolver (Staff) → 200, emprestimo RETURNED e ferramenta AVAILABLE
curl -s -X POST $BASE/api/loans/$LOAN_ID/return -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"checklist":{"estadoFuncional":"INTACT","avariasVisiveis":"Sem avarias","acessoriosInclusos":["Nenhum"]}}'
```

## 4. Códigos que você deve ver

Todo erro volta como JSON no formato `ErrorResponse`
(`timestamp`, `status`, `error`, `message`, `details`).

| Cenário | Status |
|---|---|
| Rota protegida sem `Authorization`, ou com token inválido, expirado ou sem `exp` | `401` |
| Login com e-mail inexistente ou senha errada (mesma mensagem nos dois casos) | `401` |
| Membro chamando `POST /api/tools`, `PATCH /api/tools/{id}` ou `POST /api/staff` | `403` |
| Corpo com campo obrigatório faltando, em branco ou fora do formato (`valorEstimado` ≤ 0, e-mail inválido, senha < 8) | `400` (com `details` por campo) |
| JSON malformado; `?status=` com valor que não existe | `400` |
| `PATCH` sem `versao` | `400` |
| E-mail já cadastrado; código de ferramenta já cadastrado | `409` |
| `PATCH` com `versao` diferente da atual | `409` |
| `PATCH` mudando o status de uma ferramenta emprestada (`ON_LOAN`) | `409` |
| `PATCH` pedindo `status` `ON_LOAN`, `LOST` ou `UNDER_REPAIR` | `422` |
| Ferramenta inexistente | `404` |
| GET do prazo antes da primeira configuração | `404` |
| Retirada sem prazo configurado, ferramenta indisponível ou Membro em atraso | `409` |
| Tomador Staff ou checklist incompleto na Retirada/Devolução | `422` |
| Devolução de Empréstimo já encerrado, inclusive tentativa simultânea perdedora | `409` |
| Membro consultando Empréstimo ou checklists de outro Membro | `403` |
| `DELETE` ou `PUT` em `/api/tools/{id}` como Staff (não existem; a remoção é lógica). Um Membro recebe `403` antes | `405` |
| Erro inesperado no servidor (mensagem genérica, sem detalhe interno) | `500` |

A fronteira entre `400` e `422` está em
[`api-convencoes-http.md`](api-convencoes-http.md#31-fronteira-entre-400-422-e-409).

## 5. Swagger

Com a aplicação no ar, `http://localhost:8080/swagger-ui.html` lista as rotas com os schemas de
request, de resposta e de erro. Para chamar uma rota protegida pelo Swagger, faça o login,
clique em **Authorize** e cole só o token, sem o prefixo `Bearer`. As rotas públicas
(health, register, login) aparecem sem cadeado.
