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
import java.util.List;

@Service
public class RoomService {
    private static final int ROOM_1_ID = 1;
    private static final Logger LOGGER = LoggerFactory.getLogger(RoomService.class);

    private final Room room1;

    public RoomService(ObjectMapper objectMapper) {
        this.room1 = loadRoom1(objectMapper);
    }

    public List<RoomSummaryDto> getRooms() {
        return List.of(toSummary(room1));
    }

    public RoomDetailsDto getRoomDetails(int roomId) {
        return toDetails(getRoom(roomId));
    }

    public Room getRoom(int roomId) {
        if (roomId != ROOM_1_ID) {
            throw new NotFoundException("Room not found");
        }
        return room1;
    }

    public boolean actionExists(String selectedActionId) {
        return room1.getActions().stream()
                .anyMatch(action -> action.getId().equalsIgnoreCase(selectedActionId));
    }

    private Room loadRoom1(ObjectMapper objectMapper) {
        ClassPathResource resource = new ClassPathResource("scenarios/room1.json");
        if (resource.exists()) {
            try {
                return objectMapper.readValue(resource.getInputStream(), Room.class);
            } catch (IOException exception) {
                LOGGER.warn("Unable to load scenarios/room1.json. Falling back to built-in Room 1 data.", exception);
                return fallbackRoom1();
            }
        }
        return fallbackRoom1();
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
        room.setName("Jungle Microservice Quest");
        room.setTheme("jungle");
        room.setDifficulty("EASY");
        room.setFailureArea("Microservices / API");
        room.setTimeLimitSeconds(300);
        room.setStory("Users cannot place orders. The frontend is working, but the Order Service fails when checking stock with the Inventory Service.");
        room.setEvidence(List.of(
                new Evidence("SERVICE_MAP", "Service Dependency Map", "Frontend -> Order Service -> Inventory Service"),
                new Evidence("API_RESPONSE", "Order API Response", "POST /api/orders returns HTTP 500: Unable to complete order"),
                new Evidence("LOG", "Order Service Logs", "INFO Received order request for productId=45\nINFO Calling Inventory Service: http://inventory-service/inventory/check\nERROR Inventory check failed: 404 Not Found\nERROR Order could not be completed"),
                new Evidence("API_DOC", "Inventory API Documentation", "Available endpoint: GET /api/inventory/check?productId={id}"),
                new Evidence("CONFIG", "Order Service Config", "inventory.service.base-url=http://inventory-service\ninventory.service.check-path=/inventory/check")
        ));
        room.setActions(List.of(
                new ActionOption("A", "Restart the Order Service pod"),
                new ActionOption("B", "Increase memory limit for Order Service"),
                new ActionOption("C", "Update Inventory Service API path to /api/inventory/check"),
                new ActionOption("D", "Scale Inventory Service to 3 replicas"),
                new ActionOption("E", "Delete and recreate the database")
        ));
        room.setCorrectActionId("C");
        room.setHints(List.of(
                "Both services are running. Look at API responses and logs.",
                "The Order Service receives a 404 from Inventory Service.",
                "Compare the endpoint in the logs with the Inventory API documentation."
        ));
        room.setRootCause("Order Service called /inventory/check, but Inventory Service exposes /api/inventory/check.");
        room.setLearningPoint("In microservice systems, a service can be healthy but still fail due to an API contract or configuration mismatch.");
        return room;
    }
}
