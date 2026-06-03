package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityServiceTest {

    private final ActivityService activityService = new ActivityService();

    @Test
    void add_appendsMessageToActivityFeed() {
        GameSession session = new GameSession();
        activityService.add(session, "Player joined");
        assertThat(session.getActivityFeed()).hasSize(1);
        assertThat(session.getActivityFeed().get(0).getMessage()).isEqualTo("Player joined");
    }

    @Test
    void add_multipleMessages_appendsInOrder() {
        GameSession session = new GameSession();
        activityService.add(session, "First");
        activityService.add(session, "Second");
        assertThat(session.getActivityFeed()).hasSize(2);
        assertThat(session.getActivityFeed().get(1).getMessage()).isEqualTo("Second");
    }
}
