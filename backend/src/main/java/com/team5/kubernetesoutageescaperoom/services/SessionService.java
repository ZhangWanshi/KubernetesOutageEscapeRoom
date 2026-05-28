package com.team5.kubernetesoutageescaperoom.services;

import com.team5.kubernetesoutageescaperoom.entities.GameSession;
import com.team5.kubernetesoutageescaperoom.repositories.SessionRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class SessionService {

    private final SessionRepository repository;

    public SessionService(SessionRepository repository) {
        this.repository = repository;
    }

    public GameSession create(String hostName) {
        return repository.save(new GameSession(hostName));
    }

    public Optional<GameSession> find(String sessionId) {
        return repository.findById(sessionId);
    }

    public Optional<GameSession> join(String sessionId, String playerName) {
        return repository.findById(sessionId).map(session -> {
            session.addPlayer(playerName);
            return repository.save(session);
        });
    }

    public Optional<Boolean> submit(String sessionId, String answer) {
        return repository.findById(sessionId).map(session -> {
            boolean correct = "fix-readiness-probe".equalsIgnoreCase(answer);
            if (correct) {
                session.complete();
                repository.save(session);
            }
            return correct;
        });
    }
}
