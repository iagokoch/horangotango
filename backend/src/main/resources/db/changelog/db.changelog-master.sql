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
