package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.dto.ActivityEventDto;
import com.team5.kubernetesoutageescaperoom.dto.GameReportResponse;
import com.team5.kubernetesoutageescaperoom.dto.HintResponse;
import com.team5.kubernetesoutageescaperoom.dto.PlayerDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomLearningSummaryDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomDetailsDto;
import com.team5.kubernetesoutageescaperoom.dto.Room1LevelDto;
import com.team5.kubernetesoutageescaperoom.dto.Room1LevelSubmitRequest;
import com.team5.kubernetesoutageescaperoom.dto.Room1LevelSubmitResponse;
import com.team5.kubernetesoutageescaperoom.dto.Room1StateResponse;
import com.team5.kubernetesoutageescaperoom.dto.Room2LevelDto;
import com.team5.kubernetesoutageescaperoom.dto.Room2LevelSubmitRequest;
import com.team5.kubernetesoutageescaperoom.dto.Room2LevelSubmitResponse;
import com.team5.kubernetesoutageescaperoom.dto.Room2StateResponse;
import com.team5.kubernetesoutageescaperoom.dto.Room3LevelDto;
import com.team5.kubernetesoutageescaperoom.dto.Room3LevelSubmitRequest;
import com.team5.kubernetesoutageescaperoom.dto.Room3LevelSubmitResponse;
import com.team5.kubernetesoutageescaperoom.dto.Room3StateResponse;
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
import java.util.Map;

@Service
public class GameSessionService {
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SESSION_CODE_LENGTH = 6;
    private static final int ROOM_1_ID = 1;
    private static final int ROOM_1_TOTAL_LEVELS = 3;
    private static final int ROOM_2_ID = 2;
    private static final int ROOM_2_TOTAL_LEVELS = 3;
    private static final int ROOM_3_ID = 3;
    private static final int ROOM_3_TOTAL_LEVELS = 3;
    private static final String ROOM_1_NAME = "Microservice Incident Response";
    private static final String ROOM_1_THEME = "Forest";
    private static final String ROOM_1_STORY = "A production incident has affected the Customer Management Platform. Your task is to restore the system by checking service health, identifying service responsibilities, and fixing a missing configuration value.";
    private static final String ROOM_1_COMPLETION_MESSAGE = "Incident resolved.\n\nThe customer-api service is healthy, all microservice responsibilities are correctly mapped, and database connectivity has been restored.\n\nRoom 1 completed successfully.";
    private static final Map<String, String> ROOM_1_LEVEL_2_PAIRS = Map.of(
            "customer-api", "Handles customer requests",
            "order-service", "Processes customer orders",
            "database-service", "Stores application data"
    );
    private static final String ROOM_2_NAME = "Container Recovery Operations";
    private static final String ROOM_2_THEME = "Container Control Room";
    private static final String ROOM_2_STORY = "A production container is failing after a new deployment. Your team must inspect the container status, understand the container startup lifecycle, and choose the safest recovery action.";
    private static final String ROOM_2_COMPLETION_MESSAGE = "Container recovery completed.\n\nThe failing container status was identified, the container lifecycle was restored in the correct order, and the unstable image was rolled back safely.\n\nRoom 2 completed successfully.";
    private static final List<String> ROOM_2_LIFECYCLE_ORDER = List.of(
            "Image Pulled",
            "Container Created",
            "Container Started",
            "Health Check Passed",
            "Service Ready"
    );
    private static final String ROOM_3_NAME = "Kubernetes Service Routing Fix";
    private static final String ROOM_3_THEME = "Kubernetes Command Center";
    private static final String ROOM_3_STORY = "A Kubernetes service is running, and the application pods are healthy, but user traffic is not reaching the application. Your task is to inspect the service, follow the correct debugging sequence, and apply the correct selector fix.";
    private static final String ROOM_3_COMPLETION_MESSAGE = "Kubernetes service routing fixed.\n\nThe endpoint issue was inspected, the investigation sequence was completed, and the service selector was corrected.\n\nRoom 3 completed successfully.";
    private static final String GAME_COMPLETION_MESSAGE = "Outage resolved.\n\nAll incident rooms have been completed successfully.\n\nYour team restored service health by fixing microservice configuration, recovering a failing container, and correcting Kubernetes service routing.\n\nEscape Room completed.";
    private static final List<String> ROOM_3_INVESTIGATION_ORDER = List.of(
            "Check pod status",
            "Check service endpoints",
            "Compare service selector with pod labels",
            "Identify selector mismatch",
            "Apply selector fix"
    );

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

