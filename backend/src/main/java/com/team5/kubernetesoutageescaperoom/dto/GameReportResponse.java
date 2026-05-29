package com.team5.kubernetesoutageescaperoom.dto;

import com.team5.kubernetesoutageescaperoom.model.GameStatus;

import java.util.List;

public record GameReportResponse(
        String sessionCode,
        GameStatus status,
        int finalScore,
        int serviceHealth,
        boolean completed,
        List<PlayerDto> players,
        int wrongAttempts,
        int hintsUsed,
        List<ActivityEventDto> activityFeed,
        String roomName,
        String rootCause,
        String learningPoint
) {
}
