---
title: Monitoolring
status: final
created: 2026-08-16
updated: 2026-08-16
---

# PRD: Monitoolring
*Working title — confirm.*

## 0. Document Purpose

Este PRD serve de referência para quem vai projetar (arquitetura/UX) e construir o Monitoolring — sistema de empréstimo de ferramentas para uma oficina compartilhada (makerspace) tratado com o rigor de um produto real, ainda que nasça como projeto de faculdade. O documento está organizado em: Glossário (vocabulário canônico usado literalmente no resto do texto), Funcionalidades com Requisitos Funcionais (FR) numerados globalmente e um resumo da evolução futura pós-MVP. Suposições feitas sem confirmação direta do usuário aparecem como `[ASSUMPTION]` inline e estão listadas na §10.

## 1. Vision

O Monitoolring é o sistema de controle de empréstimo de ferramentas de uma oficina compartilhada (makerspace). Ele resolve um problema concreto e recorrente desse tipo de espaço: ferramentas de alto valor somem, voltam quebradas sem que se saiba quem foi o responsável, ou ficam emprestadas além do prazo combinado — tudo isso corroendo a confiança e o patrimônio coletivo da oficina.

O sistema formaliza o ciclo de vida do empréstimo — cadastro de ferramentas e membros, retirada, devolução — com um checklist de estado de conservação registrado nos dois extremos do empréstimo, criando um rastro de responsabilidade que hoje não existe (ou existe apenas informalmente, em papel ou na memória de quem está no balcão). A regra mais importante do sistema é simples e não negociável: quem está em atraso com uma ferramenta não pode pegar outra emprestada — isso fecha o ciclo vicioso de acúmulo de atrasos. O sistema também cobre o caso em que uma Ferramenta simplesmente não volta — perdida ou furtada — para que esse cenário não deixe o Empréstimo e o Membro presos indefinidamente.

O MVP (N1) entrega esse ciclo completo. Evoluções futuras (N2/N3) adicionam controle de treinamento prévio obrigatório para ferramentas mais perigosas/complexas e cálculo automatizado de multas por atraso — mas essas são extensões da mesma espinha dorsal, não mudanças de direção.

## 2. Target User

### 2.1 Jobs To Be Done

**Membro (quem pega ferramentas emprestadas):**
- Quero ver rapidamente se a ferramenta que preciso está disponível, sem precisar perguntar a alguém.
- Quero um registro claro do estado em que recebi a ferramenta, para não ser responsabilizado por um dano que já existia antes de mim.
- Quero saber exatamente até quando preciso devolver, para não perder o direito de pegar outra ferramenta emprestada.

**Responsável da Oficina / Staff (quem opera o sistema no balcão):**
- Quero saber, a qualquer momento, quem está com cada ferramenta e desde quando.
- Quero que o sistema recuse automaticamente novas retiradas de quem está em atraso, sem depender da minha memória ou de checar manualmente uma planilha.
- Quero um registro de estado de conservação (entrega e devolução) que sirva de evidência objetiva caso a ferramenta volte danificada.

### 2.2 Non-Users (v1)

- Público externo não cadastrado como membro da oficina.

### 2.3 Key User Journeys

- **UJ-1. Marcos retira uma furadeira para o fim de semana.**
  - **Persona + contexto:** Marcos, membro cadastrado da oficina, sem empréstimos em atraso, precisa de uma furadeira de impacto para um projeto pessoal.
  - **Entry state:** autenticado no sistema (via app/web), na tela de catálogo de ferramentas.
  - **Path:** busca "furadeira", vê que uma unidade está disponível, seleciona "retirar"; o staff no balcão confere a ferramenta com ele e preenche o checklist de conservação (riscos, funcionamento, acessórios) na tela; Marcos confirma que concorda com o checklist registrado.
  - **Climax:** o sistema confirma a retirada, define automaticamente o prazo de devolução (com base no prazo padrão configurado) e marca a furadeira como indisponível para outros membros.
  - **Resolution:** Marcos sai com a ferramenta e um comprovante do estado registrado na entrega; a qualquer momento ele pode entrar no sistema e consultar o prazo de devolução do próprio empréstimo; a ferramenta some da lista de disponíveis para os demais membros.

