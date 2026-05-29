package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.dto.ActivityEventDto;
import com.team5.kubernetesoutageescaperoom.dto.GameReportResponse;
import com.team5.kubernetesoutageescaperoom.dto.HintResponse;
import com.team5.kubernetesoutageescaperoom.dto.PlayerDto;
import com.team5.kubernetesoutageescaperoom.dto.SessionStateResponse;
import com.team5.kubernetesoutageescaperoom.dto.SubmitActionResponse;
import com.team5.kubernetesoutageescaperoom.exception.BadRequestException;
import com.team5.kubernetesoutageescaperoom.exception.NotFoundException;
import com.team5.kubernetesoutageescaperoom.model.ActivityEvent;
import com.team5.kubernetesoutageescaperoom.model.GameSession;
import com.team5.kubernetesoutageescaperoom.model.GameStatus;
import com.team5.kubernetesoutageescaperoom.model.Player;
import com.team5.kubernetesoutageescaperoom.model.Room;
import com.team5.kubernetesoutageescaperoom.repositories.GameSessionJpaRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;

@Service
public class GameSessionService {
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SESSION_CODE_LENGTH = 6;

    private final SecureRandom random = new SecureRandom();
    private final GameSessionJpaRepository sessionRepository;
    private final RoomService roomService;
    private final ScoringService scoringService;
    private final ActivityService activityService;

    public GameSessionService(
            GameSessionJpaRepository sessionRepository,
            RoomService roomService,
            ScoringService scoringService,
            ActivityService activityService
    ) {
        this.sessionRepository = sessionRepository;
        this.roomService = roomService;
        this.scoringService = scoringService;
        this.activityService = activityService;
    }

    public SessionStateResponse createSession() {
        GameSession session = new GameSession();
        session.setSessionCode(generateUniqueCode());
        return toStateResponse(sessionRepository.save(session));
    }

