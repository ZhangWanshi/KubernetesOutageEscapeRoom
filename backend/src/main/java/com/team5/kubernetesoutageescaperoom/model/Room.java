package com.team5.kubernetesoutageescaperoom.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class Room {
    private int roomId;
    private String name;
    private String theme;
    private String difficulty;
    private String failureArea;
    private int timeLimitSeconds;
    private String story;
    private List<Evidence> evidence = new ArrayList<>();
    private List<ActionOption> actions = new ArrayList<>();
    private String correctActionId;
    private List<String> hints = new ArrayList<>();
    private String rootCause;
    private String learningPoint;
}