- **UJ-2. Renata tenta pegar uma ferramenta emprestada, mas está em atraso com outra.**
  - **Persona + contexto:** Renata, membro cadastrada, está com uma serra tico-tico há mais dias do que o prazo combinado, ainda não devolvida.
  - **Entry state:** autenticada, tenta retirar uma ferramenta diferente da que está em atraso.
  - **Path:** seleciona a ferramenta desejada e clica em "retirar".
  - **Climax:** o sistema bloqueia a operação e exibe explicitamente qual empréstimo está em atraso e desde quando, em vez de uma mensagem genérica de erro.
  - **Resolution:** Renata não consegue novo empréstimo até devolver a ferramenta em atraso; o bloqueio é removido automaticamente assim que a devolução for registrada.

- **UJ-3. Bruno, responsável da oficina, registra a devolução da furadeira do Marcos.**
  - **Persona + contexto:** Bruno, Staff no balcão, Marcos devolvendo a furadeira dentro do prazo.
  - **Entry state:** Bruno autenticado, na tela do empréstimo ativo de Marcos.
  - **Path:** abre o empréstimo ativo, preenche o checklist de conservação na devolução; o sistema exibe lado a lado o checklist da retirada para comparação.
  - **Climax:** Bruno confirma a devolução; se houver divergência relevante entre os dois checklists (ex.: dano novo), ele a sinaliza com uma justificativa e isso fica registrado no histórico do empréstimo.
  - **Resolution:** sem divergência, a ferramenta volta a aparecer como disponível no catálogo; com divergência sinalizada, ela vai para "em reparo/inspeção". De qualquer forma, o histórico de Marcos é atualizado com o empréstimo concluído.

## 3. Glossário

- **Membro** — pessoa cadastrada na oficina, com conta própria no sistema, que pode retirar Ferramentas emprestadas.
- **Responsável da Oficina (Staff)** — pessoa que opera o sistema no balcão da oficina: confere o Checklist de Conservação, confirma Retiradas e Devoluções, gerencia o cadastro de Ferramentas e Membros. Não há papel de "admin" separado no MVP — Staff acumula essa função.
- **Ferramenta** — item de equipamento de alto valor cadastrado individualmente no sistema, com identificador único, categoria e status de disponibilidade. Status possíveis: disponível, emprestada, em reparo/inspeção, perdida, inativa.
- **Empréstimo** — o período que começa na Retirada e termina na Devolução (ou no registro de Perda) de uma Ferramenta por um Membro; tem um Prazo de Devolução associado.
- **Retirada** — ato de um Membro levar uma Ferramenta emprestada, registrado no sistema, condicionado ao preenchimento do Checklist de Conservação.
- **Devolução** — ato de um Membro devolver uma Ferramenta previamente retirada, registrado no sistema, também condicionado ao preenchimento do Checklist de Conservação.
- **Checklist de Conservação** — formulário estruturado preenchido no momento da Retirada e da Devolução, registrando o estado físico e funcional da Ferramenta naquele instante. Contém, no mínimo: estado funcional (íntegro / com defeito), avarias visíveis (texto livre) e acessórios inclusos (lista); campos vazios não contam como preenchimento válido.
- **Prazo de Devolução** — data-limite para a Devolução de um Empréstimo, calculada a partir de um prazo padrão (em dias) configurado por Staff, aplicado no momento da Retirada.
- **Atraso** — situação em que um Empréstimo ultrapassa o Prazo de Devolução sem que a Devolução (ou o registro de Perda) tenha sido feito.
- **Bloqueio por Inadimplência** — restrição automática aplicada a um Membro com pelo menos um Empréstimo em Atraso, impedindo qualquer nova Retirada até a regularização.
- **Perda** — encerramento de um Empréstimo sem devolução física da Ferramenta, por ela ter sido perdida, furtada ou destruída.
- **Treinamento Prévio** *(N2)* — capacitação obrigatória exigida para algumas Ferramentas antes que um Membro possa retirá-las.
- **Multa** *(N3)* — valor financeiro calculado automaticamente, proporcional aos dias de Atraso de um Empréstimo.