    public SessionStateResponse joinSession(String sessionCode, String playerName) {
        requireText(playerName, "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            if (session.getPlayers().stream().noneMatch(player -> player.getName().equalsIgnoreCase(playerName.trim()))) {
                session.getPlayers().add(new Player(playerName.trim()));
                activityService.add(session, playerName.trim() + " joined the session");
            }
            return toStateResponse(sessionRepository.save(session));
        }
    }

    public SessionStateResponse startSession(String sessionCode) {
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            session.setStatus(GameStatus.IN_PROGRESS);
            activityService.add(session, "Game started");
            return toStateResponse(sessionRepository.save(session));
        }
    }

    public SessionStateResponse getState(String sessionCode) {
        return toStateResponse(getSession(sessionCode));
    }

    public SubmitActionResponse submitAction(String sessionCode, int roomId, String playerName, String selectedActionId) {
        Room room = roomService.getRoom(roomId);
        requireText(playerName, "playerName must not be blank");
        requireText(selectedActionId, "selectedActionId must not be blank");
        if (!roomService.actionExists(roomId, selectedActionId.trim())) {
            throw new BadRequestException("Invalid selectedActionId");
        }

        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, playerName);
            boolean correct = room.getCorrectActionId().equalsIgnoreCase(selectedActionId.trim());
            if (correct) {
                scoringService.applyCorrectAnswer(session);
                boolean gameFinished = session.getCurrentRoomId() >= roomService.getTotalRooms();
                if (gameFinished) {
                    session.setCompleted(true);
                    session.setStatus(GameStatus.COMPLETED);
                } else {
                    session.setCurrentRoomId(session.getCurrentRoomId() + 1);
                }
                activityService.add(session, playerName.trim() + " solved " + room.getName());
                sessionRepository.save(session);
                return new SubmitActionResponse(
                        true,
                        session.getSessionCode(),
                        room.getRoomId(),
                        session.getScore(),
                        session.getServiceHealth(),
                        session.isCompleted(),
                        "Correct! " + room.getLearningPoint(),
                        session.isCompleted() ? room.getRootCause() : null,
                        session.isCompleted() ? room.getLearningPoint() : null
                );
            }

            scoringService.applyWrongAnswer(session);
            activityService.add(session, playerName.trim() + " submitted wrong action " + selectedActionId.trim().toUpperCase(Locale.ROOT));
            sessionRepository.save(session);
            return new SubmitActionResponse(
                    false,
                    session.getSessionCode(),
                    room.getRoomId(),
                    session.getScore(),
                    session.getServiceHealth(),
                    session.isCompleted(),
                    "Incorrect. Try again.",
                    null,
                    null
            );
        }
    }

    public HintResponse requestHint(String sessionCode, int roomId, String playerName) {
        Room room = roomService.getRoom(roomId);
        requireText(playerName, "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, playerName);
            int nextHintIndex = session.getHintsUsed();
            if (nextHintIndex >= room.getHints().size()) {
                return new HintResponse(0, "No more hints available.", session.getScore(), session.getServiceHealth());
            }

            scoringService.applyHint(session);
            int hintNumber = nextHintIndex + 1;
            activityService.add(session, playerName.trim() + " used hint " + hintNumber);
            sessionRepository.save(session);
            return new HintResponse(hintNumber, room.getHints().get(nextHintIndex), session.getScore(), session.getServiceHealth());
        }
    }

    public void recordEvidenceView(String sessionCode, int roomId, String playerName, String evidenceTitle) {
        roomService.getRoom(roomId);
        requireText(playerName, "playerName must not be blank");
        requireText(evidenceTitle, "evidenceTitle must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, playerName);
            activityService.add(session, playerName.trim() + " viewed " + evidenceTitle.trim());
            sessionRepository.save(session);
        }
    }

    public List<ActivityEventDto> getActivity(String sessionCode) {
        return getSession(sessionCode).getActivityFeed().stream().map(this::toActivityDto).toList();
    }

    public GameReportResponse getReport(String sessionCode) {
        GameSession session = getSession(sessionCode);
        Room room = roomService.getRoom(1);
        return new GameReportResponse(
                session.getSessionCode(),
                session.getStatus(),
                session.getScore(),
                session.getServiceHealth(),
                session.isCompleted(),
                session.getPlayers().stream().map(this::toPlayerDto).toList(),
                session.getWrongAttempts(),
                session.getHintsUsed(),
                session.getActivityFeed().stream().map(this::toActivityDto).toList(),
                room.getName(),
                session.isCompleted() ? room.getRootCause() : null,
                session.isCompleted() ? room.getLearningPoint() : null
        );
    }

    private GameSession getSession(String sessionCode) {
        return sessionRepository.findById(normalizeCode(sessionCode))
                .orElseThrow(() -> new NotFoundException("Session not found"));
    }

    private void requirePlayer(GameSession session, String playerName) {
        boolean exists = session.getPlayers().stream()
                .anyMatch(player -> player.getName().equalsIgnoreCase(playerName.trim()));
        if (!exists) {
            throw new BadRequestException("Player is not part of this session");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }

    private String normalizeCode(String sessionCode) {
        return sessionCode == null ? "" : sessionCode.trim().toUpperCase(Locale.ROOT);
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder builder = new StringBuilder(SESSION_CODE_LENGTH);
            for (int i = 0; i < SESSION_CODE_LENGTH; i++) {
                builder.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
            }
            code = builder.toString();
        } while (sessionRepository.existsById(code));
        return code;
    }

    private SessionStateResponse toStateResponse(GameSession session) {
        return new SessionStateResponse(
                session.getSessionCode(),
                session.getStatus(),
                session.getCurrentRoomId(),
                session.getScore(),
                session.getServiceHealth(),
                session.getPlayers().stream().map(this::toPlayerDto).toList(),
                session.isCompleted(),
                session.getWrongAttempts(),
                session.getHintsUsed()
        );
    }

    private PlayerDto toPlayerDto(Player player) {
        return new PlayerDto(player.getName());
    }

    private ActivityEventDto toActivityDto(ActivityEvent event) {
        return new ActivityEventDto(event.getTimestamp(), event.getMessage());
    }
}
