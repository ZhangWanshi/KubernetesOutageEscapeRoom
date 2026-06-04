package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room3LevelSubmitRequest(
        String playerName,
        String command,
        List<String> orderedSteps
) {
}
