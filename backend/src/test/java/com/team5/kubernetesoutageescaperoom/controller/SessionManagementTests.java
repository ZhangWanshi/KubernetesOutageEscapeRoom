package com.team5.kubernetesoutageescaperoom.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SessionManagementTests {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private String createSession() throws Exception {
        String body = mockMvc.perform(post("/api/sessions"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("sessionCode").asText();
    }

    private void join(String code, String player) throws Exception {
        mockMvc.perform(post("/api/sessions/{code}/join", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"" + player + "\"}"));
    }

    // --- join ---

    @Test
    void firstPlayerJoins_becomesHostDirectly() throws Exception {
        String code = createSession();
        mockMvc.perform(post("/api/sessions/{code}/join", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Alice\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players[0].name").value("Alice"))
                .andExpect(jsonPath("$.pendingPlayers").isEmpty());
    }

    @Test
    void secondPlayerJoins_goesToPending() throws Exception {
        String code = createSession();
        join(code, "Alice");
        mockMvc.perform(post("/api/sessions/{code}/join", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Bob\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingPlayers[0].name").value("Bob"));
    }

    @Test
    void duplicateName_returnsConflict() throws Exception {
        String code = createSession();
        join(code, "Alice");
        mockMvc.perform(post("/api/sessions/{code}/join", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Alice\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void joinUnknownSession_returnsNotFound() throws Exception {
        mockMvc.perform(post("/api/sessions/XXXXXX/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Alice\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void joinWithBlankName_returnsBadRequest() throws Exception {
        String code = createSession();
        mockMvc.perform(post("/api/sessions/{code}/join", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // --- approve / decline ---

    @Test
    void approvePlayer_movesFromPendingToPlayers() throws Exception {
        String code = createSession();
        join(code, "Alice");
        join(code, "Bob");
        mockMvc.perform(post("/api/sessions/{code}/players/Bob/approve", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players[1].name").value("Bob"))
                .andExpect(jsonPath("$.pendingPlayers").isEmpty());
    }

    @Test
    void declinePlayer_removesFromPending() throws Exception {
        String code = createSession();
        join(code, "Alice");
        join(code, "Bob");
        mockMvc.perform(post("/api/sessions/{code}/players/Bob/decline", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingPlayers").isEmpty());
    }

    @Test
    void approveUnknownPlayer_returnsNotFound() throws Exception {
        String code = createSession();
        join(code, "Alice");
        mockMvc.perform(post("/api/sessions/{code}/players/Nobody/approve", code))
                .andExpect(status().isNotFound());
    }

    // --- start ---

    @Test
    void startSession_setsStatusInProgress() throws Exception {
        String code = createSession();
        mockMvc.perform(post("/api/sessions/{code}/start", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    // --- state ---

    @Test
    void getState_returnsCurrentState() throws Exception {
        String code = createSession();
        mockMvc.perform(get("/api/sessions/{code}/state", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionCode").value(code));
    }

    @Test
    void getStateUnknownSession_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/sessions/XXXXXX/state"))
                .andExpect(status().isNotFound());
    }

    // --- rooms endpoint ---

    @Test
    void getRooms_returnsThreeRooms() throws Exception {
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void getRoomDetails_returnsEvidenceAndActions() throws Exception {
        mockMvc.perform(get("/api/rooms/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").value(1))
                .andExpect(jsonPath("$.evidence").isNotEmpty())
                .andExpect(jsonPath("$.actions").isNotEmpty());
    }

    @Test
    void getRoomDetails_unknownRoom_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/rooms/99"))
                .andExpect(status().isNotFound());
    }

    // --- activity feed ---

    @Test
    void activityFeed_containsJoinEvent() throws Exception {
        String code = createSession();
        join(code, "Alice");
        mockMvc.perform(get("/api/sessions/{code}/activity", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].message").value("Alice created the session"));
    }
}
