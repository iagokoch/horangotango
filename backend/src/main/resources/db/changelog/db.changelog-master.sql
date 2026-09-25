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
