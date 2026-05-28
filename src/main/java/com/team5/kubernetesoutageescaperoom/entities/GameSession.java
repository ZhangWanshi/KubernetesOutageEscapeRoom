package com.team5.kubernetesoutageescaperoom.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;
import java.util.UUID;

@Entity
public class GameSession {

    @Id
    private String sessionId = UUID.randomUUID().toString();
    private String players;
    private int currentRoom = 1;
    private boolean completed;
    private String status = "IN_PROGRESS";
    private Instant createdAt = Instant.now();

    public GameSession() {
    }

    public GameSession(String hostName) {
        this.players = hostName == null || hostName.isBlank() ? "Host" : hostName;
    }

    public void addPlayer(String playerName) {
        String name = playerName == null || playerName.isBlank() ? "Player" : playerName;
        this.players = this.players + ", " + name;
    }

    public void complete() {
        this.completed = true;
        this.status = "COMPLETED";
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getPlayers() {
        return players;
    }

    public int getCurrentRoom() {
        return currentRoom;
    }

    public boolean isCompleted() {
        return completed;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
