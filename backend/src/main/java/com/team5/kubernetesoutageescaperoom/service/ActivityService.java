package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.model.ActivityEvent;
import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.springframework.stereotype.Service;

@Service
public class ActivityService {

    public void add(GameSession session, String message) {
        session.getActivityFeed().add(new ActivityEvent(message));
    }
}
