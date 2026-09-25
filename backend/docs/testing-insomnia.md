# Testando a API de Ferramentas no Insomnia

Guia para testar manualmente `POST /api/tools` e `PUT /api/tools/{id}` (SCRUM-78 e SCRUM-93) usando o Insomnia.

## 1. Suba a aplicação

```bash
docker compose up -d          # sobe o Postgres em localhost:5433
mvn spring-boot:run           # sobe a API em http://localhost:8080
```

A API só sobe se o Postgres estiver acessível (Liquibase roda as migrations no start).

## 2. Gere um token JWT de teste

Ainda não existe um endpoint de login — o projeto só valida tokens já emitidos (assinatura HMAC + expiração), extraindo o usuário da claim `sub`. Para testar manualmente, gere um token assinado com o mesmo segredo da aplicação.

- Segredo padrão de dev (definido em `src/main/resources/application.yml`, variável `app.jwt.secret`, sobrescrevível por `JWT_SECRET`):
  ```
  change-me-in-prod-please-use-a-real-secret-min-32-bytes
  ```
- Use [jwt.io](https://jwt.io) (aba "Encode" à direita) ou qualquer gerador de JWT HS256:
  - **Header**: `{"alg":"HS256"}`
  - **Payload**: `{"sub":"user-teste","iat":1700000000,"exp":9999999999}` (ajuste `sub` para o "usuário" que você quer ver como `idUsuarioCriacao`/`idUsuarioAlteracao`; `exp` é um timestamp Unix no futuro)
  - **Verify signature**: cole o segredo acima no campo do secret (HS256)
- Copie o token gerado (três blocos separados por `.`).

> Trate esse segredo como valor de desenvolvimento apenas — nunca use em produção.

## 3. Configure o Insomnia

1. Crie um novo **Environment** com:
   ```json
   {
     "base_url": "http://localhost:8080",
     "token": "COLE_O_TOKEN_AQUI"
   }
   ```
2. Em cada request, na aba **Auth**, escolha **Bearer Token** e use `{{ _.token }}` — ou adicione manualmente o header `Authorization: Bearer {{ _.token }}`.

## 4. Requests para criar

**Criar ferramenta**
- Método: `POST`
- URL: `{{ _.base_url }}/api/tools`
- Header: `Authorization: Bearer {{ _.token }}`
- Body (JSON):
  ```json
  {
    "codigo": "1LPJ89",
    "nome": "Martelo",
    "quantidade": 10
  }
  ```
- Esperado: `200 OK`, corpo com `id`, `idUsuarioCriacao`/`idUsuarioAlteracao` iguais ao `sub` do token, `versao: 0`.

**Cenários de erro para testar**
| Cenário | Body | Status esperado |
|---|---|---|
| Sem header `Authorization` | qualquer | `401 Unauthorized` |
| Código repetido | mesmo `codigo` de uma ferramenta já criada | `400 Bad Request` (mensagem de duplicidade) |
| Nome vazio / ausente | `{"codigo":"X","nome":"","quantidade":1}` | `400 Bad Request` |
| Quantidade negativa | `{"codigo":"X2","nome":"Serra","quantidade":-1}` | `400 Bad Request` |
| Quantidade ausente | `{"codigo":"X3","nome":"Serra"}` | `400 Bad Request` |

## 5. Requests para listar/buscar

- `GET {{ _.base_url }}/api/tools` — lista todas (requer token).
- `GET {{ _.base_url }}/api/tools/{id}` — busca por id (pegue o `id` da resposta do create).

## 6. Request para editar (optimistic lock)

- Método: `PUT`
- URL: `{{ _.base_url }}/api/tools/{id}` (id da ferramenta criada)
- Header: `Authorization: Bearer {{ _.token }}`
- Body (JSON) — igual ao de criação, mas com `versao` do registro atual:
  ```json
  {
    "codigo": "1LPJ89",
    "nome": "Martelo Grande",
    "quantidade": 20,
    "versao": 0
  }
  ```
- Esperado: `200 OK`, `versao` incrementada para `1`, `idUsuarioAlteracao` atualizado com o `sub` do token usado nessa chamada.

**Cenários de erro para testar**
| Cenário | Ajuste no body | Status esperado |
|---|---|---|
| Repetir o mesmo PUT (versão desatualizada) | mantenha `versao: 0` na segunda chamada | `409 Conflict` |
| Id inexistente | use um id qualquer, ex. `does-not-exist` | `404 Not Found` |
| Código já usado por outra ferramenta | `codigo` de outro registro existente | `400 Bad Request` |

## 7. Swagger (referência rápida)

Com a aplicação no ar, `http://localhost:8080/swagger-ui/index.html` mostra os mesmos endpoints com seus schemas — útil para conferir o formato exato de request/response sem sair do navegador.
