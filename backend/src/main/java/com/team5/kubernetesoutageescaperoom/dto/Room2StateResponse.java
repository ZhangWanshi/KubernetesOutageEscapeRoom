package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room2StateResponse(
        int roomId,
        String roomName,
        String theme,
        String story,
        int currentLevel,
        int totalLevels,
        boolean completed,
        int score,
        int serviceHealth,
        Room2LevelDto level,
        List<String> completedMessages,
        String completionMessage
) {
}
