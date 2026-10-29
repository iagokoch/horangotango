# Monitoolring — roteiro de demonstração do backend N2

Objetivo: demonstrar a API de empréstimo de ferramentas, os 15 FRs do escopo N2
e suas evidências de teste. A apresentação utiliza Swagger, respostas HTTP e testes
do backend. Reserve aproximadamente 15 minutos, conforme o ambiente.

## 1. Versão e preparação

Este roteiro acompanha o [changelog da v2.0](changelog-v2.0.md). Na conferência de
**29/10/2026**, a `main@8a8dd23` contém todos os PRs da N2: [#24](https://github.com/iagokoch/horangotango/pull/24),
[#25](https://github.com/iagokoch/horangotango/pull/25), [#30](https://github.com/iagokoch/horangotango/pull/30),
[#31](https://github.com/iagokoch/horangotango/pull/31) e [#32](https://github.com/iagokoch/horangotango/pull/32)
(26/10), [#33](https://github.com/iagokoch/horangotango/pull/33) e [#34](https://github.com/iagokoch/horangotango/pull/34)
(27/10), além do frontend ([#35](https://github.com/iagokoch/horangotango/pull/35), 28/10).
As regressões de espera por lock, duplicidade concorrente de código, consulta consistente na
devolução e recusa de decimais em campos inteiros, além da coleção Postman ampliada, estão nessa base.

Cada total de testes citado abaixo pertence a um commit identificado (`9e352b4`, `86c882a`
ou o commit validado da v2.0); o total do commit entregue está no changelog, em
[Validação da v2.0](changelog-v2.0.md#validação-da-v20).

Use a versão tagueada `v2.0` (ou a `main`) e registre o commit exibido por
`git rev-parse --short HEAD`.

Pré-requisitos: JDK 21, Docker em execução e um banco de desenvolvimento.
No Git Bash, a partir da raiz do repositório:

```bash
cd backend
export JAVA_HOME="$HOME/.jdks/ms-21.0.12.1"
docker compose up -d
export DB_URL="jdbc:postgresql://localhost:5433/monitoolring"
./mvnw spring-boot:run
```

O terminal fica ocupado pela aplicação. Use outro terminal em `backend/` para
os testes, configurando nele o mesmo `JAVA_HOME`. O Compose publica o Postgres
na porta 5433; os ITs criam seus próprios bancos com Testcontainers.

Abra `http://localhost:8080/swagger-ui.html`. Use a conta Staff disponível no
ambiente, criada pelo bootstrap `APP_BOOTSTRAP_STAFF_*` ou por outro Staff.
As credenciais ficam na configuração local. Oculte tokens e senhas nas evidências.

### Dados a manter durante a apresentação

| Nome no roteiro | Como obter |
|---|---|
| Staff | Login de uma conta com papel `STAFF` |
| Membro A / Membro B | Duas contas criadas em `POST /api/auth/register`, com e-mails distintos |
| Ferramenta A / Ferramenta B | Dois cadastros de `POST /api/tools`, com códigos únicos de até 18 caracteres |
| Empréstimo A / Empréstimo B | IDs retornados nas respectivas retiradas |

Copie os IDs das respostas. Substitua os campos entre `<...>` antes de enviar os
exemplos. A cada nova execução, escolha e-mails e códigos de ferramenta ainda não
cadastrados. Ao trocar de papel no Swagger, atualize **Authorize** com o token
do login correspondente, sem o prefixo `Bearer`.

## 2. Saúde, autenticação e papéis — FR-1 / FR-2

1. Execute `GET /api/health`: mostrar `200` e `status: UP`.
2. Cadastre os Membros A e B em `POST /api/auth/register`: mostrar `201`, papel
   `MEMBER` e ausência de senha/hash na resposta.
3. Faça login do Membro A e do Staff em `POST /api/auth/login`: mostrar `200`,
   `tipo: Bearer`, `expiraEm` e o papel do usuário, ocultando o token na gravação.
4. Com Staff, crie outra conta Staff em `POST /api/staff`: mostrar `201` e papel `STAFF`.
5. Com Membro, tente `POST /api/staff`: mostrar `403`.

Explique que logout responde `204` e o cliente descarta o token. A revogação
no servidor permanece na N3; o token emitido continua válido até expirar.

O cadastro de Membro/Staff exige senha de pelo menos 8 caracteres e no máximo
72 bytes UTF-8. Caracteres acentuados e emojis podem ocupar mais de um byte.
Essa proteção do PR #30 não representa upgrade da dependência BCrypt nem resolução
das contas legadas com senhas acima do limite; esses itens exigem decisão própria.

## 3. Catálogo de ferramentas — FR-3 / FR-4 / FR-5

Com Staff, crie duas ferramentas usando códigos diferentes:

```json
{
  "codigo": "<codigo-unico>",
  "nome": "Furadeira de impacto",
  "categoria": "Eletricas",
  "valorEstimado": 350.00,
  "estadoConservacao": "Nova, com maleta"
}
```

Mostrar `201`, status `AVAILABLE`, `id` e `versao`. Com Membro, consulte
`GET /api/tools?status=AVAILABLE` e `GET /api/tools/{id}`: ambos retornam `200`.

Antes das retiradas, demonstre uma edição parcial com Staff:

```json
{
  "nome": "Furadeira revisada",
  "versao": 0
}
```

Envie por `PATCH /api/tools/{id}`, usando a versão atual da resposta em vez de
presumir que ela é zero. Mostrar `200`, incremento de versão e preservação dos
campos omitidos. Para demonstrar inativação/reativação, aplique `INACTIVE` e depois
`AVAILABLE`, sempre com a versão retornada pela operação anterior.

## 4. Prazo e retirada — FR-8 / FR-9 / FR-10 / FR-11

1. Com Staff, configure `PUT /api/settings/return-deadline` com `{ "dias": 7 }`.
   Mostrar `200`, `dias: 7` e auditoria. Membro recebe `403` nessa configuração.
2. Tente retirar a Ferramenta A para o Membro A com checklist vazio: mostrar `422`
   e `details` com os campos mínimos faltantes. A ferramenta permanece disponível.
3. Confirme a mesma retirada com o corpo completo abaixo: mostrar `201`.

```json
{
  "ferramentaId": "<id-da-ferramenta-a>",
  "membroId": "<id-do-membro-a>",
  "checklist": {
    "estadoFuncional": "INTACT",
    "avariasVisiveis": "Sem avarias",
    "acessoriosInclusos": ["Maleta", "Broca"]
  }
}
```

Na resposta, destacar `ACTIVE`, `diasPrazo: 7`, `dataHoraRetirada`,
`prazoDevolucao` e checklist `CHECKOUT`. O prazo corresponde à retirada mais
7 × 24 horas em UTC. Consultar a ferramenta: agora está `ON_LOAN`.

Em seguida, altere o prazo padrão para 30 dias. Consulte o Empréstimo A:
`diasPrazo` e `prazoDevolucao` permanecem os mesmos. Retire a Ferramenta B para o
Membro A: o novo Empréstimo B recebe `diasPrazo: 30`.

O formato do checklist é obrigatório nas duas operações. Quando não houver
acessórios, use `["Nenhum"]`; uma lista vazia recebe `422`.

## 5. Permissões de consulta

| Operação | Quem chama | Resultado |
|---|---|---|
| `GET /api/loans/{id-do-emprestimo-a}` | Membro A | `200` |
| Mesma consulta | Membro B | `403` |
| Mesma consulta | Staff | `200` |
| `GET /api/loans/{id-do-emprestimo-a}/checklists` | Membro A ou Staff | `200` |
| Consulta dos checklists do Empréstimo A | Membro B | `403` |
| Rota protegida sem token | Sem autenticação | `401` |

Antes da devolução, `checklistRetirada` existe e `checklistDevolucao` é nulo.

## 6. Devolução e comparação — FR-13 / FR-14 / FR-16

1. Com Staff, tente `POST /api/loans/{id-do-emprestimo-a}/return` com
   `{ "checklist": {} }`: mostrar `422`, empréstimo ainda `ACTIVE` e ferramenta `ON_LOAN`.
2. Com Membro, a mesma rota recebe `403`.
3. Com Staff, envie o checklist completo:

```json
{
  "checklist": {
    "estadoFuncional": "INTACT",
    "avariasVisiveis": "Sem avarias",
    "acessoriosInclusos": ["Maleta", "Broca"]
  }
}
```

Mostrar `200`, status `RETURNED`, `dataHoraDevolucao`, `staffDevolucaoId` e
checklist `RETURN`. Consultar a ferramenta e o catálogo filtrado: a Ferramenta A
volta a `AVAILABLE` na mesma transação.

Consulte `GET /api/loans/{id-do-emprestimo-a}/checklists`: destacar os dois registros,
seus IDs, tipos, horários e usuários. O checklist original permanece preservado.
Repita a devolução: recebe `409` e mantém os registros anteriores.

Opcionalmente, retire a Ferramenta A de novo: um novo empréstimo é criado e os
checklists do empréstimo anterior continuam consultáveis. Ao encerrar a demonstração,
devolva os empréstimos ainda ativos, incluindo o Empréstimo B.

Explique que a N2 registra os checklists e libera a ferramenta; a sinalização de
divergência com justificativa e encaminhamento para reparo pertence à N3.

## 7. Atraso e liberação — FR-12 / FR-17 / FR-18

Para demonstrar vencimentos sem esperar dias, use o IT com `Clock` controlável,
no segundo terminal, em `backend/`:

```bash
export JAVA_HOME="$HOME/.jdks/ms-21.0.12.1"
./mvnw -Dtest=LoanOverdueIT test
```

Mostrar os testes e o resultado do Surefire. Os cenários verificam:

- Antes e exatamente no prazo, não há bloqueio; ultrapassado o prazo, há `409`.
- A recusa ocorre antes do checklist e identifica empréstimo, ferramenta e prazo vencido.
- Com dois atrasos, devolver um mantém o bloqueio; devolver o último permite nova retirada.
- Um empréstimo ativo ainda no prazo não impede a liberação do último atraso.
- Alterar o prazo padrão não perdoa um atraso existente.

O teste usa banco próprio do Testcontainers e não altera o relógio da aplicação da
apresentação. O atraso é calculado em tempo real, sem flag persistida nem job.

## 8. Concorrência e evidência automatizada

Na `main`, execute:

```bash
./mvnw -Dtest=LoanControllerIT,LoanReturnIT test
```

Mostrar que duas retiradas da mesma ferramenta permitem apenas uma confirmação;
duas devoluções do mesmo empréstimo produzem um `200` e um `409`, com um único
checklist `RETURN`.

Execute também a regressão do PR #24:

```bash
./mvnw -Dtest=LoanCheckoutReviewIT test
```

Seus dois testes verificam mudanças durante a espera pelo lock: empréstimo que
vence nesse intervalo passa a bloquear, e novo prazo padrão passa a valer para a
retirada confirmada depois da espera.

Para os cenários dos PRs #31 e #32:

```bash
./mvnw -Dtest=ToolCodigoConcurrencyIT,LoanReadConsistencyIT test
```

O primeiro verifica conflito `409` para código duplicado concorrente, com unicidade
e rollback da edição recusada. O segundo verifica que os GETs de detalhes e checklists,
por dono ou Staff, observam um estado completo durante a devolução concorrente.

Para a evidência completa do backend:

```bash
./mvnw test
```

Resultado no commit `9e352b4` (26/10/2026): **239 testes em 27 classes**, com zero falhas, erros
ou testes ignorados, executando `./mvnw -o test` com JDK 21 e Docker. O modo `-o` usa as
dependências já disponíveis no cache local. Os resultados anteriores de 181 testes em `149ec3d` e
183 em `0f49860` ficam identificados como históricos no changelog.

O PR #33 (commit `86c882a`, hoje integrado) passou com 64 testes focados e **264 testes em
28 classes** na suíte completa. Para demonstrar a correção:

```bash
./mvnw -Dtest=IntegerJsonValidationIT test
```

Os 25 casos conferem o `400` para decimais, preservação dos dados/versão/auditoria,
inteiros e limites válidos, aceitação de valores monetários decimais e conflito de
versão inteira com `409`. Essa classe só existe a partir do PR #33, isto é, não está em `9e352b4`.

Os totais de 239 e 264 são evidências locais de commits distintos, obtidas em exportações
limpas no TEMP; não são checks de CI nem devem ser somados. O resultado do commit entregue na
v2.0 está no changelog. Registre o resultado efetivo do commit usado na apresentação, pois a
quantidade pode mudar com novas integrações.

## 9. Alternativa com a coleção Postman

A [coleção versionada](postman/monitoolring.postman_collection.json) pode executar os
fluxos repetitivos da apresentação. Na `main`, cobre Health, Auth, Staff,
Tools, Settings e Loans, com 71 requisições (ampliação do PR #24).

Execute a coleção inteira em ordem:
**Health → Auth → Staff → Tools → Settings → Loans**. Ajuste `baseUrl` e as credenciais
do ambiente no Postman. A coleção cria dados únicos e restaura o prazo inicial
quando já existia; se não estava configurado, deixa-o em 7 dias.

Com Newman disponível, de dentro de `backend/`:

```bash
npx newman run docs/postman/monitoolring.postman_collection.json
```

A versão ampliada no código do PR #24 foi validada em duas execuções de 71 requisições,
com 129 e 128 asserções aprovadas. São evidências históricas; Newman não foi reexecutado
na revisão documental nem nas validações Maven. Atraso e concorrência
são demonstrados pelos ITs, não por espera real de dias durante a execução da coleção.

## 10. Evidências e encerramento

Guarde, sem tokens/senhas, o commit utilizado, o resultado da suíte e respostas que
mostrem: retirada `201`, checklist incompleto `422`, acesso indevido `403`, devolução
`200` com os dois checklists e nova disponibilidade. Use os ITs para evidenciar
bloqueio, liberação e concorrência.

Encerre apresentando o [changelog da v2.0](changelog-v2.0.md) e os quatro FRs da N3:
histórico de Membro por Staff (FR-6), próprios empréstimos (FR-7), divergência (FR-15)
e perda/furto (FR-19). O changelog também identifica as demais pendências técnicas.

Referências: [PRD](prd.md), [convenções HTTP](api-convencoes-http.md),
[guia de testes manuais](testing-manual.md), [visão geral](../../README.md) e
[handoff](../../docs/handoff/README.md).
