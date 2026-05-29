package com.team5.kubernetesoutageescaperoom.dto;

public class SubmitResponse {
    private boolean correct;
    private String status;
    private int health;
    private int score;

    public SubmitResponse(boolean correct, String status, int health, int score) {
        this.correct = correct;
        this.status = status;
        this.health = health;
        this.score = score;
    }

    public boolean isCorrect() { return correct; }
    public String getStatus() { return status; }
    public int getHealth() { return health; }
    public int getScore() { return score; }
}
