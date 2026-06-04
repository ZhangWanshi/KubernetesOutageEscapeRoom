package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.dto.RoomDetailsDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomSummaryDto;
import com.team5.kubernetesoutageescaperoom.exception.NotFoundException;
import com.team5.kubernetesoutageescaperoom.model.Room;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoomServiceTest {

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService(new ObjectMapper());
    }

    @Test
    void getRooms_returnsThreeRooms() {
        List<RoomSummaryDto> rooms = roomService.getRooms();
        assertThat(rooms).hasSize(3);
    }

    @Test
    void getRoom_returnsCorrectRoom() {
        Room room = roomService.getRoom(1);
        assertThat(room.getRoomId()).isEqualTo(1);
    }

    @Test
    void getRoom_unknownId_throwsNotFound() {
        assertThatThrownBy(() -> roomService.getRoom(99))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getRoomDetails_returnsDetails() {
        RoomDetailsDto details = roomService.getRoomDetails(1);
        assertThat(details.roomId()).isEqualTo(1);
        assertThat(details.evidence()).isNotEmpty();
        assertThat(details.actions()).isNotEmpty();
    }

    @Test
    void actionExists_validAction_returnsTrue() {
        Room room = roomService.getRoom(1);
        String validId = room.getActions().get(0).getId();
        assertThat(roomService.actionExists(1, validId)).isTrue();
    }

    @Test
    void actionExists_invalidAction_returnsFalse() {
        assertThat(roomService.actionExists(1, "INVALID")).isFalse();
    }

    @Test
    void getLastRoomId_returns3() {
        assertThat(roomService.getLastRoomId()).isEqualTo(3);
    }

    @Test
    void getAllRooms_returnsAllRooms() {
        assertThat(roomService.getAllRooms()).hasSize(3);
    }
}
