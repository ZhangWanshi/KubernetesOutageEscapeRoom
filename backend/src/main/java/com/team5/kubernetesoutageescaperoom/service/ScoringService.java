package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.springframework.stereotype.Service;

@Service
public class ScoringService {

    public void applyCorrectAnswer(GameSession session) {
        session.setScore(session.getScore() + 20);
    }

    public void applyWrongAnswer(GameSession session) {
        session.setScore(Math.max(0, session.getScore() - 10));
        session.setServiceHealth(Math.max(0, session.getServiceHealth() - 10));
        session.setWrongAttempts(session.getWrongAttempts() + 1);
    }

    public void applyHint(GameSession session) {
        session.setScore(Math.max(0, session.getScore() - 5));
        session.setHintsUsed(session.getHintsUsed() + 1);
    }
}
