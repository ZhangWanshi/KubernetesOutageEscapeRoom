package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;
import java.util.Map;

public record Room1LevelDto(
        int levelNumber,
        String type,
        String title,
        String prompt,
        String snippet,
        List<String> options,
        List<String> services,
        List<String> responsibilities,
        Map<String, String> selectedPairs
) {
}
