package com.team5.kubernetesoutageescaperoom.dto;

public class SubmitResponse {
    private boolean correct;
    private String status;

    public SubmitResponse(boolean correct, String status) {
        this.correct = correct;
        this.status = status;
    }

    public boolean isCorrect() {
        return correct;
    }

    public String getStatus() {
        return status;
    }
}
