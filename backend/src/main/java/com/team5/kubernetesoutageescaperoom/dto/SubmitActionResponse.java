package com.team5.kubernetesoutageescaperoom.dto;

public record SubmitActionResponse(
        boolean correct,
        String sessionCode,
        int roomId,
        int score,
        int serviceHealth,
        boolean completed,
        String message,
        String rootCause,
        String learningPoint
) {
}
