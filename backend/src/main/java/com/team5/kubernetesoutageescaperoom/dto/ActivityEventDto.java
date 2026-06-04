package com.team5.kubernetesoutageescaperoom.dto;

import java.time.Instant;

public record ActivityEventDto(Instant timestamp, String message) {
}
