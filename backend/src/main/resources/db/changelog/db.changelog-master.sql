--liquibase formatted sql

--changeset monitoolring:1-create-table-ferramentas
CREATE TABLE ferramentas (
    id                    VARCHAR(38)  NOT NULL,
    codigo                VARCHAR(18)  NOT NULL,
    nome                  VARCHAR(255) NOT NULL,
    quantidade            INTEGER      NOT NULL,
    id_usuario_criacao    VARCHAR(38)  NOT NULL,
    data_hora_criacao     TIMESTAMP    NOT NULL,
    id_usuario_alteracao  VARCHAR(38)  NOT NULL,
    data_hora_alteracao   TIMESTAMP    NOT NULL,
    versao                INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT pk_ferramentas PRIMARY KEY (id),
    CONSTRAINT uq_ferramentas_codigo UNIQUE (codigo),
    CONSTRAINT ck_ferramentas_quantidade CHECK (quantidade >= 0)
);
--rollback DROP TABLE ferramentas;

--changeset monitoolring:2-create-table-usuarios
--comment: Contas de Membro e Staff (FR-1, FR-2). email sempre gravado normalizado em minusculas (aplicacao + CHECK). id_usuario_criacao = proprio id no autocadastro e no bootstrap do primeiro Staff; id do Staff criador quando um Staff cadastra outro.
CREATE TABLE usuarios (
    id                    VARCHAR(38)  NOT NULL,
    nome                  VARCHAR(255) NOT NULL,
    email                 VARCHAR(255) NOT NULL,
    senha_hash            VARCHAR(100) NOT NULL,
    papel                 VARCHAR(20)  NOT NULL,
    id_usuario_criacao    VARCHAR(38)  NOT NULL,
    data_hora_criacao     TIMESTAMP    NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT ck_usuarios_email_minusculo CHECK (email = LOWER(email)),
    CONSTRAINT ck_usuarios_papel CHECK (papel IN ('MEMBER', 'STAFF'))
);
--rollback DROP TABLE usuarios;

--changeset monitoolring:3-ferramentas-modelo-prd
--comment: Ferramenta conforme o PRD (FR-3/FR-4/FR-5): adiciona categoria, valor_estimado (> 0), estado_conservacao e status (5 valores, padrao AVAILABLE); remove quantidade (cada Ferramenta e um item individual). Linhas ja existentes recebem valores-sentinela no backfill: categoria = 'NAO_INFORMADA', valor_estimado = 0.01 (menor valor aceito pelo CHECK > 0), estado_conservacao = 'Não informado (migração)', status = 'AVAILABLE'. Staff deve revisar essas ferramentas.
ALTER TABLE ferramentas ADD COLUMN categoria VARCHAR(100);
ALTER TABLE ferramentas ADD COLUMN valor_estimado NUMERIC(12,2);
ALTER TABLE ferramentas ADD COLUMN estado_conservacao VARCHAR(1000);
ALTER TABLE ferramentas ADD COLUMN status VARCHAR(20) DEFAULT 'AVAILABLE';
UPDATE ferramentas SET categoria = 'NAO_INFORMADA' WHERE categoria IS NULL;
UPDATE ferramentas SET valor_estimado = 0.01 WHERE valor_estimado IS NULL;
UPDATE ferramentas SET estado_conservacao = 'Não informado (migração)' WHERE estado_conservacao IS NULL;
UPDATE ferramentas SET status = 'AVAILABLE' WHERE status IS NULL;
ALTER TABLE ferramentas ALTER COLUMN categoria SET NOT NULL;
ALTER TABLE ferramentas ALTER COLUMN valor_estimado SET NOT NULL;
ALTER TABLE ferramentas ALTER COLUMN estado_conservacao SET NOT NULL;
ALTER TABLE ferramentas ALTER COLUMN status SET NOT NULL;
ALTER TABLE ferramentas ADD CONSTRAINT ck_ferramentas_valor_estimado CHECK (valor_estimado > 0);
ALTER TABLE ferramentas ADD CONSTRAINT ck_ferramentas_status CHECK (status IN ('AVAILABLE', 'ON_LOAN', 'UNDER_REPAIR', 'LOST', 'INACTIVE'));
ALTER TABLE ferramentas DROP CONSTRAINT ck_ferramentas_quantidade;
ALTER TABLE ferramentas DROP COLUMN quantidade;
--rollback ALTER TABLE ferramentas ADD COLUMN quantidade INTEGER;
--rollback UPDATE ferramentas SET quantidade = CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END;
--rollback ALTER TABLE ferramentas ALTER COLUMN quantidade SET NOT NULL;
--rollback ALTER TABLE ferramentas ADD CONSTRAINT ck_ferramentas_quantidade CHECK (quantidade >= 0);
--rollback ALTER TABLE ferramentas DROP CONSTRAINT ck_ferramentas_status;
--rollback ALTER TABLE ferramentas DROP CONSTRAINT ck_ferramentas_valor_estimado;
--rollback ALTER TABLE ferramentas DROP COLUMN status;
--rollback ALTER TABLE ferramentas DROP COLUMN estado_conservacao;
--rollback ALTER TABLE ferramentas DROP COLUMN valor_estimado;
--rollback ALTER TABLE ferramentas DROP COLUMN categoria;

