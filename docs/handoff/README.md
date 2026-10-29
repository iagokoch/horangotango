# Monitoolring — handoff para a equipe receptora

Documento para a equipe que receberá o projeto avaliar a **viabilidade de recepção** e continuar o
trabalho na N3. Reflete a entrega **v2.0** da equipe checkflow, sobre a `main` em `8a8dd23`
(merge do PR #35). Para o detalhe de cada assunto, siga os links; este texto evita repeti-los.

> **Substitui o "Plano de continuidade".** O arquivo
> `backend/docs/requisitos-n2/documentos/Plano de continuidade.docx` está **desatualizado**: afirma
> que os FR-8 a FR-18 não estão na `main`, mas eles estão implementados. O estado correto é o
> descrito aqui e na [tabela de requisitos do README](../../README.md#status-dos-requisitos). Os
> `.docx` de requisitos foram mantidos sem edição, por serem artefatos de outro integrante.

## 1. Produto e domínio

O **Monitoolring** organiza o empréstimo de ferramentas em um makerspace: quem retirou, em que
estado de conservação e até quando deve devolver. Dois papéis: **Membro** (`MEMBER`), que consulta
o catálogo, e **Staff** (`STAFF`), que cadastra ferramentas e confirma retiradas e devoluções no
balcão.

Regra crítica: **quem tem empréstimo em atraso não pode retirar outra ferramenta** até resolver
todas as pendências. O atraso é **derivado** em tempo real (empréstimo `ACTIVE` com prazo
estritamente anterior ao `Clock` UTC); não existe coluna nem job. Retirada e devolução exigem um
**Checklist de Conservação** imutável. Glossário e ciclo da ferramenta: [README, "Domínio"](../../README.md#domínio-e-ciclo-da-ferramenta).
Requisitos completos (FR-1 a FR-19, regras e NFRs): [PRD](../../backend/docs/prd.md).

## 2. Arquitetura

```text
Navegador ──(cookie httpOnly)──▶ Next.js 14 (BFF) ──(Authorization: Bearer)──▶ Spring Boot 3.3 ──▶ PostgreSQL 16
            páginas + Server Actions   lib/api/client.ts (server-only)           /api/**            Liquibase
```

| Camada | Pontos principais |
|---|---|
| **Backend** (`backend/`) | Java 21, Spring Boot 3.3.2, Spring Security com JWT HS256 stateless (jjwt), JPA/Hibernate, Liquibase (`db.changelog-master.sql`), MapStruct, springdoc. Camadas `controller → service → repository`; `ErrorResponse` padronizado; lock pessimista e índice único parcial contra retirada concorrente |
| **Frontend** (`frontend/`) | Next.js 14 (App Router), React 18, TypeScript, Tailwind + shadcn/ui, Zod. **BFF**: todas as chamadas à API partem do servidor Next; o JWT fica no cookie `httpOnly` `mt_session` e nunca no JavaScript do navegador. Organizado em `features/<domínio>` |
| **Banco** | Modelo no [DER](../DER/README.md) (6 tabelas, changesets 1 a 7) |

Detalhes: [README do frontend](../../frontend/README.md) (arquitetura e design system "Etiqueta & Bancada"),
[`EVOLUCAO_FRONTEND.md`](../../frontend/docs/EVOLUCAO_FRONTEND.md) e as convenções de API em
[`backend/docs/`](../../backend/docs/).

## 3. Rodar tudo do zero

Pré-requisitos: **JDK 21**, **Docker** em execução, **Node.js 20 LTS** (mínimo 18.18) e Git. O
Maven não precisa ser instalado (há Wrapper). Comandos em Git Bash.

### 3.1 Backend

```bash
git clone https://github.com/iagokoch/horangotango.git
cd horangotango/backend
export JAVA_HOME="$HOME/.jdks/ms-21.0.12.1"   # ajuste para o seu JDK 21; ./mvnw -v confere

docker compose up -d                          # PostgreSQL 16 em localhost:5433
export DB_URL="jdbc:postgresql://localhost:5433/monitoolring"
./mvnw spring-boot:run                        # API em http://localhost:8080
curl http://localhost:8080/api/health         # {"status":"UP",...}
```

O padrão de `DB_URL` no `application.yml` usa a porta 5432; por isso a variável acima. O Liquibase
cria o schema na subida. Swagger: `http://localhost:8080/swagger-ui.html`.

### 3.2 Primeiro Staff (bootstrap)

Na subida, se **nenhum Staff existir**, a API cria um a partir de `APP_BOOTSTRAP_STAFF_*`. Em
desenvolvimento, o padrão é `staff@monitoolring.local` (senha de desenvolvimento em
`application.yml`). Para outro valor, defina antes da primeira subida:

```bash
export APP_BOOTSTRAP_STAFF_NOME="Responsável da Oficina"
export APP_BOOTSTRAP_STAFF_EMAIL="staff@exemplo.com"
export APP_BOOTSTRAP_STAFF_PASSWORD="uma-senha-com-8+-caracteres"
```

E-mail vazio desliga o bootstrap; senha curta (menos de 8) gera aviso e **não** cria a conta; um
Membro existente com o mesmo e-mail **não** é promovido. Em qualquer ambiente real, defina também
`JWT_SECRET` (mínimo 32 bytes) e `DB_USER`/`DB_PASSWORD`. Tabela completa das variáveis:
[README, "Variáveis de ambiente"](../../README.md#variáveis-de-ambiente).

### 3.3 Configurar o prazo de devolução

**Antes da primeira retirada**, um Staff precisa configurar o prazo (sem isso a retirada responde
`409`). Pela interface: *Configurações*; pela API:

```bash
# 1) login -> copie o campo "token"
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"staff@monitoolring.local","senha":"<senha-do-bootstrap>"}'
# 2) prazo de 7 dias (1 a 365)
curl -s -X PUT http://localhost:8080/api/settings/return-deadline \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"dias":7}'
```

### 3.4 Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local      # API_URL=http://localhost:8080/api
npm run dev                     # http://localhost:3000
```

Entre com o Staff do bootstrap, configure o prazo, cadastre ferramentas, cadastre um Membro
(*Cadastro*) e registre uma retirada informando o ID do membro (exibido em *Meu perfil*). Build de
produção: `npm run build && npm run start`; Docker: `docker compose up --build` (o backend continua
no host; o caminho Docker **não foi verificado** na N2).

## 4. Como testar

| Alvo | Comando | Observações |
|---|---|---|
| Backend | `cd backend && ./mvnw test` | Unitários e `*IT` com Testcontainers 1.21.4 sobre PostgreSQL real; exige **Docker**, não exige o Compose. Totais da v2.0 no [changelog](../../backend/docs/changelog-v2.0.md#validação-da-v20) |
| Backend (build) | `./mvnw clean package` | Gera o JAR em `target/` |
| Frontend | `cd frontend && npm run validate` | `typecheck` + `lint` + 44 testes Vitest + `build` |
| Frontend E2E | `npm run test:e2e` | 94 passos pela interface contra API e banco **descartável** (porta 5434). Exige preparo manual: [`e2e/README.md`](../../frontend/e2e/README.md). Aborta se o banco não estiver vazio |
| API manual | Coleção [Postman](../../backend/docs/postman/monitoolring.postman_collection.json) | 71 requisições; ordem **Health → Auth → Staff → Tools → Settings → Loans**; guia: [testing-manual](../../backend/docs/testing-manual.md) |
| Demonstração | [Roteiro N2](../../backend/docs/roteiro-demonstracao-n2.md) | ~15 minutos, com Swagger e ITs |

Não há CI: nenhum desses comandos roda automaticamente (ver [débito TD-14](../debitos-tecnicos/README.md)).

## 5. Estado real dos requisitos

**15 dos 19 FRs implementados no backend; 4 reservados para a N3.** O frontend cobre os fluxos que a
API permite; as lacunas dele decorrem da ausência dos FRs de N3.

| Situação | FRs |
|---|---|
| ✅ Implementados (backend e frontend) | FR-1, FR-2, FR-3, FR-4, FR-5, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-16, FR-17, FR-18 |
| ➡️ N3 | FR-6, FR-7, FR-15, FR-19 |

Tabela com issues: [README, "Status dos requisitos"](../../README.md#status-dos-requisitos). Além dos
FRs, a N3 inclui Treinamento Prévio, multas, revogação de token, performance, LGPD e rota
inexistente (issues #17 a #22).

## 6. Onde começar cada pendência

Rotas sob `/api`, segundo [`api-nomenclatura-recursos.md`](../../backend/docs/api-nomenclatura-recursos.md)
e [`api-convencoes-http.md`](../../backend/docs/api-convencoes-http.md).

| Pendência | Issue | Ponto de partida |
|---|---|---|
| FR-6 histórico de Membro (Staff) | [#13](https://github.com/iagokoch/horangotango/issues/13) | `GET /loans?memberId={id}` sobre o resource `loans` existente |
| FR-7 próprios empréstimos (Membro) | [#14](https://github.com/iagokoch/horangotango/issues/14) | `GET /members/{id}/loans` e `GET /members/{id}` com `bloqueado` derivado; `403` para outro membro |
| FR-15 divergência de checklist | [#15](https://github.com/iagokoch/horangotango/issues/15) | Flag + justificativa obrigatória em `POST /loans/{id}/return`; ferramenta vai a `UNDER_REPAIR` |
| FR-19 perda/furto | [#16](https://github.com/iagokoch/horangotango/issues/16) | `POST /loans/{id}/loss`; ajustar FR-18 para liberar o bloqueio |
| Treinamento Prévio | [#17](https://github.com/iagokoch/horangotango/issues/17) | Estender `tools`, registrar treinamentos por Membro, checar em `POST /loans`. Desenho ainda em aberto |
| Multas | [#18](https://github.com/iagokoch/horangotango/issues/18) | Depende do atraso (FR-17), já derivado |
| Revogação de token | [#19](https://github.com/iagokoch/horangotango/issues/19) | Denylist no filtro JWT ou tokens curtos + refresh |
| Performance | [#20](https://github.com/iagokoch/horangotango/issues/20) | Teste de carga com centenas de ferramentas (metas de 1 s e 2 s do PRD §5) |
| LGPD | [#21](https://github.com/iagokoch/horangotango/issues/21) | Minimização, retenção e base legal; depende do FR-7 |
| Rotas inexistentes | [#22](https://github.com/iagokoch/horangotango/issues/22) | `SecurityConfig`; ver ressalva no [registro de débitos](../debitos-tecnicos/README.md) |

Regras para novas mudanças de schema: **sempre um changeset novo no fim** do master SQL, com
rollback; changesets aplicados não são editados.

## 7. Riscos conhecidos

Registro completo e priorizado: [débitos técnicos](../debitos-tecnicos/README.md). Os que mais
pesam na recepção:

| Risco | Efeito |
|---|---|
| Logout não revoga o JWT (#19) | Token vazado vale até 8 h |
| `spring-security-crypto` 6.3.1 e senhas legadas > 72 bytes | Contas antigas seguem com truncamento; sem recuperação de senha |
| Sem listagem de empréstimos/membros (#13, #14) | O frontend depende de IDs digitados e de `localStorage` |
| Divergência e perda inexistentes (#15, #16) | Ferramenta danificada volta como `AVAILABLE`; membro com ferramenta perdida fica bloqueado |
| Sem CI | Testes só rodam localmente; os totais do changelog são execuções locais |
| Credenciais e segredo de **desenvolvimento** nos padrões do `application.yml` e do Compose | Obrigatório sobrescrever fora de desenvolvimento |
| Dados migrados da N1 com valores-sentinela | Catálogo pode ter `NAO_INFORMADA` / `0.01` |
| Frontend: Docker, dispositivos reais e leitores de tela não verificados | Ver `EVOLUCAO_FRONTEND.md` §9.6 |
| Commit `462a434` com mensagem malformada | Apenas cosmético; histórico não reescrito |

## 8. Convenções (Acordo de Manutenibilidade)

Texto integral: [`acordo-manutenibilidade.docx`](../acordo-manutenibilidade.docx). Resumo:

- **Branches:** `main` é a única branch permanente e não recebe commits diretos, só PRs; branches de
  trabalho curtas `feat/…`, `fix/…`, `docs/…`, `refactor/…`, apagadas após o merge.
- **Commits:** Conventional Commits em português (`feat`, `fix`, `refactor`, `docs`, `test`,
  `build`), no formato `tipo(escopo): descrição`.
- **DoD:** code review por pelo menos outra pessoa; `./mvnw test` e `npm run validate` passando;
  Swagger, Postman, tabela de status e README atualizados quando o comportamento mudar; merge na `main`.
- **DoR:** história ligada a um FR, critérios na ERS/casos de uso, rota e changeset mapeados, item
  na matriz de rastreabilidade e issue no milestone.
- **Código:** classes e enums em inglês; campos de negócio e JSON em português; funções com
  responsabilidade única (≈ 30 linhas); sem `catch` vazio; conversão entidade↔DTO só pelo MapStruct;
  `Clock` injetável para tudo que depende de hora.
- **Débito técnico:** vira issue (milestone da entrega) e entra nas pendências do README; **20% do
  esforço do ciclo** vai para débitos; segurança, integridade de empréstimos e bloqueio de outro
  membro têm prioridade máxima. Sem `TODO`/`FIXME` soltos.
- **Bugs:** issue com passos, esperado, obtido, ambiente e severidade; correção em `fix/…` com teste
  que reproduz o erro.

## 9. Checklist de recepção

A equipe receptora pode marcar cada item ao avaliar a viabilidade.

**Acesso e ambiente**
- [ ] Conseguiu clonar o repositório e ler o [README](../../README.md).
- [ ] JDK 21, Docker e Node 20 instalados.
- [ ] `docker compose up -d` subiu o Postgres na porta 5433.
- [ ] `./mvnw spring-boot:run` iniciou a API e `GET /api/health` respondeu `200`.
- [ ] Bootstrap criou o primeiro Staff e o login funcionou.
- [ ] Prazo de devolução configurado e uma retirada concluída.
- [ ] `npm ci` e `npm run dev` abriram o frontend e o fluxo retirada → devolução funcionou.

**Verificação**
- [ ] `./mvnw test` passou localmente com o mesmo total do changelog.
- [ ] `./mvnw clean package` gerou o JAR.
- [ ] `npm run validate` passou.
- [ ] Coleção Postman executou sem falhas (Health → … → Loans).
- [ ] (Opcional) `npm run test:e2e` passou com 94/94.

**Entendimento**
- [ ] Entendeu a regra de bloqueio por atraso e que o atraso é derivado.
- [ ] Revisou o [DER](../DER/README.md) e o índice único parcial de empréstimo ativo.
- [ ] Revisou o [registro de débitos](../debitos-tecnicos/README.md) e aceita as prioridades propostas.
- [ ] Leu o [Acordo de Manutenibilidade](../acordo-manutenibilidade.docx) e concorda com as convenções.
- [ ] Sabe que o `Plano de continuidade.docx` está desatualizado e que este handoff o substitui.

**Viabilidade**
- [ ] A equipe tem competência na stack (Java/Spring, Next.js, PostgreSQL, Liquibase, Testcontainers).
- [ ] O esforço de FR-6, FR-7, FR-15 e FR-19 está estimado e cabe no ciclo N3.
- [ ] Há responsável para criar o CI (TD-14) e registrar as issues de débito ainda sem issue.
- [ ] Segredos e credenciais de produção serão definidos fora do repositório.
- [ ] Dúvidas pendentes registradas como issues no repositório.

Contexto, equipe e entregas: [README da raiz](../../README.md) e
[matriz de papéis](../matriz-de-papeis.md).
