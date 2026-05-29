package com.team5.kubernetesoutageescaperoom.dto;

public record HintResponse(int hintNumber, String hint, int score, int serviceHealth) {
}
