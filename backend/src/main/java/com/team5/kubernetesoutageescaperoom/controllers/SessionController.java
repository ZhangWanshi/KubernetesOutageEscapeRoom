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

    @GetMapping("/by-room/{roomNumber}")
    public ResponseEntity<GameSession> findByRoomNumber(@PathVariable int roomNumber) {
        return service.findByRoomNumber(roomNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/join")
    public ResponseEntity<GameSession> join(@PathVariable String sessionId, @RequestBody(required = false) JoinSessionRequest request) {
        return service.join(sessionId, request == null ? null : request.getPlayerName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{sessionId}/room")
    public ResponseEntity<RoomResponse> room(@PathVariable String sessionId) {
        return service.getRoom(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/submit")
    public ResponseEntity<SubmitResponse> submit(@PathVariable String sessionId, @RequestBody SubmitRequest request) {
        return service.submit(sessionId, request == null ? null : request.getAnswer())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/hint")
    public ResponseEntity<Integer> useHint(@PathVariable String sessionId) {
        return service.useHint(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{sessionId}/players")
    public ResponseEntity<List<String>> players(@PathVariable String sessionId) {
        return service.find(sessionId)
                .map(session -> ResponseEntity.ok(session.getPlayerList()))
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
