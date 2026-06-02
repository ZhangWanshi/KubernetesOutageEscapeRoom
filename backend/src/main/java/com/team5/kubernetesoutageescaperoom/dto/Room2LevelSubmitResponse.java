package com.team5.kubernetesoutageescaperoom.dto;

public record Room2LevelSubmitResponse(
        boolean correct,
        int levelNumber,
        int currentLevel,
        boolean roomCompleted,
        int score,
        int serviceHealth,
        String message
) {
}
