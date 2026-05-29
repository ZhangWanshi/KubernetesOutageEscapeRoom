package com.team5.kubernetesoutageescaperoom.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
public class GameSession {

    @Id
    private String sessionId = UUID.randomUUID().toString();

    private int roomNumber;

    private String players;
    private int currentRoom = 1;
    private boolean completed;
    private String status = "IN_PROGRESS";
    private int health = 100;
    private int score = 0;
    private Instant createdAt = Instant.now();

    public GameSession() {
    }

    public GameSession(String hostName, int roomNumber) {
        this.players = hostName == null || hostName.isBlank() ? "Player" : hostName;
        this.roomNumber = roomNumber;
    }

    public void addPlayer(String playerName) {
        String name = playerName == null || playerName.isBlank() ? "Player" : playerName;
        this.players = this.players + ", " + name;
    }

    private static final int TOTAL_ROOMS = 2;

    public void advanceRoom() {
        this.currentRoom++;
        if (this.currentRoom > TOTAL_ROOMS) {
            this.completed = true;
            this.status = "COMPLETED";
        }
    }

    public void complete() {
        this.completed = true;
        this.status = "COMPLETED";
    }

    public List<String> getPlayerList() {
        if (players == null || players.isBlank()) return List.of();
        return Arrays.stream(players.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    public int getRoomNumber() {
        return roomNumber;
    }

    public void incrementScore(int amount) {
        this.score += amount;
    }

    public int getScore() {
        return score;
    }

    public void decrementHealth(int amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health == 0) {
            this.completed = true;
            this.status = "FAILED";
        }
    }

    public int getHealth() {
        return health;
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
