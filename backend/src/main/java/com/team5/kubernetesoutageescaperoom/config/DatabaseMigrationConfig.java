package com.team5.kubernetesoutageescaperoom.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    private void addColumnIfNotExists(JdbcTemplate jdbc, String table, String column, String definition) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
            Integer.class, table, column
        );
        if (count == null || count == 0) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }

    @Bean
    ApplicationRunner room1StateColumnsMigration(JdbcTemplate jdbcTemplate) {
        return args -> {
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room1_current_level", "INT NOT NULL DEFAULT 1");
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room1_completed",     "BOOLEAN NOT NULL DEFAULT FALSE");
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room2_current_level", "INT NOT NULL DEFAULT 1");
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room2_completed",     "BOOLEAN NOT NULL DEFAULT FALSE");
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room3_current_level", "INT NOT NULL DEFAULT 1");
            addColumnIfNotExists(jdbcTemplate, "game_sessions", "room3_completed",     "BOOLEAN NOT NULL DEFAULT FALSE");
        };
    }
}
