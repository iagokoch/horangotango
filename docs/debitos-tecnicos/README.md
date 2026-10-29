# Monitoolring — registro de débitos técnicos

Estado na entrega N2 (**v2.0**), sobre a `main` em `8a8dd23`. Consolida o que está nas issues do
milestone [N3](https://github.com/iagokoch/horangotango/milestone/2), nas "Pendências para a N3" do
[README da raiz](../../README.md#pendências-para-a-n3), nas "Limitações conhecidas" do
[README do frontend](../../frontend/README.md#limitações-conhecidas) e em achados feitos durante o
preparo da entrega. Escopo e modelo de dados: [DER](../DER/README.md). Visão de recepção:
[handoff](../handoff/README.md).

## Política de registro e priorização

Fonte: [Acordo de Manutenibilidade](../acordo-manutenibilidade.docx) da equipe checkflow, seção 2.

**Registro.** Todo atalho técnico, pendência de refatoração, limitação conhecida ou funcionalidade
adiada deve virar uma issue do tipo **Débito Técnico** em `iagokoch/horangotango`, vinculada ao
milestone em que será tratada (`N2 — v2.0` ou `N3`). A issue descreve problema, impacto e ponto de
partida da correção, e o débito também consta em "Pendências para a N3" (README da raiz) ou em
"Limitações conhecidas" (README do frontend). Não são permitidos `TODO`/`FIXME`/`DEBT` soltos no
código sem issue.

**Priorização e pagamento.** A equipe dedica **20% do esforço de cada ciclo** à liquidação de
débitos registrados, e o PO revisa o backlog de débitos no início do ciclo. Têm **prioridade
máxima** no ciclo seguinte os débitos que afetem:

1. **segurança** (ex.: JWT válido após o logout);
2. **integridade dos dados de empréstimo** (bloqueio por inadimplência, concorrência na retirada e na devolução);
3. **o trabalho de outro membro do time** (ex.: contrato da API que quebra o frontend).

Neste registro, **Severidade** reflete o impacto, e **Prioridade** usa a regra acima: `Máxima`
(cai numa das três categorias), `Alta`, `Média` ou `Baixa`. As prioridades são uma proposta inicial
para o PO confirmar na revisão do ciclo N3.

> **Issues dos débitos.** Em 29/10/2026 foram criadas as issues #36 a #45 para os débitos que não
> tinham issue (label `debito-tecnico`, milestone N3). As issues #13 a #22, abertas antes, também receberam
> a label `debito-tecnico`. A #22 recebeu um comentário sugerindo reduzir o escopo ou fechá-la (ver TD-11).

## Resumo

| ID | Débito | Origem | Severidade | Prioridade | Issue |
|---|---|---|---|---|---|
| TD-01 | Revogação de token no logout | Escopo N2 | Alta (segurança) | **Máxima** | [#19](https://github.com/iagokoch/horangotango/issues/19) |
| TD-02 | `spring-security-crypto` 6.3.1 e senhas legadas > 72 bytes | PR #30 | Média (segurança) | **Máxima** | [#36](https://github.com/iagokoch/horangotango/issues/36) |
| TD-03 | FR-6: histórico de empréstimos de um Membro (Staff) | Escopo N2 | Alta | **Máxima** (bloqueia o frontend) | [#13](https://github.com/iagokoch/horangotango/issues/13) |
| TD-04 | FR-7: próprios empréstimos e `bloqueado` (Membro) | Escopo N2 | Alta | **Máxima** (bloqueia o frontend) | [#14](https://github.com/iagokoch/horangotango/issues/14) |
| TD-05 | FR-15: divergência de checklist na devolução | Escopo N2 | Alta | **Máxima** (integridade) | [#15](https://github.com/iagokoch/horangotango/issues/15) |
| TD-06 | FR-19: registro de perda/furto | Escopo N2 | Alta | **Máxima** (integridade, FR-18) | [#16](https://github.com/iagokoch/horangotango/issues/16) |
| TD-07 | Treinamento Prévio obrigatório | Escopo (PRD) | Média | Alta | [#17](https://github.com/iagokoch/horangotango/issues/17) |
| TD-08 | Multas automatizadas por atraso | Escopo (PRD) | Média | Média | [#18](https://github.com/iagokoch/horangotango/issues/18) |
| TD-09 | Metas de performance sem medição | NFR do PRD | Média | Média | [#20](https://github.com/iagokoch/horangotango/issues/20) |
| TD-10 | LGPD e minimização de dados pessoais | NFR do PRD | Média | Alta | [#21](https://github.com/iagokoch/horangotango/issues/21) |
| TD-11 | Rotas inexistentes respondem `401`/`403` em vez de `404` | Spring Security | Baixa | Baixa | [#22](https://github.com/iagokoch/horangotango/issues/22) |
| TD-12 | Erros de filtros fora do MVC fora do formato `ErrorResponse` | Arquitetura | Baixa | Baixa | [#37](https://github.com/iagokoch/horangotango/issues/37) |
| TD-13 | Valores-sentinela da migração de ferramentas | Changeset 3 | Baixa | Baixa | [#38](https://github.com/iagokoch/horangotango/issues/38) |
| TD-14 | Ausência de pipeline de CI | Processo | Média | Alta | [#39](https://github.com/iagokoch/horangotango/issues/39) |
| TD-15 | Commit `462a434` com mensagem fora do padrão | Processo | Baixa | Baixa | [#40](https://github.com/iagokoch/horangotango/issues/40) |
| TD-16 | Retirada pelo ID do membro (sem busca de membros) | Frontend | Média | **Máxima** (depende de endpoint do backend) | [#41](https://github.com/iagokoch/horangotango/issues/41) |
| TD-17 | Atrasos globais indisponíveis no painel | Frontend | Média | Alta | [#42](https://github.com/iagokoch/horangotango/issues/42) |
| TD-18 | Ferramenta emprestada sem vínculo com o empréstimo ativo | Frontend/API | Baixa | Média | [#43](https://github.com/iagokoch/horangotango/issues/43) |
| TD-19 | Lista "acompanhados" só em `localStorage` | Frontend | Média | Alta (some com TD-03/TD-04) | [#13](https://github.com/iagokoch/horangotango/issues/13), [#14](https://github.com/iagokoch/horangotango/issues/14) |
| TD-20 | Lacunas de verificação (E2E manual, Docker, dispositivos) | Frontend | Baixa | Baixa | [#44](https://github.com/iagokoch/horangotango/issues/44) |
| TD-21 | Coerência do modelo garantida só pela aplicação (sem FK/CHECK) | DER | Baixa | Baixa | [#45](https://github.com/iagokoch/horangotango/issues/45) |

## Detalhamento

### TD-01 — Revogação de token no logout · [#19](https://github.com/iagokoch/horangotango/issues/19)

- **Descrição:** `POST /api/auth/logout` responde `204`, mas o servidor não invalida o JWT; o token
  continua válido até `exp` (padrão 8 h, `JWT_EXPIRATION`).
- **Origem:** decisão de escopo da N2 (JWT stateless).
- **Impacto:** token copiado ou vazado segue utilizável após o logout. O frontend descarta o cookie
  `httpOnly`, o que reduz mas não elimina o risco.
- **Sugestão:** denylist de tokens (por `jti` ou id de usuário + instante) ou tokens de vida curta
  com refresh token.

### TD-02 — `spring-security-crypto` 6.3.1 e senhas legadas acima de 72 bytes

- **Descrição:** o BCrypt considera só os primeiros 72 bytes da senha. O PR #30 passou a limitar
  cadastro e bootstrap a 72 bytes UTF-8 e o encoder recusa entradas maiores, mitigando a
  equivalência por truncamento. A dependência `spring-security-crypto` **permanece em 6.3.1** e não
  há fluxo de redefinição para contas antigas.
- **Origem:** [changelog](../../backend/docs/changelog-v2.0.md#autenticação-e-autorização), PR #30 e issue #26.
- **Impacto:** contas legadas criadas com senha acima de 72 bytes continuam com a regra antiga de
  truncamento. Não há recuperação de senha.
- **Sugestão:** decidir o upgrade da dependência e a redefinição controlada dessas senhas; avaliar
  um fluxo de recuperação/troca de senha. O changelog trata os dois como "pendentes de decisão".

### TD-03 e TD-04 — FR-6 e FR-7 · [#13](https://github.com/iagokoch/horangotango/issues/13), [#14](https://github.com/iagokoch/horangotango/issues/14)

- **Descrição:** não existe listagem de empréstimos nem consulta de membro. Falta `GET /loans?memberId={id}`
  (FR-6, Staff) e `GET /members/{id}/loans` e `GET /members/{id}` com o campo derivado `bloqueado`
  (FR-7), devolvendo `403` quando um Membro consulta outro.
- **Origem:** reservados para a N3 desde o planejamento.
- **Impacto:** o frontend só abre empréstimos pelo código do comprovante (ver TD-16, TD-17 e TD-19).
  Também é pré-requisito do isolamento de dados de membros da LGPD (TD-10).
- **Sugestão:** começar pelo resource `loans` já criado, conforme
  [nomenclatura de recursos](../../backend/docs/api-nomenclatura-recursos.md) §3 e §4.

### TD-05 — FR-15: divergência de checklist · [#15](https://github.com/iagokoch/horangotango/issues/15)

- **Descrição:** `POST /loans/{id}/return` não aceita flag de divergência nem justificativa. A
  ferramenta sempre volta como `AVAILABLE`. O frontend mostra as diferenças só como alerta.
- **Origem:** reservado para a N3.
- **Impacto:** uma ferramenta danificada pode voltar ao catálogo como disponível (o Staff pode
  inativá-la manualmente em seguida). O status `UNDER_REPAIR` existe, mas nenhum fluxo o grava.
- **Sugestão:** flag + justificativa obrigatória na devolução, destino `UNDER_REPAIR`, e liberação
  posterior por Staff (diagrama de estados do README).

### TD-06 — FR-19: perda/furto · [#16](https://github.com/iagokoch/horangotango/issues/16)

- **Descrição:** falta `POST /loans/{id}/loss`: encerrar o empréstimo como `LOST`, marcar a
  ferramenta como `LOST` e liberar o bloqueio.
- **Origem:** reservado para a N3.
- **Impacto:** o bloqueio por inadimplência (FR-18) considera só devoluções; sem este fluxo, um
  membro com ferramenta perdida fica bloqueado sem saída.
- **Sugestão:** o FR-18 precisa passar a tratar `LOST` como resolução do atraso.

### TD-07 — Treinamento Prévio · [#17](https://github.com/iagokoch/horangotango/issues/17)

- **Descrição:** o PRD rotula o recurso como "N2", mas ele foi adiado para a N3 por decisão de
  escopo. Ver PRD §3, §7.2 e §11.
- **Impacto:** ferramentas perigosas podem ser retiradas sem treinamento.
- **Sugestão:** estender `tools` (marcar as que exigem treinamento), registrar treinamentos por
  Membro e acrescentar a verificação à regra do FR-12 em `POST /loans`. O desenho do resource ainda
  não foi decidido.

### TD-08 — Multas · [#18](https://github.com/iagokoch/horangotango/issues/18)

- **Descrição:** cálculo automatizado de multa por atraso (PRD §11, N3). Depende do atraso (FR-17),
  que já existe como valor derivado.
- **Sugestão:** a [justificativa técnica](../../backend/docs/api-justificativa-tecnica.md) (§5) cita
  `GET /loans/{id}/fine` apenas como exemplo do padrão.

### TD-09 — Performance · [#20](https://github.com/iagokoch/horangotango/issues/20)

- **Descrição:** nada mede as metas do PRD §5 (1 s para consulta de disponibilidade; 2 s para
  retirada e devolução).
- **Sugestão:** teste de carga com catálogo na casa das centenas de ferramentas.

### TD-10 — LGPD · [#21](https://github.com/iagokoch/horangotango/issues/21)

- **Descrição:** falta revisar minimização de dados de Membro, retenção e base legal (PRD §5).
- **Impacto:** a restrição de um Membro ver dados de outro depende do FR-7 (TD-04).

### TD-11 — Rota inexistente responde `401`/`403` · [#22](https://github.com/iagokoch/horangotango/issues/22)

- **Descrição:** o `SecurityConfig` decide antes de o Spring saber se a rota existe. Medido com a
  aplicação rodando (README da raiz): sob `/api/**`, com token válido e papel permitido, rota
  inexistente **já responde `404`**; fora de `/api` cai em `denyAll()` (`403` com token, `401` sem
  token); sob prefixos restritos por papel, o papel errado recebe `403` mesmo que a rota não exista
  (e Membro em `DELETE /api/tools/{id}` recebe `403`, não o `405` do Staff).
- **Impacto:** baixo; é a precedência normal do Spring Security (autorização antes do roteamento).
- **Sugestão:** mudança no `SecurityConfig`, se a equipe quiser; reavaliar se a issue ainda é
  necessária ou se vira "won't fix".

### TD-12 — Erros de filtros fora do `ErrorResponse`

- **Descrição:** o formato `ErrorResponse` vale para o Spring MVC (`GlobalExceptionHandler`) e para
  `401`/`403` do Spring Security. Uma exceção lançada em outro filtro do servlet sai pelo `/error`
  no formato padrão do Spring Boot (`timestamp`, `status`, `error`, `path`).
- **Impacto:** o frontend, que valida respostas por Zod, pode tratar essa resposta como contrato
  quebrado.
- **Sugestão:** `ErrorController` ou `ErrorAttributes` próprio para o `/error`.

### TD-13 — Valores-sentinela da migração

- **Descrição:** o changeset 3 preencheu ferramentas pré-existentes com `categoria = 'NAO_INFORMADA'`,
  `valor_estimado = 0.01` e `estado_conservacao = 'Não informado (migração)'`.
- **Impacto:** dados falsos no catálogo e em qualquer métrica de patrimônio, em bancos que tinham
  ferramentas da N1.
- **Sugestão:** Staff revisa essas linhas (consulta por categoria `NAO_INFORMADA`), ou um relatório
  de pendências de cadastro.

### TD-14 — Ausência de pipeline de CI

- **Descrição:** não há `.github/workflows` no repositório. Os totais de testes registrados são de
  execuções locais.
- **Origem:** o Acordo (seção 6.3) atribui ao DevOps a configuração do GitHub Actions para rodar
  `./mvnw test` e `npm run validate` em todo PR para a `main`; hoje o autor informa o resultado
  local na descrição do PR.
- **Impacto:** nada impede um merge com testes quebrados; a regra de integração do Acordo depende de
  disciplina manual.
- **Sugestão:** dois jobs (JDK 21 com Docker para Testcontainers; Node 20 para o frontend).

### TD-15 — Commit `462a434` com mensagem malformada

- **Descrição:** a mensagem do commit `462a434` é literalmente
  `git commit -m "feat(frontend): redesign completo e validacao funcional"`, ou seja, inclui o comando.
- **Origem:** PR #35.
- **Impacto:** cosmético: quebra o padrão de Conventional Commits do Acordo (seção 6.2) e polui o
  histórico/changelog.
- **Decisão:** **não corrigir.** O histórico não é reescrito (a `main` é compartilhada). Fica apenas
  registrado; um `commitlint` no CI evitaria a repetição.

### TD-16 a TD-19 — Limitações do frontend

Do [README do frontend](../../frontend/README.md#limitações-conhecidas) e da seção 10 de
[`EVOLUCAO_FRONTEND.md`](../../frontend/docs/EVOLUCAO_FRONTEND.md). Nenhuma foi simulada no frontend.

| ID | Limitação | Depende de |
|---|---|---|
| TD-16 | A retirada exige o **ID do membro** (exibido em *Meu perfil* e no painel), pois não há busca de membros | Endpoint de consulta de membros |
| TD-17 | O painel não conta os atrasos de toda a oficina, só os acompanhados no dispositivo. O bloqueio continua sendo aplicado pela API em toda retirada | Endpoint de empréstimos em atraso |
| TD-18 | Ferramenta emprestada não mostra qual empréstimo a contém | Campo ou endpoint de empréstimo ativo por ferramenta |
| TD-19 | A lista "acompanhados neste dispositivo" guarda só IDs no `localStorage`, por usuário; não é um histórico | FR-6 e FR-7 (#13 e #14) |

A divergência só como alerta (FR-15) e a ausência da tela de perda (FR-19) estão em TD-05 e TD-06;
o logout stateless, em TD-01.

### TD-20 — Lacunas de verificação do frontend

Declaradas em `EVOLUCAO_FRONTEND.md` §9.6 como **não verificadas**: execução do frontend via Docker,
dispositivos móveis reais (o celular foi emulado no Edge), leitores de tela reais e auditoria
automatizada de contraste. O roteiro E2E de 94 passos exige backend, frontend e banco preparados à
mão (`frontend/e2e/README.md`) e não roda em CI.

### TD-21 — Coerência garantida só pela aplicação

Do [DER](../DER/README.md): `id_usuario_*` não têm FK; não há CHECK ligando
`data_hora_devolucao`/`id_staff_devolucao` ao `status`; que o tomador seja `MEMBER` é regra do
service. Risco baixo enquanto todo acesso passa pela API.

## Como atualizar este registro

1. Abra a issue (label `debito-tecnico`, milestone da entrega) com problema, impacto e ponto de partida.
2. Acrescente a linha na tabela de resumo e, se for relevante, o detalhamento.
3. Se o débito for uma pendência de produto, mantenha também o README da raiz ou o do frontend coerentes.
4. Ao liquidar, feche a issue com o PR e mova o item para uma seção "Liquidados" com a data.
