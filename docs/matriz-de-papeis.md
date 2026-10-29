# Matriz de Papéis e Histórico de Contribuições — N2

Equipe **checkflow**. O papel indica a responsabilidade principal e **não limita** quem fez o quê:
a coluna de atividades registra o que cada pessoa de fato entregou na N2. As evidências são links
para o repositório [iagokoch/horangotango](https://github.com/iagokoch/horangotango) (PRs, issues
e commits); onde não há commit, a atividade vem de relato da equipe e está marcada.

| Integrante | Papel | Principais atividades na N2 | Evidências |
|---|---|---|---|
| **William Vodzinsky** | Product Owner (PO) | _A confirmar pelo integrante._ Responsabilidade atribuída no Acordo: política de registro e priorização de débito técnico (seção 2) | Sem commits ou PRs no repositório. [Acordo de Manutenibilidade](acordo-manutenibilidade.docx), seção 2 |
| **João Francisco da Silva** ([@joaofsdev](https://github.com/joaofsdev)) | Desenvolvedor Frontend | Reconstrução do frontend integrado à API da N2 (BFF Next.js com cookie `httpOnly`, contratos tipados em Zod, tratamento de cada status HTTP) e redesign "Etiqueta & Bancada"; documentação da evolução do frontend; roteiro E2E de 94 passos e 44 testes Vitest; integração (merge) dos PRs #23 a #25 e #30 a #34; preenchimento do Acordo de Manutenibilidade | [PR #35](https://github.com/iagokoch/horangotango/pull/35) (commits `488120e`, `7d8115f`, `462a434`, `bede9e8`); [`frontend/README.md`](../frontend/README.md); [`EVOLUCAO_FRONTEND.md`](../frontend/docs/EVOLUCAO_FRONTEND.md); [`frontend/e2e/`](../frontend/e2e/README.md); merges em `git log --merges` (#23, #24, #25, #30, #31, #32, #33, #34); [Acordo](acordo-manutenibilidade.docx) |
| **Iago Koch** ([@iagokoch](https://github.com/iagokoch)) | Desenvolvedor Backend | Backend N2 completo: FR-1 e FR-2 (autenticação e papéis), FR-3 a FR-5 (ferramentas), FR-8 (prazo), FR-9 a FR-11 (retirada com checklist), FR-12, FR-17 e FR-18 (atraso e bloqueio), FR-13, FR-14 e FR-16 (devolução); correções de segurança e concorrência (CORS, JWT sem `exp`, BCrypt 72 bytes, código duplicado, consulta consistente, inteiros JSON); migrações Liquibase 1 a 7; coleção Postman e Swagger; changelog e roteiro de demonstração; README da raiz; abertura e organização das issues e milestones; merge do PR #35 | Issues [#1](https://github.com/iagokoch/horangotango/issues/1) a [#11](https://github.com/iagokoch/horangotango/issues/11), [#26](https://github.com/iagokoch/horangotango/issues/26) a [#29](https://github.com/iagokoch/horangotango/issues/29) (N2) e [#13](https://github.com/iagokoch/horangotango/issues/13) a [#22](https://github.com/iagokoch/horangotango/issues/22) (N3); PRs [#24](https://github.com/iagokoch/horangotango/pull/24), [#25](https://github.com/iagokoch/horangotango/pull/25), [#30](https://github.com/iagokoch/horangotango/pull/30), [#31](https://github.com/iagokoch/horangotango/pull/31), [#32](https://github.com/iagokoch/horangotango/pull/32), [#33](https://github.com/iagokoch/horangotango/pull/33), [#34](https://github.com/iagokoch/horangotango/pull/34); [`backend/docs/postman/`](../backend/docs/postman/); [changelog](../backend/docs/changelog-v2.0.md); [roteiro](../backend/docs/roteiro-demonstracao-n2.md); [README](../README.md); [changelog Liquibase](../backend/src/main/resources/db/changelog/db.changelog-master.sql) |
| **Patrick Gusmão** ([@patrickgusmao10](https://github.com/patrickgusmao10)) | Engenheiro de Requisitos | Engenharia de Requisitos da N2: Documento de Visão e Escopo, ERS, especificação detalhada dos casos de uso, diagramas UML (casos de uso, classes, estados, atividades de retirada e devolução), matriz de rastreabilidade e plano de continuidade (hoje substituído pelo [handoff](handoff/README.md)) | [PR #23](https://github.com/iagokoch/horangotango/pull/23) (commit `e648e29`, integrado por @joaofsdev); [`backend/docs/requisitos-n2/`](../backend/docs/requisitos-n2/README.md) |
| **Pedro Israel** | Quality Assurance (QA) | _A confirmar pelo integrante._ Responsabilidade atribuída no Acordo: estratégia de testabilidade e registro de bugs (seção 4) | Sem commits ou PRs no repositório. [Acordo](acordo-manutenibilidade.docx), seção 4 |
| **Caio Rosa** | DevOps | _A confirmar pelo integrante._ Responsabilidade atribuída no Acordo: versionamento, padronização de commits e pipeline de CI/CD (seção 6); o CI ainda não existe (ver [TD-14](debitos-tecnicos/README.md)) | Sem commits ou PRs no repositório. [Acordo](acordo-manutenibilidade.docx), seção 6 |

## Como os dados foram obtidos

- Autoria de commits: `git log` da `main` (50 commits com autoria de Iago, incluindo o merge do #35; 4 commits de
  João, mais 8 merge commits que ele fez; 1 de Patrick). Os merges de #23 a #34 foram feitos por João e o de #35, por Iago (autoria dos
  *merge commits*).
- Autoria de PRs e issues: API pública do GitHub. Revisões e comentários de PR **não** foram
  conferidos nesta matriz.
- Os merges de #23 a #34 por João e o de #35 por Iago constam no GitHub; **não há revisões
  formais (reviews) registradas** nesses PRs.
- William, Pedro e Caio não têm commits nem PRs. Suas linhas citam apenas a responsabilidade que o
  Acordo atribui ao papel, que **não** é registro de atividade realizada; a coluna de atividades
  deve ser completada por eles com evidências verificáveis.

Relacionados: [Acordo de Manutenibilidade](acordo-manutenibilidade.docx) (papéis na seção 1),
[handoff](handoff/README.md) e [débitos técnicos](debitos-tecnicos/README.md).