## 4. Funcionalidades

### 4.1 Autenticação e Gestão de Contas

**Descrição:** Todo acesso ao sistema — de Membro ou de Staff — exige conta própria e login. Não há operação de escrita (retirada, devolução, cadastro) sem sessão autenticada. Contas são criadas dentro do próprio sistema; não há integração com SSO institucional.

**Requisitos Funcionais:**

#### FR-1: Cadastro e login de Membro

Um visitante pode se cadastrar como Membro e, em seguida, autenticar-se no sistema.

**Consequences (testable):**
- Cadastro exige nome, e-mail/identificador único e senha; senha é armazenada com hash, nunca em texto plano.
- Tentativa de login com credenciais inválidas é recusada e não revela se o e-mail existe.
- Membro autenticado permanece em sessão até logout ou expiração.

#### FR-2: Cadastro e login de Responsável da Oficina (Staff)

Um Staff pode ser cadastrado (por outro Staff) e autenticar-se no sistema com permissões de escrita administrativa (cadastro de ferramentas, confirmação de Retiradas/Devoluções).

**Consequences (testable):**
- Conta de Staff é distinta de conta de Membro; uma ação de confirmação de Retirada/Devolução só pode ser feita por sessão de Staff autenticada.
- Não é possível se autocadastrar como Staff pela tela pública de cadastro de Membro.
- A primeira conta de Staff do sistema é criada por um processo de configuração inicial (setup/seed), fora do fluxo normal de "Staff cadastra Staff" — o sistema nunca pode ficar sem nenhum Staff cadastrado.

### 4.2 Cadastro de Ferramentas

**Descrição:** Staff mantém o catálogo de Ferramentas disponíveis na oficina, cada uma com identificador único e status de disponibilidade visível a todos os Membros.

**Requisitos Funcionais:**

#### FR-3: Cadastro de Ferramenta

Staff pode cadastrar uma nova Ferramenta com nome, categoria, valor estimado, identificador único e estado de conservação inicial.

**Consequences (testable):**
- Ferramenta cadastrada aparece imediatamente no catálogo com status "disponível".
- Duas Ferramentas não podem compartilhar o mesmo identificador único.
- Valor estimado é numérico, em reais (R$), maior que zero.

#### FR-4: Edição e inativação de Ferramenta

Staff pode editar os dados de uma Ferramenta existente e marcá-la como inativa (fora de uso/circulação).

**Consequences (testable):**
- Ferramenta inativa não aparece como disponível para Retirada, mesmo que não esteja emprestada.
- Ferramenta com Empréstimo ativo não pode ser inativada até a Devolução (ou o registro de Perda, FR-19) ser feito.

#### FR-5: Consulta de disponibilidade

Qualquer Membro autenticado pode consultar o catálogo de Ferramentas e ver, para cada uma, se está disponível ou emprestada.

**Consequences (testable):**
- Status exibido reflete o estado real no momento da consulta (sem cache desatualizado perceptível ao usuário).

### 4.3 Cadastro de Membros

**Descrição:** Além do autocadastro (FR-1), Staff mantém visibilidade sobre os Membros e seu histórico de Empréstimos; o próprio Membro também pode consultar seus dados.

**Requisitos Funcionais:**

#### FR-6: Consulta de histórico de Membro (Staff)

Staff pode consultar o histórico completo de Empréstimos de um Membro (ativos, concluídos, em atraso, perdidos).

**Consequences (testable):**
- Histórico lista, por Empréstimo, a Ferramenta, datas de Retirada/Devolução, Prazo e se houve Atraso ou Perda.

#### FR-7: Consulta dos próprios Empréstimos (Membro)

Membro pode consultar, a qualquer momento, seus próprios Empréstimos ativos e o Prazo de Devolução de cada um. Realiza UJ-1.

**Consequences (testable):**
- Membro autenticado vê, para cada Empréstimo ativo, a Ferramenta, a data de Retirada e o Prazo de Devolução.
- Membro não consegue consultar Empréstimos ou dados pessoais de outro Membro por essa tela.

### 4.4 Retirada de Ferramenta (Empréstimo)

