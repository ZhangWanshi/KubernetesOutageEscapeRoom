package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.springframework.stereotype.Service;

@Service
public class ScoringService {
    private static final int CORRECT_ANSWER_POINTS = 20;
    private static final int WRONG_ANSWER_PENALTY = 10;
    private static final int HINT_PENALTY = 5;

    public void applyCorrectAnswer(GameSession session) {
        session.setScore(session.getScore() + CORRECT_ANSWER_POINTS);
    }

    public void applyWrongAnswer(GameSession session) {
        session.setScore(Math.max(0, session.getScore() - WRONG_ANSWER_PENALTY));
        session.setServiceHealth(Math.max(0, session.getServiceHealth() - WRONG_ANSWER_PENALTY));
        session.setWrongAttempts(session.getWrongAttempts() + 1);
    }

    public void applyHint(GameSession session) {
        session.setScore(Math.max(0, session.getScore() - HINT_PENALTY));
        session.setHintsUsed(session.getHintsUsed() + 1);
    }
}
