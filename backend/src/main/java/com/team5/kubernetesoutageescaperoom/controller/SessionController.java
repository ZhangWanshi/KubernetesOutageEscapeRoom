package com.team5.kubernetesoutageescaperoom.controller;

import com.team5.kubernetesoutageescaperoom.dto.EvidenceViewRequest;
import com.team5.kubernetesoutageescaperoom.dto.ActivityEventDto;
import com.team5.kubernetesoutageescaperoom.dto.GameReportResponse;
import com.team5.kubernetesoutageescaperoom.dto.HintRequest;
import com.team5.kubernetesoutageescaperoom.dto.HintResponse;
import com.team5.kubernetesoutageescaperoom.dto.JoinSessionRequest;
import com.team5.kubernetesoutageescaperoom.dto.MessageResponse;
import com.team5.kubernetesoutageescaperoom.dto.SessionStateResponse;
import com.team5.kubernetesoutageescaperoom.dto.SubmitActionRequest;
import com.team5.kubernetesoutageescaperoom.dto.SubmitActionResponse;
import com.team5.kubernetesoutageescaperoom.service.GameSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {
    private final GameSessionService gameSessionService;

    public SessionController(GameSessionService gameSessionService) {
        this.gameSessionService = gameSessionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionStateResponse createSession() {
        return gameSessionService.createSession();
    }

    @PostMapping("/{sessionCode}/join")
    public SessionStateResponse joinSession(@PathVariable String sessionCode, @RequestBody JoinSessionRequest request) {
        return gameSessionService.joinSession(sessionCode, request == null ? null : request.getPlayerName());
    }

    @PostMapping("/{sessionCode}/start")
    public SessionStateResponse startSession(@PathVariable String sessionCode) {
        return gameSessionService.startSession(sessionCode);
    }

    @GetMapping("/{sessionCode}/state")
    public SessionStateResponse getState(@PathVariable String sessionCode) {
        return gameSessionService.getState(sessionCode);
    }

    @PostMapping("/{sessionCode}/rooms/{roomId}/submit")
    public SubmitActionResponse submitAction(
            @PathVariable String sessionCode,
            @PathVariable int roomId,
            @RequestBody SubmitActionRequest request
    ) {
        return gameSessionService.submitAction(
                sessionCode,
                roomId,
                request == null ? null : request.playerName(),
                request == null ? null : request.selectedActionId()
        );
    }

    @PostMapping("/{sessionCode}/rooms/{roomId}/hint")
    public HintResponse requestHint(
            @PathVariable String sessionCode,
            @PathVariable int roomId,
            @RequestBody HintRequest request
    ) {
        return gameSessionService.requestHint(sessionCode, roomId, request == null ? null : request.playerName());
    }

    @PostMapping("/{sessionCode}/rooms/{roomId}/evidence/view")
    public MessageResponse recordEvidenceView(
            @PathVariable String sessionCode,
            @PathVariable int roomId,
            @RequestBody EvidenceViewRequest request
    ) {
        gameSessionService.recordEvidenceView(
                sessionCode,
                roomId,
                request == null ? null : request.playerName(),
                request == null ? null : request.evidenceTitle()
        );
        return new MessageResponse("Evidence view recorded.");
    }

    @GetMapping("/{sessionCode}/activity")
    public List<ActivityEventDto> getActivity(@PathVariable String sessionCode) {
        return gameSessionService.getActivity(sessionCode);
    }

    @GetMapping("/{sessionCode}/report")
    public GameReportResponse getReport(@PathVariable String sessionCode) {
        return gameSessionService.getReport(sessionCode);
    }
}
