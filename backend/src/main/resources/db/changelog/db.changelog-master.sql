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
