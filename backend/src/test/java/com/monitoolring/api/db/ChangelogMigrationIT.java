package com.monitoolring.api.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.Database;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;

/**
 * Garante que o changeset 3 (modelo de Ferramenta do PRD) aplica sem erro num banco que já tem
 * ferramentas no formato antigo (com quantidade), faz o backfill com os valores-sentinela e
 * que o rollback volta ao formato anterior. Usa um Postgres próprio, isolado do banco dos ITs.
 */
class ChangelogMigrationIT {

    private static final String CHANGELOG = "db/changelog/db.changelog-master.sql";

    @Test
    @SuppressWarnings("deprecation")
    void toolModelChangesetMigratesExistingRowsAndRollsBack() throws Exception {
        try (PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")) {
            postgres.start();
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
                Database database = DatabaseFactory.getInstance()
                        .findCorrectDatabaseImplementation(new JdbcConnection(connection));
                Liquibase liquibase = new Liquibase(CHANGELOG, new ClassLoaderResourceAccessor(), database);

                // estado anterior: só os changesets 1 e 2, com uma ferramenta no modelo antigo
                liquibase.update(2, new Contexts(), new LabelExpression());
                try (Statement st = connection.createStatement()) {
                    st.executeUpdate("INSERT INTO ferramentas (id, codigo, nome, quantidade, id_usuario_criacao, "
                            + "data_hora_criacao, id_usuario_alteracao, data_hora_alteracao, versao) VALUES "
                            + "('legacy-1', 'LEG-1', 'Martelo antigo', 3, 'u', now(), 'u', now(), 0)");
                }

                liquibase.update(new Contexts(), new LabelExpression());

                try (Statement st = connection.createStatement();
                        ResultSet rs = st.executeQuery("SELECT categoria, valor_estimado, estado_conservacao, status "
                                + "FROM ferramentas WHERE id = 'legacy-1'")) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getString("categoria")).isEqualTo("NAO_INFORMADA");
                    assertThat(rs.getBigDecimal("valor_estimado")).isEqualByComparingTo("0.01");
                    assertThat(rs.getString("estado_conservacao")).isEqualTo("Não informado (migração)");
                    assertThat(rs.getString("status")).isEqualTo("AVAILABLE");
                }
                assertThat(columns(connection)).doesNotContain("quantidade")
                        .contains("categoria", "valor_estimado", "estado_conservacao", "status");

                liquibase.rollback(1, (String) null);

                assertThat(columns(connection)).contains("quantidade")
                        .doesNotContain("categoria", "valor_estimado", "estado_conservacao", "status");
                try (Statement st = connection.createStatement();
                        ResultSet rs = st.executeQuery("SELECT quantidade FROM ferramentas WHERE id = 'legacy-1'")) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt("quantidade")).isEqualTo(1);
                }
            }
        }
    }

    private static List<String> columns(Connection connection) throws Exception {
        List<String> columns = new ArrayList<>();
        try (ResultSet rs = connection.getMetaData().getColumns(null, "public", "ferramentas", null)) {
            while (rs.next()) {
                columns.add(rs.getString("COLUMN_NAME"));
            }
        }
        return columns;
    }
}
