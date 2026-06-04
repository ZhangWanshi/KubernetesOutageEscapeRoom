package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ScoringServiceTest {

    private ScoringService scoring;
    private GameSession session;

    @BeforeEach
    void setUp() {
        scoring = new ScoringService();
        session = new GameSession();
        session.setScore(100);
        session.setServiceHealth(100);
        session.setWrongAttempts(0);
        session.setHintsUsed(0);
        session.setCurrentRoomHintsUsed(0);
    }

    @Test
    void applyCorrectAnswer_incrementsScoreBy20() {
        scoring.applyCorrectAnswer(session);
        assertThat(session.getScore()).isEqualTo(120);
    }

    @Test
    void applyWrongAnswer_decreasesScoreAndHealthBy10() {
        scoring.applyWrongAnswer(session);
        assertThat(session.getScore()).isEqualTo(90);
        assertThat(session.getServiceHealth()).isEqualTo(90);
        assertThat(session.getWrongAttempts()).isEqualTo(1);
    }

    @Test
    void applyWrongAnswer_scoreNeverGoesBelowZero() {
        session.setScore(5);
        scoring.applyWrongAnswer(session);
        assertThat(session.getScore()).isEqualTo(0);
    }

    @Test
    void applyWrongAnswer_healthNeverGoesBelowZero() {
        session.setServiceHealth(5);
        scoring.applyWrongAnswer(session);
        assertThat(session.getServiceHealth()).isEqualTo(0);
    }

    @Test
    void applyHint_firstHint_penalises10() {
        scoring.applyHint(session);
        assertThat(session.getScore()).isEqualTo(90);
        assertThat(session.getHintsUsed()).isEqualTo(1);
    }

    @Test
    void applyHint_secondHint_penalises20() {
        session.setCurrentRoomHintsUsed(1);
        scoring.applyHint(session);
        assertThat(session.getScore()).isEqualTo(80);
    }

    @Test
    void applyHint_thirdHint_penalises30() {
        session.setCurrentRoomHintsUsed(2);
        scoring.applyHint(session);
        assertThat(session.getScore()).isEqualTo(70);
    }

    @Test
    void applyHint_scoreNeverGoesBelowZero() {
        session.setScore(5);
        scoring.applyHint(session);
        assertThat(session.getScore()).isEqualTo(0);
    }
}
