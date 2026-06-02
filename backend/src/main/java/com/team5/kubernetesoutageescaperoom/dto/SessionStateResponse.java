package com.team5.kubernetesoutageescaperoom.dto;

import com.team5.kubernetesoutageescaperoom.model.GameStatus;

import java.util.List;

public record SessionStateResponse(
        String sessionCode,
        GameStatus status,
        int currentRoomId,
        int score,
        int serviceHealth,
        List<PlayerDto> players,
        boolean completed,
        int wrongAttempts,
        int hintsUsed,
        boolean currentRoomHintUsed
) {
}
