package com.team5.kubernetesoutageescaperoom.controllers;

import com.team5.kubernetesoutageescaperoom.dto.CreateSessionRequest;
import com.team5.kubernetesoutageescaperoom.dto.JoinSessionRequest;
import com.team5.kubernetesoutageescaperoom.dto.ResultResponse;
import com.team5.kubernetesoutageescaperoom.dto.RoomResponse;
import com.team5.kubernetesoutageescaperoom.dto.SubmitRequest;
import com.team5.kubernetesoutageescaperoom.dto.SubmitResponse;
import com.team5.kubernetesoutageescaperoom.entities.GameSession;
import com.team5.kubernetesoutageescaperoom.services.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService service;

    public SessionController(SessionService service) {
        this.service = service;
    }

    @PostMapping
    public GameSession create(@RequestBody(required = false) CreateSessionRequest request) {
        return service.create(request == null ? null : request.getHostName());
    }

    @PostMapping("/{sessionId}/join")
    public ResponseEntity<GameSession> join(@PathVariable String sessionId, @RequestBody(required = false) JoinSessionRequest request) {
        return service.join(sessionId, request == null ? null : request.getPlayerName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{sessionId}/room")
    public ResponseEntity<RoomResponse> room(@PathVariable String sessionId) {
        return service.find(sessionId)
                .map(session -> ResponseEntity.ok(new RoomResponse(
                        session.getSessionId(),
                        session.getCurrentRoom(),
                        "Readiness Probe Failure",
                        "The 5G network API pods are running but not receiving traffic.",
                        List.of("Readiness probe failed: HTTP 503", "Service has no ready endpoints"),
                        List.of("restart-pod", "fix-readiness-probe", "increase-memory")
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/submit")
    public ResponseEntity<SubmitResponse> submit(@PathVariable String sessionId, @RequestBody SubmitRequest request) {
        return service.submit(sessionId, request == null ? null : request.getAnswer())
                .map(correct -> ResponseEntity.ok(new SubmitResponse(correct, correct ? "COMPLETED" : "IN_PROGRESS")))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{sessionId}/result")
    public ResponseEntity<ResultResponse> result(@PathVariable String sessionId) {
        return service.find(sessionId)
                .map(session -> ResponseEntity.ok(new ResultResponse(
                        session.getSessionId(),
                        session.getStatus(),
                        session.isCompleted(),
                        session.isCompleted() ? "Outage resolved. You escaped." : "Outage still active."
                )))
                .orElse(ResponseEntity.notFound().build());
    }
}
