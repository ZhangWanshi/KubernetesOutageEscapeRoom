package com.team5.kubernetesoutageescaperoom.dto;

public record Room3LevelSubmitResponse(
        boolean correct,
        int levelNumber,
        int currentLevel,
        boolean roomCompleted,
        boolean gameCompleted,
        int score,
        int serviceHealth,
        String message
) {
}
