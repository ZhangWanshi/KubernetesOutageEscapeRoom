package com.team5.kubernetesoutageescaperoom.dto;

import java.util.List;

public class RoomResponse {
    private String sessionId;
    private int roomNumber;
    private String title;
    private String problem;
    private List<String> evidence;
    private List<String> options;

    public RoomResponse(String sessionId, int roomNumber, String title, String problem, List<String> evidence, List<String> options) {
        this.sessionId = sessionId;
        this.roomNumber = roomNumber;
        this.title = title;
        this.problem = problem;
        this.evidence = evidence;
        this.options = options;
    }

    public String getSessionId() {
        return sessionId;
    }

    public int getRoomNumber() {
        return roomNumber;
    }

    public String getTitle() {
        return title;
    }

    public String getProblem() {
        return problem;
    }

    public List<String> getEvidence() {
        return evidence;
    }

    public List<String> getOptions() {
        return options;
    }
}