**Descrição:** Fluxo central do sistema — um Membro só sai da oficina com uma Ferramenta depois que Retirada, Checklist de Conservação e Prazo de Devolução são registrados. Realiza UJ-1.

**Requisitos Funcionais:**

#### FR-8: Configuração do prazo padrão de devolução

O sistema mantém um único prazo padrão de devolução (em dias corridos), configurado por Staff, aplicado a toda Retirada confirmada.

**Consequences (testable):**
- O sistema não permite confirmar nenhuma Retirada (FR-11) enquanto o prazo padrão não estiver configurado por Staff.
- Staff pode alterar o prazo padrão a qualquer momento; a alteração só vale para novas Retiradas — Empréstimos já confirmados mantêm o prazo vigente no momento da própria Retirada.
- O prazo é o mesmo para todas as Ferramentas no MVP — não há prazo diferenciado por Ferramenta ou categoria (ver §7.2, Out of Scope).

#### FR-9: Solicitação de Retirada

Membro pode solicitar a Retirada de uma Ferramenta disponível. Realiza UJ-1.

**Consequences (testable):**
- Solicitação para Ferramenta indisponível (emprestada, em reparo/inspeção, perdida ou inativa) é recusada com mensagem explícita do motivo.

#### FR-10: Checklist de Conservação na Retirada

O sistema exige o preenchimento do Checklist de Conservação por Staff antes de confirmar qualquer Retirada. Realiza UJ-1.

**Consequences (testable):**
- Retirada não pode ser confirmada com Checklist de Conservação em branco, isto é, sem que os campos mínimos definidos no Glossário estejam preenchidos.
- Checklist preenchido fica associado permanentemente a esse Empréstimo específico.

#### FR-11: Confirmação de Retirada e prazo de devolução

Ao confirmar a Retirada, o sistema registra a data/hora de início do Empréstimo e calcula o Prazo de Devolução com base no prazo padrão configurado (FR-8).

**Consequences (testable):**
- Ferramenta muda de status para "emprestada" imediatamente após confirmação.
- Prazo de Devolução fica visível ao Membro (FR-7) e ao Staff a partir da confirmação.

#### FR-12: Bloqueio de Retirada por Inadimplência (RN Crítica)

O sistema impede qualquer nova Retirada para um Membro que tenha pelo menos um Empréstimo em Atraso, independentemente da Ferramenta solicitada. Realiza UJ-2.

**Consequences (testable):**
- Tentativa de Retirada por Membro em Atraso é recusada antes de chegar à etapa de Checklist.
- Mensagem de recusa identifica qual(is) Empréstimo(s) está(ão) em Atraso e desde quando.
- Bloqueio se aplica mesmo que o Empréstimo em Atraso seja de uma Ferramenta diferente da solicitada.

**Out of Scope:**
- Cálculo de multa pelo Atraso — ver §11 (N3).

### 4.5 Devolução de Ferramenta

**Descrição:** Encerra o Empréstimo, libera a Ferramenta para outros Membros e remove o Bloqueio por Inadimplência caso esse fosse o único Empréstimo em Atraso do Membro. Realiza UJ-3. O documento-fonte original menciona checklist apenas "na entrega"; este PRD estende deliberadamente o registro também à Devolução, permitindo a comparação necessária para apurar divergências (FR-15) — extensão consciente do escopo original, não uma mudança de direção acidental.

**Requisitos Funcionais:**

#### FR-13: Registro de Devolução

Staff pode registrar a Devolução de uma Ferramenta com Empréstimo ativo. Realiza UJ-3.

**Consequences (testable):**
- Devolução só pode ser registrada para um Empréstimo ativo existente (não é possível devolver algo nunca retirado).

#### FR-14: Checklist de Conservação na Devolução

O sistema exige o preenchimento do Checklist de Conservação na Devolução, exibido lado a lado com o Checklist de Conservação na Retirada do mesmo Empréstimo. Realiza UJ-3.

**Consequences (testable):**
- Devolução não pode ser confirmada com Checklist de Conservação em branco, isto é, sem que os campos mínimos definidos no Glossário estejam preenchidos.
- Os dois Checklists (Retirada e Devolução) do mesmo Empréstimo ficam permanentemente vinculados e consultáveis.

