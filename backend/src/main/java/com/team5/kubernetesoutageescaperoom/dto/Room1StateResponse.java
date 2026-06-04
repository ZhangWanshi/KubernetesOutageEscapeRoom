package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room1StateResponse(
        int roomId,
        String roomName,
        String theme,
        String story,
        int currentLevel,
        int totalLevels,
        boolean completed,
        int score,
        int serviceHealth,
        Room1LevelDto level,
        List<String> completedMessages,
        String completionMessage
) {
}
