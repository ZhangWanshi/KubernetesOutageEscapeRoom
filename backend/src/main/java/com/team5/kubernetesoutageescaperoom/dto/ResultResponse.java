package com.team5.kubernetesoutageescaperoom.dto;

public class ResultResponse {
    private String sessionId;
    private String status;
    private boolean completed;
    private String message;

    public ResultResponse(String sessionId, String status, boolean completed, String message) {
        this.sessionId = sessionId;
        this.status = status;
        this.completed = completed;
        this.message = message;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getStatus() {
        return status;
    }

    public boolean isCompleted() {
        return completed;
    }

    public String getMessage() {
        return message;
    }
}