#### FR-15: Fluxo de decisão em divergência de Checklist

Ao comparar o Checklist de Conservação na Devolução com o Checklist de Conservação na Retirada do mesmo Empréstimo (FR-14), Staff pode sinalizar uma divergência relevante (ex.: dano novo) e, nesse caso, retirar a Ferramenta de circulação em vez de devolvê-la ao catálogo de disponíveis. Realiza UJ-3.

**Consequences (testable):**
- O que conta como "divergência relevante" é um julgamento de Staff, não uma regra automática — mas toda sinalização exige uma justificativa em texto livre, que fica registrada para auditoria.
- Sinalizar divergência muda o status da Ferramenta para "em reparo/inspeção" (FR-16), não "disponível".
- A divergência sinalizada fica registrada vinculada ao Empréstimo e ao Membro responsável, consultável no histórico (FR-6).
- Staff pode, posteriormente, reativar manualmente a Ferramenta como "disponível" ou marcá-la como "inativa" (FR-4) — essa decisão final de destino fica fora deste FR.

#### FR-16: Atualização de disponibilidade pós-Devolução

Ao confirmar a Devolução, o sistema marca a Ferramenta como "disponível" novamente — exceto quando Staff sinalizar divergência relevante no Checklist de Conservação na Devolução (FR-15), caso em que a Ferramenta é marcada como "em reparo/inspeção" em vez de "disponível".

**Consequences (testable):**
- Ferramenta sem divergência sinalizada aparece disponível no catálogo (FR-5) imediatamente após confirmação da Devolução.
- Ferramenta com divergência sinalizada (FR-15) não aparece como disponível até Staff resolver manualmente o status.

#### FR-17: Marcação automática de Atraso

O sistema marca automaticamente um Empréstimo como "em atraso" assim que a data atual ultrapassa o Prazo de Devolução sem Devolução (ou registro de Perda, FR-19) feito — sem exigir ação manual de Staff.

**Consequences (testable):**
- Um Empréstimo que passa do prazo muda de status automaticamente, sem necessidade de Staff abrir o registro.
- O status de Atraso é recalculado em tempo real a cada tentativa de Retirada (FR-12) e a cada consulta de histórico (FR-6, FR-7) — o sistema não depende de um job assíncrono em background para refletir o Atraso; uma Retirada não pode ser confirmada com base em um status de Atraso desatualizado.
- Mudança de status para "em atraso" ativa o Bloqueio por Inadimplência (FR-12) do Membro correspondente.

### 4.6 Liberação do Bloqueio por Inadimplência

**Descrição:** Fecha o ciclo da RN Crítica — o Bloqueio não é permanente, só dura enquanto houver pendência real.

**Requisitos Funcionais:**

#### FR-18: Liberação automática de Bloqueio

O sistema libera automaticamente o Bloqueio por Inadimplência de um Membro assim que todos os seus Empréstimos em Atraso forem devolvidos (FR-13) ou registrados como Perda (FR-19).

**Consequences (testable):**
- Membro com um Empréstimo em Atraso devolvido e nenhum outro em Atraso consegue solicitar nova Retirada imediatamente após a Devolução ser confirmada.
- Membro com dois Empréstimos em Atraso continua bloqueado até resolver ambos (devolução ou perda).
- A verificação de Atraso (FR-17) e esta liberação devem refletir o estado real no momento da tentativa de Retirada — não podem depender de um job assíncrono com atraso perceptível ao usuário.

### 4.7 Perda ou Furto de Ferramenta

**Descrição:** Cobre o caso em que uma Ferramenta emprestada não pode ser devolvida fisicamente — perdida, furtada ou destruída. Sem esse fluxo, o Empréstimo ficaria preso indefinidamente e o Membro permaneceria bloqueado (FR-12) para sempre, mesmo depois de a oficina já ter decidido encerrar o caso. Esse cenário está descrito no problema original ("ferramentas somem") e recebe aqui o mesmo nível de tratamento que Atraso e dano identificado pelo Checklist.

