package com.team5.kubernetesoutageescaperoom.dto;

public class CreateSessionRequest {
    private String playerName;

    public String getHostName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }
}
