package com.team5.kubernetesoutageescaperoom.model;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class ActivityEvent {
    @Column(name = "event_time", nullable = false)
    private Instant timestamp;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    public ActivityEvent(String message) {
        this.timestamp = Instant.now();
        this.message = message;
    }
}