**Requisitos Funcionais:**

#### FR-19: Registro de Perda de Ferramenta

Staff pode registrar uma Ferramenta com Empréstimo ativo como Perda, encerrando o Empréstimo sem exigir o Checklist de Conservação de Devolução (FR-14).

**Consequences (testable):**
- Ferramenta muda de status para "perdida" (não "disponível", não "emprestada") e some do catálogo de disponíveis (FR-5).
- O Empréstimo correspondente é encerrado com status "Perda registrada", distinto de uma Devolução normal, e permanece consultável no histórico do Membro (FR-6, FR-7).
- Encerrar o Empréstimo por Perda libera o Bloqueio por Inadimplência (FR-18) do Membro caso esse fosse o único Empréstimo em Atraso — a Perda não deixa o Membro bloqueado indefinidamente.
- Ferramenta "perdida" não volta a "disponível" automaticamente; só Staff pode reverter manualmente (ex.: ferramenta recuperada) ou mantê-la assim permanentemente.

**Out of Scope:**
- Qualquer processo de responsabilização financeira do Membro pela Perda (cobrança, reembolso) — ver §7.2 Out of Scope for MVP.

## 5. Cross-Cutting NFRs

- **Escala:** o sistema deve suportar centenas de Ferramentas e centenas de Membros cadastrados, sem degradação perceptível de desempenho nas operações de consulta (FR-5) e de Retirada/Devolução.
- **Consistência de disponibilidade:** o status de disponibilidade de uma Ferramenta (FR-5) deve refletir alterações de Retirada/Devolução em tempo real, mesmo com múltiplos terminais de Staff operando simultaneamente — duas Retiradas simultâneas da mesma Ferramenta não podem ambas ser confirmadas.
- **Integridade e auditoria:** todo registro de Retirada, Devolução, Perda e Checklist de Conservação é imutável após confirmado (correções exigem novo registro, não edição silenciosa), com timestamp e Staff responsável.
- **Segurança de acesso:** autenticação obrigatória para qualquer operação de escrita (§4.1); senhas com hash; nenhuma rota de escrita acessível sem sessão válida.
- **Performance (metas quantitativas):** consulta de disponibilidade (FR-5) responde em até 1s sob carga normal (catálogo na ordem de centenas de Ferramentas); confirmação de Retirada ou Devolução (FR-11, FR-13) completa em até 2s do clique à confirmação.
- **Privacidade e LGPD:** dados pessoais de Membro (nome, e-mail/contato) são coletados apenas os necessários ao cadastro (minimização); acesso a dados pessoais de outros Membros é restrito a sessões de Staff autenticadas — um Membro não pode consultar dados pessoais de outro Membro (FR-7); tratamento de dados segue a LGPD (Lei 13.709/2018) enquanto lei aplicável.
- **Acessibilidade:** interface web atende no mínimo WCAG 2.1 nível AA nos fluxos críticos (cadastro, retirada, devolução, checklist).

## 6. Non-Goals (Explicit)

- O Monitoolring não é um sistema de e-commerce, aluguel comercial ou venda de ferramentas.
- Não gerencia estoque de consumíveis (parafusos, lixas, EPIs descartáveis) — apenas Ferramentas de alto valor cadastradas individualmente.
- Não processa pagamentos online no MVP (mesmo quando Multas existirem em N3, o registro do valor devido não implica cobrança automatizada integrada a gateway de pagamento, salvo decisão futura explícita).
- Não substitui o inventário patrimonial completo da instituição — cobre apenas o ciclo de empréstimo, não avaliação contábil de ativos.

## 7. MVP Scope

### 7.1 In Scope

- Cadastro e login de Membro e de Staff (FR-1, FR-2).
- Cadastro, edição e inativação de Ferramentas, com disponibilidade em tempo real (FR-3 a FR-5).
- Consulta de histórico de Membro por Staff e consulta dos próprios Empréstimos pelo Membro (FR-6, FR-7).
- Configuração do prazo padrão de devolução (FR-8).
- Retirada de Ferramenta com Checklist de Conservação obrigatório e Prazo de Devolução (FR-9 a FR-11).
- Bloqueio de Retirada por Inadimplência — a RN Crítica (FR-12).
- Devolução de Ferramenta com Checklist de Conservação comparativo, incluindo o fluxo de decisão em caso de divergência (FR-13 a FR-16).
- Marcação automática de Atraso e liberação automática de Bloqueio (FR-17, FR-18).
- Registro de Perda/furto de Ferramenta, com liberação do Bloqueio associado (FR-19).

