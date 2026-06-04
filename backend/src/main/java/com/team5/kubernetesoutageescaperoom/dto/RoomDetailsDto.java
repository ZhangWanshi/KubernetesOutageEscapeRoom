package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public record RoomDetailsDto(
        int roomId,
        String name,
        String theme,
        String difficulty,
        String failureArea,
        int timeLimitSeconds,
        String story,
        List<EvidenceDto> evidence,
        List<ActionOptionDto> actions
) {
}