--changeset monitoolring:4-create-table-configuracao-prazo-devolucao
--comment: Prazo padrao de devolucao (FR-8). Tabela singleton: no maximo uma linha (id = 1); sem linha = prazo ainda nao configurado. dias entre 1 e 365 (dias corridos). Auditoria da ultima alteracao feita por Staff.
CREATE TABLE configuracao_prazo_devolucao (
    id                    INTEGER      NOT NULL,
    dias                  INTEGER      NOT NULL,
    id_usuario_alteracao  VARCHAR(38)  NOT NULL,
    data_hora_alteracao   TIMESTAMP    NOT NULL,
    CONSTRAINT pk_configuracao_prazo_devolucao PRIMARY KEY (id),
    CONSTRAINT ck_configuracao_prazo_devolucao_singleton CHECK (id = 1),
    CONSTRAINT ck_configuracao_prazo_devolucao_dias CHECK (dias BETWEEN 1 AND 365)
);
--rollback DROP TABLE configuracao_prazo_devolucao;

--changeset monitoolring:5-create-table-emprestimos
--comment: Emprestimo criado na Retirada (FR-9/FR-11). dias_prazo guarda o prazo padrao vigente no momento da Retirada (FR-8) e prazo_devolucao = data_hora_retirada + dias_prazo dias corridos. status: ACTIVE (aberto), RETURNED (Devolucao, FR-13) ou LOST (Perda, FR-19); atraso e derivado em tempo real (FR-17), nao e status gravado. O indice unico parcial garante no banco no maximo um emprestimo ACTIVE por ferramenta (consistencia, PRD secao 5).
CREATE TABLE emprestimos (
    id                    VARCHAR(38)  NOT NULL,
    id_ferramenta         VARCHAR(38)  NOT NULL,
    id_membro             VARCHAR(38)  NOT NULL,
    id_staff_retirada     VARCHAR(38)  NOT NULL,
    data_hora_retirada    TIMESTAMP    NOT NULL,
    dias_prazo            INTEGER      NOT NULL,
    prazo_devolucao       TIMESTAMP    NOT NULL,
    status                VARCHAR(20)  NOT NULL,
    CONSTRAINT pk_emprestimos PRIMARY KEY (id),
    CONSTRAINT fk_emprestimos_ferramenta FOREIGN KEY (id_ferramenta) REFERENCES ferramentas (id),
    CONSTRAINT fk_emprestimos_membro FOREIGN KEY (id_membro) REFERENCES usuarios (id),
    CONSTRAINT fk_emprestimos_staff_retirada FOREIGN KEY (id_staff_retirada) REFERENCES usuarios (id),
    CONSTRAINT ck_emprestimos_dias_prazo CHECK (dias_prazo >= 1),
    CONSTRAINT ck_emprestimos_prazo_devolucao CHECK (prazo_devolucao > data_hora_retirada),
    CONSTRAINT ck_emprestimos_status CHECK (status IN ('ACTIVE', 'RETURNED', 'LOST'))
);
CREATE UNIQUE INDEX uq_emprestimos_ferramenta_ativo ON emprestimos (id_ferramenta) WHERE status = 'ACTIVE';
CREATE INDEX ix_emprestimos_membro ON emprestimos (id_membro);
--rollback DROP TABLE emprestimos;

--changeset monitoolring:6-create-table-checklists
--comment: Checklist de Conservacao (Glossario, FR-10/FR-14), imutavel e vinculado ao emprestimo. tipo CHECKOUT (Retirada) ou RETURN (Devolucao, rodada futura); no maximo um de cada tipo por emprestimo. Acessorios inclusos ficam em checklist_acessorios, na ordem informada.
CREATE TABLE checklists (
    id                    VARCHAR(38)   NOT NULL,
    id_emprestimo         VARCHAR(38)   NOT NULL,
    tipo                  VARCHAR(20)   NOT NULL,
    estado_funcional      VARCHAR(20)   NOT NULL,
    avarias_visiveis      VARCHAR(2000) NOT NULL,
    id_usuario_registro   VARCHAR(38)   NOT NULL,
    data_hora_registro    TIMESTAMP     NOT NULL,
    CONSTRAINT pk_checklists PRIMARY KEY (id),
    CONSTRAINT fk_checklists_emprestimo FOREIGN KEY (id_emprestimo) REFERENCES emprestimos (id),
    CONSTRAINT uq_checklists_emprestimo_tipo UNIQUE (id_emprestimo, tipo),
    CONSTRAINT ck_checklists_tipo CHECK (tipo IN ('CHECKOUT', 'RETURN')),
    CONSTRAINT ck_checklists_estado_funcional CHECK (estado_funcional IN ('INTACT', 'DEFECTIVE'))
);
CREATE TABLE checklist_acessorios (
    id_checklist          VARCHAR(38)  NOT NULL,
    ordem                 INTEGER      NOT NULL,
    descricao             VARCHAR(255) NOT NULL,
    CONSTRAINT pk_checklist_acessorios PRIMARY KEY (id_checklist, ordem),
    CONSTRAINT fk_checklist_acessorios_checklist FOREIGN KEY (id_checklist) REFERENCES checklists (id)
);
--rollback DROP TABLE checklist_acessorios;
--rollback DROP TABLE checklists;
