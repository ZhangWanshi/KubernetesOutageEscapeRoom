CREATE DATABASE IF NOT EXISTS escape_room_db;
USE escape_room_db;

CREATE TABLE IF NOT EXISTS game_sessions (
    session_code VARCHAR(6) NOT NULL,
    status VARCHAR(32) NOT NULL,
    current_room_id INT NOT NULL,
    score INT NOT NULL,
    service_health INT NOT NULL,
    completed BOOLEAN NOT NULL,
    wrong_attempts INT NOT NULL,
    hints_used INT NOT NULL,
    PRIMARY KEY (session_code)
);

CREATE TABLE IF NOT EXISTS session_players (
    session_code VARCHAR(6) NOT NULL,
    player_order INT NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (session_code, player_order),
    CONSTRAINT fk_players_session
        FOREIGN KEY (session_code)
        REFERENCES game_sessions (session_code)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_feed (
    session_code VARCHAR(6) NOT NULL,
    event_order INT NOT NULL,
    event_time TIMESTAMP(6) NOT NULL,
    message VARCHAR(500) NOT NULL,
    PRIMARY KEY (session_code, event_order),
    CONSTRAINT fk_activity_session
        FOREIGN KEY (session_code)
        REFERENCES game_sessions (session_code)
        ON DELETE CASCADE
);
