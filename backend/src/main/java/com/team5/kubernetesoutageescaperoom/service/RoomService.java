package com.team5.kubernetesoutageescaperoom.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team5.kubernetesoutageescaperoom.dto.ActionOptionDto;
import com.team5.kubernetesoutageescaperoom.dto.EvidenceDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomDetailsDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomSummaryDto;
import com.team5.kubernetesoutageescaperoom.exception.NotFoundException;
import com.team5.kubernetesoutageescaperoom.model.ActionOption;
import com.team5.kubernetesoutageescaperoom.model.Evidence;
import com.team5.kubernetesoutageescaperoom.model.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
public class RoomService {
    private static final Logger LOGGER = LoggerFactory.getLogger(RoomService.class);
    private static final List<String> SCENARIO_FILES = List.of(
            "scenarios/room1.json",
            "scenarios/room2.json",
            "scenarios/room3.json"
    );

    private final List<Room> rooms;

    public RoomService(ObjectMapper objectMapper) {
        this.rooms = loadRooms(objectMapper);
    }

    public List<RoomSummaryDto> getRooms() {
        return rooms.stream().map(this::toSummary).toList();
    }

    public RoomDetailsDto getRoomDetails(int roomId) {
        return toDetails(getRoom(roomId));
    }

    public Room getRoom(int roomId) {
        return rooms.stream()
                .filter(room -> room.getRoomId() == roomId)
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Room not found"));
    }

    public boolean actionExists(int roomId, String selectedActionId) {
        return getRoom(roomId).getActions().stream()
                .anyMatch(action -> action.getId().equalsIgnoreCase(selectedActionId));
    }

    public int getLastRoomId() {
        return rooms.stream()
                .mapToInt(Room::getRoomId)
                .max()
                .orElse(1);
    }

    public List<Room> getAllRooms() {
        return rooms;
    }