    public RoomDetailsDto getActiveRoomDetails(String sessionCode, int roomId) {
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requireActiveRoom(session, roomId);
            return roomService.getRoomDetails(roomId);
        }
    }

    public Room1StateResponse getRoom1State(String sessionCode) {
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requireRoom1Accessible(session);
            return toRoom1StateResponse(session);
        }
    }

    public Room2StateResponse getRoom2State(String sessionCode) {
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requireRoom2Accessible(session);
            return toRoom2StateResponse(session);
        }
    }

    public Room3StateResponse getRoom3State(String sessionCode) {
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requireRoom3Accessible(session);
            return toRoom3StateResponse(session);
        }
    }

    public Room1LevelSubmitResponse submitRoom1Level(String sessionCode, int levelNumber, Room1LevelSubmitRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        requireText(request.playerName(), "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, request.playerName());
            requireRoom1Accessible(session);
            if (session.isRoom1Completed()) {
                throw new BadRequestException("Room 1 is already completed");
            }
            if (levelNumber != session.getRoom1CurrentLevel()) {
                throw new BadRequestException("Level is not active for Room 1");
            }

            boolean correct = isRoom1LevelAnswerCorrect(levelNumber, request);
            if (!correct) {
                scoringService.applyWrongAnswer(session);
                activityService.add(session, request.playerName().trim() + " submitted an incorrect answer for Room 1 Level " + levelNumber);
                sessionRepository.save(session);
                return new Room1LevelSubmitResponse(
                        false,
                        levelNumber,
                        session.getRoom1CurrentLevel(),
                        false,
                        session.getScore(),
                        session.getServiceHealth(),
                        room1WrongMessage(levelNumber)
                );
            }

            scoringService.applyCorrectAnswer(session);
            boolean completed = levelNumber == ROOM_1_TOTAL_LEVELS;
            if (completed) {
                session.setRoom1Completed(true);
                activityService.add(session, request.playerName().trim() + " completed Room 1");
            } else {
                session.setRoom1CurrentLevel(levelNumber + 1);
                activityService.add(session, request.playerName().trim() + " completed Room 1 Level " + levelNumber);
            }
            sessionRepository.save(session);
            return new Room1LevelSubmitResponse(
                    true,
                    levelNumber,
                    session.getRoom1CurrentLevel(),
                    completed,
                    session.getScore(),
                    session.getServiceHealth(),
                    room1SuccessMessage(levelNumber)
            );
        }
    }

    public Room2LevelSubmitResponse submitRoom2Level(String sessionCode, int levelNumber, Room2LevelSubmitRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        requireText(request.playerName(), "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, request.playerName());
            requireRoom2Accessible(session);
            if (session.isRoom2Completed()) {
                throw new BadRequestException("Room 2 is already completed");
            }
            if (levelNumber != session.getRoom2CurrentLevel()) {
                throw new BadRequestException("Level is not active for Room 2");
            }

            boolean correct = isRoom2LevelAnswerCorrect(levelNumber, request);
            if (!correct) {
                scoringService.applyWrongAnswer(session);
                activityService.add(session, request.playerName().trim() + " submitted an incorrect answer for Room 2 Level " + levelNumber);
                sessionRepository.save(session);
                return new Room2LevelSubmitResponse(
                        false,
                        levelNumber,
                        session.getRoom2CurrentLevel(),
                        false,
                        session.getScore(),
                        session.getServiceHealth(),
                        room2WrongMessage(levelNumber)
                );
            }

            scoringService.applyCorrectAnswer(session);
            boolean completed = levelNumber == ROOM_2_TOTAL_LEVELS;
            if (completed) {
                session.setRoom2Completed(true);
                activityService.add(session, request.playerName().trim() + " completed Room 2");
            } else {
                session.setRoom2CurrentLevel(levelNumber + 1);
                activityService.add(session, request.playerName().trim() + " completed Room 2 Level " + levelNumber);
            }
            sessionRepository.save(session);
            return new Room2LevelSubmitResponse(
                    true,
                    levelNumber,
                    session.getRoom2CurrentLevel(),
                    completed,
                    session.getScore(),
                    session.getServiceHealth(),
                    room2SuccessMessage(levelNumber)
            );
        }
    }

    public Room3LevelSubmitResponse submitRoom3Level(String sessionCode, int levelNumber, Room3LevelSubmitRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        requireText(request.playerName(), "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, request.playerName());
            requireRoom3Accessible(session);
            if (session.isRoom3Completed()) {
                throw new BadRequestException("Room 3 is already completed");
            }
            if (levelNumber != session.getRoom3CurrentLevel()) {
                throw new BadRequestException("Level is not active for Room 3");
            }

            boolean correct = isRoom3LevelAnswerCorrect(levelNumber, request);
            if (!correct) {
                scoringService.applyWrongAnswer(session);
                activityService.add(session, request.playerName().trim() + " submitted an incorrect answer for Room 3 Level " + levelNumber);
                sessionRepository.save(session);
                return new Room3LevelSubmitResponse(
                        false,
                        levelNumber,
                        session.getRoom3CurrentLevel(),
                        false,
                        false,
                        session.getScore(),
                        session.getServiceHealth(),
                        room3WrongMessage(levelNumber)
                );
            }

            scoringService.applyCorrectAnswer(session);
            boolean completed = levelNumber == ROOM_3_TOTAL_LEVELS;
            if (completed) {
                session.setRoom3Completed(true);
                session.setCompleted(true);
                session.setStatus(GameStatus.COMPLETED);
                session.setCurrentRoomId(ROOM_3_ID);
                activityService.add(session, request.playerName().trim() + " completed Room 3");
                activityService.add(session, "Outage resolved");
            } else {
                session.setRoom3CurrentLevel(levelNumber + 1);
                activityService.add(session, request.playerName().trim() + " completed Room 3 Level " + levelNumber);
            }
            sessionRepository.save(session);
            return new Room3LevelSubmitResponse(
                    true,
                    levelNumber,
                    session.getRoom3CurrentLevel(),
                    completed,
                    completed,
                    session.getScore(),
                    session.getServiceHealth(),
                    room3SuccessMessage(levelNumber)
            );
        }
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
            requireActiveRoom(session, roomId);
            boolean correct = room.getCorrectActionId().equalsIgnoreCase(selectedActionId.trim());
            if (correct) {
                scoringService.applyCorrectAnswer(session);
                activityService.add(session, playerName.trim() + " solved " + room.getName());
                boolean finalRoom = room.getRoomId() == roomService.getLastRoomId();
                if (finalRoom) {
                    session.setCompleted(true);
                    session.setStatus(GameStatus.COMPLETED);
                    activityService.add(session, "Outage escaped");
                } else {
                    session.setCurrentRoomId(room.getRoomId() + 1);
                    session.setCurrentRoomHintsUsed(0);
                    activityService.add(session, "Unlocked room " + session.getCurrentRoomId());
                }
                sessionRepository.save(session);
                return new SubmitActionResponse(
                        true,
                        session.getSessionCode(),
                        room.getRoomId(),
                        session.getScore(),
                        session.getServiceHealth(),
                        session.isCompleted(),
                        finalRoom ? "Correct! The team escaped the outage." : "Correct! The next room is unlocked.",
                        room.getRootCause(),
                        room.getLearningPoint()
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
                    "Incorrect. This action does not fix the " + room.getFailureArea() + " failure.",
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
            requireActiveRoom(session, roomId);
            if (room.getHints().isEmpty()) {
                return new HintResponse(0, "No more hints available.", session.getScore(), session.getServiceHealth());
            }

            if (session.getCurrentRoomHintsUsed() == 0) {
                scoringService.applyHint(session);
                session.setCurrentRoomHintsUsed(1);
                activityService.add(session, playerName.trim() + " requested a hint in " + room.getName());
            }
            sessionRepository.save(session);
            return new HintResponse(1, room.getHints().get(0), session.getScore(), session.getServiceHealth());
        }
    }

    public void beginInvestigation(String sessionCode, int roomId, String playerName) {
        Room room = roomService.getRoom(roomId);
        requireText(playerName, "playerName must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, playerName);
            requireActiveRoom(session, roomId);
            activityService.add(session, playerName.trim() + " began investigation in " + room.getName());
            sessionRepository.save(session);
        }
    }

    public void recordEvidenceView(String sessionCode, int roomId, String playerName, String evidenceTitle) {
        roomService.getRoom(roomId);
        requireText(playerName, "playerName must not be blank");
        requireText(evidenceTitle, "evidenceTitle must not be blank");
        GameSession session = getSession(sessionCode);
        synchronized (session) {
            requirePlayer(session, playerName);
            requireActiveRoom(session, roomId);
            activityService.add(session, playerName.trim() + " viewed " + evidenceTitle.trim());
            sessionRepository.save(session);
        }
    }

    public List<ActivityEventDto> getActivity(String sessionCode) {
        return getSession(sessionCode).getActivityFeed().stream().map(this::toActivityDto).toList();
    }

    public GameReportResponse getReport(String sessionCode) {
        GameSession session = getSession(sessionCode);
        Room room = roomService.getRoom(session.getCurrentRoomId());
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
                session.isCompleted() ? room.getLearningPoint() : null,
                roomService.getAllRooms().stream().map(this::toLearningSummary).toList()
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

    private void requireActiveRoom(GameSession session, int roomId) {
        if (session.getCurrentRoomId() != roomId) {
            throw new BadRequestException("Room is not active for this session");
        }
        if (session.isCompleted()) {
            throw new BadRequestException("Session is already completed");
        }
    }

    private void requireRoom1Accessible(GameSession session) {
        if (session.getCurrentRoomId() != ROOM_1_ID) {
            throw new BadRequestException("Room 1 is not active for this session");
        }
        if (session.isCompleted()) {
            throw new BadRequestException("Session is already completed");
        }
    }

    private void requireRoom2Accessible(GameSession session) {
        if (!session.isRoom1Completed()) {
            throw new BadRequestException("Room 2 is locked until Room 1 is completed");
        }
        if (session.getCurrentRoomId() > ROOM_2_ID || session.isCompleted()) {
            throw new BadRequestException("Room 2 is not active for this session");
        }
    }

    private void requireRoom3Accessible(GameSession session) {
        if (!session.isRoom1Completed() || !session.isRoom2Completed()) {
            throw new BadRequestException("Room 3 is locked until Room 2 is completed");
        }
        if (session.isCompleted()) {
            throw new BadRequestException("Session is already completed");
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
                session.getHintsUsed(),
                session.getCurrentRoomHintsUsed() > 0
        );
    }

    private PlayerDto toPlayerDto(Player player) {
        return new PlayerDto(player.getName());
    }

    private ActivityEventDto toActivityDto(ActivityEvent event) {
        return new ActivityEventDto(event.getTimestamp(), event.getMessage());
    }

    private Room1StateResponse toRoom1StateResponse(GameSession session) {
        return new Room1StateResponse(
                ROOM_1_ID,
                ROOM_1_NAME,
                ROOM_1_THEME,
                ROOM_1_STORY,
                session.getRoom1CurrentLevel(),
                ROOM_1_TOTAL_LEVELS,
                session.isRoom1Completed(),
                session.getScore(),
                session.getServiceHealth(),
                room1Level(session.getRoom1CurrentLevel()),
                completedRoom1Messages(session.getRoom1CurrentLevel(), session.isRoom1Completed()),
                session.isRoom1Completed() ? ROOM_1_COMPLETION_MESSAGE : null
        );
    }

    private Room2StateResponse toRoom2StateResponse(GameSession session) {
        return new Room2StateResponse(
                ROOM_2_ID,
                ROOM_2_NAME,
                ROOM_2_THEME,
                ROOM_2_STORY,
                session.getRoom2CurrentLevel(),
                ROOM_2_TOTAL_LEVELS,
                session.isRoom2Completed(),
                session.getScore(),
                session.getServiceHealth(),
                room2Level(session.getRoom2CurrentLevel()),
                completedRoom2Messages(session.getRoom2CurrentLevel(), session.isRoom2Completed()),
                session.isRoom2Completed() ? ROOM_2_COMPLETION_MESSAGE : null
        );
    }

    private Room3StateResponse toRoom3StateResponse(GameSession session) {
        return new Room3StateResponse(
                ROOM_3_ID,
                ROOM_3_NAME,
                ROOM_3_THEME,
                ROOM_3_STORY,
                session.getRoom3CurrentLevel(),
                ROOM_3_TOTAL_LEVELS,
                session.isRoom3Completed(),
                session.getScore(),
                session.getServiceHealth(),
                room3Level(session.getRoom3CurrentLevel()),
                completedRoom3Messages(session.getRoom3CurrentLevel(), session.isRoom3Completed()),
                session.isRoom3Completed() ? ROOM_3_COMPLETION_MESSAGE : null,
                session.isRoom3Completed() ? GAME_COMPLETION_MESSAGE : null
        );
    }

    private Room3LevelDto room3Level(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> new Room3LevelDto(
                    1,
                    "TYPE_COMMAND",
                    "Service Endpoint Inspection",
                    "The `checkout-service` deployment is running, but users cannot access the application. Type the Kubernetes command that checks whether the service has active endpoints.",
                    "Deployment: checkout-service\nNamespace: production\nPod Status: Running\nAvailable Replicas: 2\nUser Traffic: Not reaching pods\nSuspected Issue: Service routing",
                    List.of()
            );
            case 2 -> new Room3LevelDto(
                    2,
                    "ORDER_SEQUENCE",
                    "Incident Investigation Sequence",
                    "Arrange the debugging steps in the correct order to diagnose why traffic is not reaching the pods.",
                    "",
                    List.of(
                            "Compare service selector with pod labels",
                            "Apply selector fix",
                            "Check pod status",
                            "Identify selector mismatch",
                            "Check service endpoints"
                    )
            );
            case 3 -> new Room3LevelDto(
                    3,
                    "TYPE_COMMAND",
                    "Apply Service Selector Fix",
                    "The service selector is wrong. The deployment pods have label `app=checkout`, but the service selector is currently pointing to `app=payment`. Type the command that updates the service selector to `app=checkout`.",
                    "deployment:\n  name: checkout-service\n  labels:\n    app: checkout\n\nservice:\n  name: checkout-service\n  currentSelector:\n    app: payment\n\nrequiredSelector:\n  app: checkout",
                    List.of()
            );
            default -> throw new BadRequestException("Invalid Room 3 level");
        };
    }

    private Room2LevelDto room2Level(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> new Room2LevelDto(
                    1,
                    "CHOOSE_EVIDENCE",
                    "Container Status Inspection",
                    "The `order-service` container is not serving requests. Inspect the evidence and select the status that shows the real issue.",
                    "Container: order-service\nImage: order-service:v2\nRestart Count: 5\nStatus: ----------\nLast Exit Code: 1",
                    List.of("Running", "Pending", "CrashLoopBackOff", "Completed")
            );
            case 2 -> new Room2LevelDto(
                    2,
                    "ORDER_SEQUENCE",
                    "Container Lifecycle Sequence",
                    "Arrange the container lifecycle steps in the correct order.",
                    "",
                    List.of(
                            "Container Started",
                            "Service Ready",
                            "Image Pulled",
                            "Health Check Passed",
                            "Container Created"
                    )
            );
            case 3 -> new Room2LevelDto(
                    3,
                    "SELECT_ACTION",
                    "Safe Container Recovery",
                    "The container is crashing because the new image version is unstable. Choose the safest recovery action.",
                    "Service: order-service\nCurrent Image: order-service:v2\nPrevious Stable Image: order-service:v1\nStatus: CrashLoopBackOff\nError: Application failed during startup",
                    List.of(
                            "Rollback to order-service:v1",
                            "Delete the database",
                            "Increase frontend replicas",
                            "Disable all health checks"
                    )
            );
            default -> throw new BadRequestException("Invalid Room 2 level");
        };
    }

    private Room1LevelDto room1Level(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> new Room1LevelDto(
                    1,
                    "FILL_BLANK",
                    "Service Health Check",
                    "The `customer-api` microservice is deployed, but the service status is missing from the incident dashboard. Fill in the correct status value.",
                    "microservice: customer-api\nnamespace: production\nstatus: ______",
                    List.of("Running", "CrashLoopBackOff", "Pending", "Unknown"),
                    List.of(),
                    List.of(),
                    Map.of()
            );
            case 2 -> new Room1LevelDto(
                    2,
                    "MATCH_PAIRS",
                    "Service Responsibility Mapping",
                    "Match each microservice with its correct responsibility.",
                    "",
                    List.of(),
                    List.of("customer-api", "order-service", "database-service"),
                    List.of(
                            "Handles customer requests",
                            "Processes customer orders",
                            "Stores application data",
                            "Deletes service logs",
                            "Restarts all systems"
                    ),
                    Map.of()
            );
            case 3 -> new Room1LevelDto(
                    3,
                    "DRAG_DROP",
                    "Configuration Recovery",
                    "The `customer-api` service cannot connect to the database. The `DB_HOST` environment variable is missing. Drag the correct value into the configuration slot.",
                    "service: customer-api\nenv:\n  DB_HOST: ______",
                    List.of("database-service", "frontend-ui", "payment-gateway", "logging-service"),
                    List.of(),
                    List.of(),
                    Map.of()
            );
            default -> throw new BadRequestException("Invalid Room 1 level");
        };
    }

    private List<String> completedRoom1Messages(int currentLevel, boolean completed) {
        if (completed) {
            return List.of(room1SuccessMessage(1), room1SuccessMessage(2), room1SuccessMessage(3));
        }
        if (currentLevel == 2) {
            return List.of(room1SuccessMessage(1));
        }
        if (currentLevel == 3) {
            return List.of(room1SuccessMessage(1), room1SuccessMessage(2));
        }
        return List.of();
    }

    private boolean isRoom1LevelAnswerCorrect(int levelNumber, Room1LevelSubmitRequest request) {
        return switch (levelNumber) {
            case 1 -> "Running".equals(request.selectedStatus());
            case 2 -> ROOM_1_LEVEL_2_PAIRS.equals(request.matchedPairs());
            case 3 -> "database-service".equals(request.selectedDbHost());
            default -> throw new BadRequestException("Invalid Room 1 level");
        };
    }

    private boolean isRoom2LevelAnswerCorrect(int levelNumber, Room2LevelSubmitRequest request) {
        return switch (levelNumber) {
            case 1 -> "CrashLoopBackOff".equals(request.answer());
            case 2 -> ROOM_2_LIFECYCLE_ORDER.equals(request.orderedSteps());
            case 3 -> "Rollback to order-service:v1".equals(request.answer());
            default -> throw new BadRequestException("Invalid Room 2 level");
        };
    }

    private boolean isRoom3LevelAnswerCorrect(int levelNumber, Room3LevelSubmitRequest request) {
        return switch (levelNumber) {
            case 1 -> isRoom3EndpointCommand(request.command());
            case 2 -> ROOM_3_INVESTIGATION_ORDER.equals(request.orderedSteps());
            case 3 -> isRoom3FixCommand(request.command());
            default -> throw new BadRequestException("Invalid Room 3 level");
        };
    }

    private boolean isRoom3EndpointCommand(String command) {
        String normalized = normalizeCommand(command);
        return normalized.equals("kubectl get endpoints checkout-service")
                || normalized.equals("kubectl get ep checkout-service")
                || normalized.equals("kubectl get endpoints checkout-service -n production")
                || normalized.equals("kubectl get ep checkout-service -n production");
    }

    private boolean isRoom3FixCommand(String command) {
        String normalized = normalizeCommand(command);
        if (normalized.contains(" delete ") || normalized.contains(" scale ") || normalized.contains(" restart ")) {
            return false;
        }
        if (normalized.equals("kubectl set selector service checkout-service app=checkout")
                || normalized.equals("kubectl set selector svc checkout-service app=checkout")
                || normalized.equals("kubectl set selector service checkout-service app=checkout -n production")
                || normalized.equals("kubectl set selector svc checkout-service app=checkout -n production")) {
            return true;
        }
        boolean patchService = normalized.startsWith("kubectl patch service checkout-service ")
                || normalized.startsWith("kubectl patch svc checkout-service ");
        if (!patchService) {
            return false;
        }
        return normalized.contains("app") && normalized.contains("checkout") && normalized.contains("selector");
    }

    private String normalizeCommand(String command) {
        if (command == null) {
            return "";
        }
        return command.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private String room1SuccessMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "Health check passed. The customer-api service is running successfully.";
            case 2 -> "Service mapping completed. Each microservice responsibility is correctly identified.";
            case 3 -> "Configuration restored. customer-api can now connect to database-service.";
            default -> throw new BadRequestException("Invalid Room 1 level");
        };
    }

    private String room1WrongMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "That status does not represent a healthy running service. Try again.";
            case 2 -> "One or more services are mapped incorrectly. Review the service responsibilities and try again.";
            case 3 -> "That value does not point to the database service. Choose the correct service host.";
            default -> throw new BadRequestException("Invalid Room 1 level");
        };
    }

    private List<String> completedRoom2Messages(int currentLevel, boolean completed) {
        if (completed) {
            return List.of(room2SuccessMessage(1), room2SuccessMessage(2), room2SuccessMessage(3));
        }
        if (currentLevel == 2) {
            return List.of(room2SuccessMessage(1));
        }
        if (currentLevel == 3) {
            return List.of(room2SuccessMessage(1), room2SuccessMessage(2));
        }
        return List.of();
    }

    private String room2SuccessMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "Issue identified. The order-service container is repeatedly crashing.";
            case 2 -> "Lifecycle sequence completed. The container startup flow is now correctly understood.";
            case 3 -> "Recovery action applied. order-service has been restored using the previous stable image.";
            default -> throw new BadRequestException("Invalid Room 2 level");
        };
    }

    private String room2WrongMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "That status does not explain the repeated container failure. Review the evidence and try again.";
            case 2 -> "The lifecycle order is incorrect. Review how a container starts and try again.";
            case 3 -> "That action does not safely recover the failing container. Choose the action that restores the last stable version.";
            default -> throw new BadRequestException("Invalid Room 2 level");
        };
    }

    private List<String> completedRoom3Messages(int currentLevel, boolean completed) {
        if (completed) {
            return List.of(room3SuccessMessage(1), room3SuccessMessage(2), room3SuccessMessage(3));
        }
        if (currentLevel == 2) {
            return List.of(room3SuccessMessage(1));
        }
        if (currentLevel == 3) {
            return List.of(room3SuccessMessage(1), room3SuccessMessage(2));
        }
        return List.of();
    }

    private String room3SuccessMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "Command accepted. The service endpoint check shows that checkout-service has zero active endpoints.";
            case 2 -> "Investigation sequence completed. The correct troubleshooting path has been identified.";
            case 3 -> "Fix applied. The service selector now matches the checkout-service pod label, and traffic can reach the application.";
            default -> throw new BadRequestException("Invalid Room 3 level");
        };
    }

    private String room3WrongMessage(int levelNumber) {
        return switch (levelNumber) {
            case 1 -> "That command does not check service endpoints. Try a kubectl command that inspects endpoints for checkout-service.";
            case 2 -> "The sequence is not correct. Start with checking pod health, then inspect service routing.";
            case 3 -> "That command does not fix the selector mismatch. Use a command that updates checkout-service selector to app=checkout.";
            default -> throw new BadRequestException("Invalid Room 3 level");
        };
    }

    private RoomLearningSummaryDto toLearningSummary(Room room) {
        return new RoomLearningSummaryDto(room.getRoomId(), room.getName(), learningSummary(room.getRoomId()));
    }

    private String learningSummary(int roomId) {
        return switch (roomId) {
            case 1 -> "Microservice configuration issue: customer-api needed a valid DB_HOST value for database connectivity.";
            case 2 -> "Container resource issue: memory limit too low, causing OOMKilled and CrashLoopBackOff.";
            case 3 -> "Kubernetes service discovery issue: Service selector did not match pod labels, causing empty endpoints.";
            default -> "Review the room evidence and remediation decision.";
        };
    }
}
