package com.team5.kubernetesoutageescaperoom.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    @Bean
    ApplicationRunner room1StateColumnsMigration(JdbcTemplate jdbcTemplate) {
        return args -> {
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room1_current_level INT NOT NULL DEFAULT 1");
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room1_completed BOOLEAN NOT NULL DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room2_current_level INT NOT NULL DEFAULT 1");
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room2_completed BOOLEAN NOT NULL DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room3_current_level INT NOT NULL DEFAULT 1");
            jdbcTemplate.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS room3_completed BOOLEAN NOT NULL DEFAULT FALSE");
        };
    }
}
