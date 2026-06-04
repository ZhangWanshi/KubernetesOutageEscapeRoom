package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room2LevelSubmitRequest(
        String playerName,
        String answer,
        List<String> orderedSteps
) {
}