### 7.2 Out of Scope for MVP

- **Bloqueio por Treinamento Prévio (N2)** — deferido; ver §11.
- **Cálculo automatizado de Multas (N3)** — deferido; ver §11.
- Notificações automáticas (e-mail/push) de proximidade de prazo ou de Atraso — confirmado fora do MVP.
- Prazo de Devolução diferenciado por Ferramenta ou categoria — MVP usa um único prazo global (FR-8); diferenciação fica para evolução futura.
- Relatórios/dashboards analíticos (ex.: ferramentas mais usadas, membros mais inadimplentes) além da consulta simples de histórico (FR-6, FR-7).
- Integração com SSO institucional — confirmado que não haverá; contas nascem exclusivamente dentro do Monitoolring (§4.1).
- Processo de responsabilização financeira por Ferramenta perdida/furtada (cobrança, reembolso) — apenas o registro da Perda é coberto (FR-19).

## 8. Success Metrics

**Primary**
- **SM-1**: Cobertura de rastreabilidade — 100% das Retiradas confirmadas possuem Membro identificado e Checklist de Conservação preenchido. Valida FR-9, FR-10.
- **SM-2**: Eficácia do bloqueio — 100% das tentativas de Retirada por Membro com Empréstimo em Atraso são recusadas pelo sistema. Valida FR-12.

**Secondary**
- **SM-3**: Redução do atraso médio de devolução, comparando o período anterior (controle manual/planilha) com o período após adoção do sistema. `[ASSUMPTION: métrica de acompanhamento pós-lançamento, não validável apenas com testes do sistema em si.]` Valida FR-17, FR-18.

**Counter-metrics (do not optimize)**
- **SM-C1**: Volume de Retiradas concluídas não deve ser otimizado às custas de afrouxar o Bloqueio por Inadimplência — um Bloqueio correto que reduz o número de empréstimos é um resultado desejável, não um problema a corrigir. Contrabalança SM-2.

## 9. Open Questions

Nenhuma pendência aberta.

## 10. Assumptions Index

- §8 (SM-3) — Métrica de redução de atraso é de acompanhamento pós-lançamento, não testável apenas dentro do ciclo de desenvolvimento do MVP.

---

## 11. Evolução Futura (N2/N3)

*Resumido por decisão do usuário — sem FRs numerados nesta rodada; a detalhar quando esses níveis entrarem em escopo ativo.*

### N2 — Bloqueio por Treinamento Prévio

Algumas Ferramentas (tipicamente as mais complexas ou perigosas — serras de mesa, equipamentos elétricos de maior risco) passam a exigir que o Membro tenha completado um Treinamento Prévio específico daquela Ferramenta antes de poder retirá-la. Em alto nível, isso implica:
- Marcar quais Ferramentas exigem Treinamento Prévio (extensão do cadastro de Ferramentas, §4.2).
- Registrar quais Membros completaram qual Treinamento Prévio.
- Estender o Bloqueio por Inadimplência (FR-12) para também recusar Retiradas de Ferramentas que exigem Treinamento não concluído pelo Membro.

### N3 — Cálculo Automatizado de Multas

Quando um Empréstimo fica em Atraso (FR-17), o sistema passa a calcular automaticamente um valor de Multa proporcional aos dias de Atraso. Em alto nível, isso implica:
- Definir uma regra de valor por dia de Atraso (fixa, por Ferramenta ou por categoria — a decidir quando este nível entrar em escopo).
- Acumular a Multa enquanto o Empréstimo permanecer em Atraso, até a Devolução.
- Exibir a Multa devida ao Membro e ao Staff; a cobrança efetiva (se houver) é explicitamente fora de escopo deste PRD (ver §7.2 Out of Scope for MVP).
