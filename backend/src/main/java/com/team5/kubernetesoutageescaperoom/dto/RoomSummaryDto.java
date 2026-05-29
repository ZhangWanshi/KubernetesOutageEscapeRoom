package com.team5.kubernetesoutageescaperoom.dto;

public record RoomSummaryDto(
        int roomId,
        String name,
        String theme,
        String difficulty,
        String failureArea,
        boolean locked
) {
}
