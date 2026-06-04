package com.team5.kubernetesoutageescaperoom.controller;

import com.team5.kubernetesoutageescaperoom.dto.RoomDetailsDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomSummaryDto;
import com.team5.kubernetesoutageescaperoom.service.RoomService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<RoomSummaryDto> getRooms() {
        return roomService.getRooms();
    }

    @GetMapping("/{roomId}")
    public RoomDetailsDto getRoom(@PathVariable int roomId) {
        return roomService.getRoomDetails(roomId);
    }

    @GetMapping("/{roomId}/content")
    public ResponseEntity<String> getRoomContent(@PathVariable String roomId) {
        ClassPathResource resource = new ClassPathResource("content/r" + roomId + ".json");
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            String json = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
