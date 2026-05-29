package com.team5.kubernetesoutageescaperoom.services;

import com.team5.kubernetesoutageescaperoom.dto.RoomResponse;
import com.team5.kubernetesoutageescaperoom.dto.SubmitResponse;
import com.team5.kubernetesoutageescaperoom.entities.GameSession;
import com.team5.kubernetesoutageescaperoom.repositories.SessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SessionService {

    private final SessionRepository repository;

    record RoomDefinition(String title, String problem, List<String> evidence, List<String> options, String answer, String hint) {}

    private static final List<RoomDefinition> ROOMS = List.of(
        new RoomDefinition(
            "Readiness Probe Failure",
            "The 5G network API pods are running but not receiving traffic.",
            List.of(
                "Readiness probe failed: HTTP 503",
                "Service has no ready endpoints",
                "Pod status: Running, but 0/1 ready"
            ),
            List.of("restart-pod", "fix-readiness-probe", "increase-memory"),
            "fix-readiness-probe",
            "Check the pod's readiness probe configuration. The probe is failing, preventing the pod from receiving traffic."
        ),
        new RoomDefinition(
            "CrashLoopBackOff in the Desert",
            "A critical payment service pod keeps restarting in the desert cluster.",
            List.of(
                "Pod status: CrashLoopBackOff",
                "kubectl logs: Error: DATABASE_URL environment variable not set",
                "ConfigMap 'payment-config' exists but is not mounted",
                "Deployment spec missing envFrom reference"
            ),
            List.of("restart-deployment", "increase-cpu-limit", "mount-configmap"),
            "mount-configmap",
            "The pod is missing environment variables. Check if the ConfigMap exists and whether it's properly referenced in the deployment."
        )
    );

    public SessionService(SessionRepository repository) {
        this.repository = repository;
    }

    public GameSession create(String hostName) {
        int roomNumber = (int) repository.count() + 1;
        return repository.save(new GameSession(hostName, roomNumber));
    }

    public Optional<GameSession> find(String sessionId) {
        return repository.findById(sessionId);
    }

    public Optional<GameSession> findByRoomNumber(int roomNumber) {
        return repository.findByRoomNumber(roomNumber);
    }

    public Optional<GameSession> join(String sessionId, String playerName) {
        return repository.findById(sessionId).map(session -> {
            session.addPlayer(playerName);
            return repository.save(session);
        });
    }

    public Optional<RoomResponse> getRoom(String sessionId) {
        return repository.findById(sessionId).map(session -> {
            int index = session.getCurrentRoom() - 1;
            if (index < 0 || index >= ROOMS.size()) return null;
            RoomDefinition def = ROOMS.get(index);
            return new RoomResponse(session.getSessionId(), session.getCurrentRoom(),
                    def.title(), def.problem(), def.evidence(), def.options(), def.hint());
        });
    }

    public Optional<Integer> useHint(String sessionId) {
        return repository.findById(sessionId).map(session -> {
            session.decrementHealth(10);
            repository.save(session);
            return session.getHealth();
        });
    }

    public Optional<SubmitResponse> submit(String sessionId, String answer) {
        return repository.findById(sessionId).map(session -> {
            int index = session.getCurrentRoom() - 1;
            if (index < 0 || index >= ROOMS.size()) return new SubmitResponse(false, session.getStatus(), session.getHealth(), session.getScore());
            boolean correct = ROOMS.get(index).answer().equalsIgnoreCase(answer);
            if (correct) {
                session.incrementScore(10);
                session.advanceRoom();
            } else {
                session.decrementHealth(20);
            }
            repository.save(session);
            return new SubmitResponse(correct, session.getStatus(), session.getHealth(), session.getScore());
        });
    }
}
