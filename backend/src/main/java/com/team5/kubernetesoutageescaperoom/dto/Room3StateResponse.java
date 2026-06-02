package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room3StateResponse(
        int roomId,
        String roomName,
        String theme,
        String story,
        int currentLevel,
        int totalLevels,
        boolean completed,
        int score,
        int serviceHealth,
        Room3LevelDto level,
        List<String> completedMessages,
        String completionMessage,
        String gameCompletionMessage
) {
}
