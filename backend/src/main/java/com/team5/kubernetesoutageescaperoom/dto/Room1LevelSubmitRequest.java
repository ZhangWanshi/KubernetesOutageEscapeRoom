package com.team5.kubernetesoutageescaperoom.dto;

import java.util.Map;

public record Room1LevelSubmitRequest(
        String playerName,
        String selectedStatus,
        Map<String, String> matchedPairs,
        String selectedDbHost
) {
}