    private List<Room> loadRooms(ObjectMapper objectMapper) {
        List<Room> loadedRooms = SCENARIO_FILES.stream()
                .map(file -> loadRoom(objectMapper, file))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(Room::getRoomId))
                .toList();
        if (loadedRooms.size() == SCENARIO_FILES.size()) {
            return loadedRooms;
        }
        LOGGER.warn("Unable to load every scenario JSON file. Falling back to built-in room data.");
        return fallbackRooms();
    }

    private Room loadRoom(ObjectMapper objectMapper, String scenarioFile) {
        ClassPathResource resource = new ClassPathResource(scenarioFile);
        if (!resource.exists()) {
            return null;
        }
        try {
            return objectMapper.readValue(resource.getInputStream(), Room.class);
        } catch (IOException exception) {
            LOGGER.warn("Unable to load {}.", scenarioFile, exception);
            return null;
        }
    }

    private List<Room> fallbackRooms() {
        return List.of(fallbackRoom1(), fallbackRoom2(), fallbackRoom3());
    }

    private RoomSummaryDto toSummary(Room room) {
        return new RoomSummaryDto(
                room.getRoomId(),
                room.getName(),
                room.getTheme(),
                room.getDifficulty(),
                room.getFailureArea(),
                false
        );
    }

    private RoomDetailsDto toDetails(Room room) {
        return new RoomDetailsDto(
                room.getRoomId(),
                room.getName(),
                room.getTheme(),
                room.getDifficulty(),
                room.getFailureArea(),
                room.getTimeLimitSeconds(),
                room.getStory(),
                room.getEvidence().stream().map(this::toEvidenceDto).toList(),
                room.getActions().stream().map(this::toActionDto).toList()
        );
    }

    private EvidenceDto toEvidenceDto(Evidence evidence) {
        return new EvidenceDto(evidence.getType(), evidence.getTitle(), evidence.getContent());
    }

    private ActionOptionDto toActionDto(ActionOption action) {
        return new ActionOptionDto(action.getId(), action.getText());
    }

    private Room fallbackRoom1() {
        Room room = new Room();
        room.setRoomId(1);
        room.setName("Microservice Incident Response");
        room.setTheme("Forest");
        room.setDifficulty("EASY");
        room.setFailureArea("APIs / microservices");
        room.setTimeLimitSeconds(300);
        room.setStory("A production incident has affected the Customer Management Platform. Your task is to restore the system by checking service health, identifying service responsibilities, and fixing a missing configuration value.");
        room.setEvidence(List.of(
                new Evidence("SERVICE_MAP", "Service Dependency Map", "Browser -> API Gateway -> Order Service -> Inventory Service"),
                new Evidence("API_RESPONSE", "Order API Response", "POST /api/orders returns HTTP 500: Unable to complete order"),
                new Evidence("LOG", "Order Service Logs", "INFO Received order request for productId=45\nINFO Calling Inventory Service: http://inventory-service/inventory/check\nERROR Inventory check failed: 404 Not Found"),
                new Evidence("API_DOC", "Inventory API Documentation", "Available endpoint: GET /api/inventory/check?productId={id}"),
                new Evidence("CONFIG", "Order Service Config", "inventory.service.base-url=http://inventory-service\ninventory.service.check-path=/inventory/check")
        ));
        room.setActions(List.of(
                new ActionOption("A", "Restart the Order Service pod"),
                new ActionOption("B", "Increase memory limit for Order Service"),
                new ActionOption("C", "Update the Inventory Service path to /api/inventory/check"),
                new ActionOption("D", "Scale Inventory Service to 3 replicas"),
                new ActionOption("E", "Delete and recreate the database")
        ));
        room.setCorrectActionId("C");
        room.setHints(List.of(
                "Both services are running. Look at the API response from the dependency call.",
                "The Order Service receives a 404 from Inventory Service.",
                "Compare the path in the logs with the Inventory API documentation."
        ));
        room.setRootCause("Order Service called /inventory/check, but Inventory Service exposes /api/inventory/check.");
        room.setLearningPoint("Healthy microservices can still fail when API contracts or configured endpoint paths do not match.");
        return room;
    }

    private Room fallbackRoom2() {
        Room room = new Room();
        room.setRoomId(2);
        room.setName("Desert Resource Survival");
        room.setTheme("Desert");
        room.setDifficulty("MEDIUM");
        room.setFailureArea("Containers / resource limits");
        room.setTimeLimitSeconds(360);
        room.setStory("The metrics pipeline is stranded in a resource desert. The pod starts, then dies whenever telemetry volume rises.");
        room.setEvidence(List.of(
                new Evidence("POD_STATUS", "Pod Status", "metrics-aggregator-7c9d8f: CrashLoopBackOff\nLast State: Terminated\nReason: OOMKilled\nExit Code: 137"),
                new Evidence("METRIC", "Memory Metrics", "Container memory usage peaks at 246Mi during ingestion bursts."),
                new Evidence("CONFIG", "Deployment Resource Limits", "requests.memory=128Mi\nlimits.memory=192Mi"),
                new Evidence("LOG", "Aggregator Logs", "INFO Loaded 50000 metric samples\nWARN Heap pressure above 90%\nERROR Process terminated before batch flush"),
                new Evidence("K8S_EVENT", "Kubernetes Events", "Container metrics-aggregator was killed because it exceeded its memory limit.")
        ));
        room.setActions(List.of(
                new ActionOption("A", "Increase the metrics-aggregator memory limit and request"),
                new ActionOption("B", "Change the Service selector"),
                new ActionOption("C", "Disable the readiness probe"),
                new ActionOption("D", "Restart the database pod"),
                new ActionOption("E", "Rename the container image tag")
        ));
        room.setCorrectActionId("A");
        room.setHints(List.of(
                "The pod is not failing because traffic cannot reach it.",
                "Exit code 137 and OOMKilled point to memory pressure.",
                "Compare observed memory usage with the configured container limit."
        ));
        room.setRootCause("The metrics-aggregator container needed about 246Mi during bursts, but its memory limit was only 192Mi.");
        room.setLearningPoint("Container memory limits protect the cluster, but limits that are too low cause OOMKilled restarts and service instability.");
        return room;
    }

    private Room fallbackRoom3() {
        Room room = new Room();
        room.setRoomId(3);
        room.setName("Snow Mountain Service Pass");
        room.setTheme("Snow Mountain");
        room.setDifficulty("HARD");
        room.setFailureArea("Kubernetes service discovery");
        room.setTimeLimitSeconds(420);
        room.setStory("At the frozen summit, the API pods are healthy but no traffic reaches them. The escape route is blocked by an empty Service endpoint list.");
        room.setEvidence(List.of(
                new Evidence("POD_STATUS", "Pod Status", "game-api-6f9dd: Running\nReadiness: passing\nLabels: app=game-api, tier=backend"),
                new Evidence("SERVICE", "Service Description", "service/game-api\nSelector: app=api\nEndpoints: <none>"),
                new Evidence("LOG", "API Logs", "INFO Started Game API on port 8081\nINFO Readiness check passed\nINFO No incoming requests in the last 5 minutes"),
                new Evidence("HEALTH_CHECK", "Health Check", "GET http://pod-ip:8081/actuator/health -> 200 UP"),
                new Evidence("YAML", "Deployment Labels", "metadata.labels.app=game-api\nspec.template.metadata.labels.app=game-api")
        ));
        room.setActions(List.of(
                new ActionOption("A", "Fix the Service selector so it matches app=game-api"),
                new ActionOption("B", "Increase the API CPU limit"),
                new ActionOption("C", "Rebuild the Docker image"),
                new ActionOption("D", "Delete the readiness probe"),
                new ActionOption("E", "Scale the database StatefulSet")
        ));
        room.setCorrectActionId("A");
        room.setHints(List.of(
                "The pod is healthy when called directly.",
                "A Service with no endpoints usually has a selector mismatch or no ready pods.",
                "Compare the Service selector with the Deployment pod labels."
        ));
        room.setRootCause("The Service selected app=api, but the Deployment pods were labelled app=game-api, so Kubernetes created no endpoints.");
        room.setLearningPoint("Kubernetes Services route to pods through label selectors. A small label mismatch can make healthy pods unreachable.");
        return room;
    }
}
