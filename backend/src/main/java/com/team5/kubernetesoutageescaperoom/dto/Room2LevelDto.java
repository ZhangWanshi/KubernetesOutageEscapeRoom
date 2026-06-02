package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record Room2LevelDto(
        int levelNumber,
        String type,
        String title,
        String prompt,
        String evidence,
        List<String> options
) {
}
