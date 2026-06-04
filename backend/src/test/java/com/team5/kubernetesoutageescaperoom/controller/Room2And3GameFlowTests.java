package com.team5.kubernetesoutageescaperoom.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class Room2And3GameFlowTests {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    /** Creates a session, joins a player, and completes all 3 levels of Room 1. Returns session code. */
    private String completedRoom1Session() throws Exception {
        String body = mockMvc.perform(post("/api/sessions"))
                .andReturn().getResponse().getContentAsString();
        String code = objectMapper.readTree(body).get("sessionCode").asText();

        mockMvc.perform(post("/api/sessions/{c}/join", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\"}"));

        // Room 1 Level 1
        mockMvc.perform(post("/api/sessions/{c}/rooms/1/levels/1/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"selectedStatus\":\"Running\"}"));

        // Room 1 Level 2
        String pairs = objectMapper.writeValueAsString(Map.of(
                "playerName", "Player1",
                "matchedPairs", Map.of(
                        "customer-api", "Handles customer requests",
                        "order-service", "Processes customer orders",
                        "database-service", "Stores application data"
                )
        ));
        mockMvc.perform(post("/api/sessions/{c}/rooms/1/levels/2/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pairs));

        // Room 1 Level 3
        mockMvc.perform(post("/api/sessions/{c}/rooms/1/levels/3/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"selectedDbHost\":\"database-service\"}"));

        return code;
    }

    // ─── Room 2 ───────────────────────────────────────────────────────────────

    @Test
    void room2State_afterRoom1Completed_isAccessible() throws Exception {
        String code = completedRoom1Session();
        mockMvc.perform(get("/api/sessions/{c}/rooms/2/state", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").value(2))
                .andExpect(jsonPath("$.currentLevel").value(1));
    }

    @Test
    void room2Level1_wrongAnswer_decrementsScore() throws Exception {
        String code = completedRoom1Session();
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/1/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"answer\":\"Running\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false));
    }

    @Test
    void room2Level1_correctAnswer_advancesToLevel2() throws Exception {
        String code = completedRoom1Session();
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/1/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"answer\":\"CrashLoopBackOff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(2));
    }

    @Test
    void room2Level2_correctOrder_advancesToLevel3() throws Exception {
        String code = completedRoom1Session();
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/1/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"answer\":\"CrashLoopBackOff\"}"));

        String req = objectMapper.writeValueAsString(Map.of(
                "playerName", "Player1",
                "orderedSteps", List.of("Image Pulled", "Container Created", "Container Started", "Health Check Passed", "Service Ready")
        ));
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/2/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(req))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    @Test
    void room2Level3_correctAction_completesRoom2() throws Exception {
        String code = completedRoom1Session();

        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/1/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"answer\":\"CrashLoopBackOff\"}"));

        String level2 = objectMapper.writeValueAsString(Map.of(
                "playerName", "Player1",
                "orderedSteps", List.of("Image Pulled", "Container Created", "Container Started", "Health Check Passed", "Service Ready")
        ));
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/2/submit", code)
                .contentType(MediaType.APPLICATION_JSON).content(level2));

        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/3/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"answer\":\"Rollback to order-service:v1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.roomCompleted").value(true));
    }

    @Test
    void room2_lockedBeforeRoom1Completed_returnsBadRequest() throws Exception {
        String body = mockMvc.perform(post("/api/sessions"))
                .andReturn().getResponse().getContentAsString();
        String code = objectMapper.readTree(body).get("sessionCode").asText();
        mockMvc.perform(post("/api/sessions/{c}/join", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\"}"));

        mockMvc.perform(get("/api/sessions/{c}/rooms/2/state", code))
                .andExpect(status().isBadRequest());
    }

    // ─── Room 3 ───────────────────────────────────────────────────────────────

    private String completedRoom2Session() throws Exception {
        String code = completedRoom1Session();

        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/1/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"answer\":\"CrashLoopBackOff\"}"));

        String level2 = objectMapper.writeValueAsString(Map.of(
                "playerName", "Player1",
                "orderedSteps", List.of("Image Pulled", "Container Created", "Container Started", "Health Check Passed", "Service Ready")
        ));
        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/2/submit", code)
                .contentType(MediaType.APPLICATION_JSON).content(level2));

        mockMvc.perform(post("/api/sessions/{c}/rooms/2/levels/3/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"answer\":\"Rollback to order-service:v1\"}"));

        return code;
    }

    @Test
    void room3State_afterRoom2Completed_isAccessible() throws Exception {
        String code = completedRoom2Session();
        mockMvc.perform(get("/api/sessions/{c}/rooms/3/state", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").value(3));
    }

    @Test
    void room3Level1_correctCommand_advancesToLevel2() throws Exception {
        String code = completedRoom2Session();
        mockMvc.perform(post("/api/sessions/{c}/rooms/3/levels/1/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"command\":\"kubectl get endpoints checkout-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    @Test
    void room3Level1_wrongCommand_returnsFalse() throws Exception {
        String code = completedRoom2Session();
        mockMvc.perform(post("/api/sessions/{c}/rooms/3/levels/1/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"command\":\"kubectl get pods\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false));
    }

    @Test
    void room3AllLevels_correct_completesGame() throws Exception {
        String code = completedRoom2Session();

        mockMvc.perform(post("/api/sessions/{c}/rooms/3/levels/1/submit", code)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"playerName\":\"Player1\",\"command\":\"kubectl get endpoints checkout-service\"}"));

        String level2 = objectMapper.writeValueAsString(Map.of(
                "playerName", "Player1",
                "orderedSteps", List.of(
                        "Check pod status",
                        "Check service endpoints",
                        "Compare service selector with pod labels",
                        "Identify selector mismatch",
                        "Apply selector fix"
                )
        ));
        mockMvc.perform(post("/api/sessions/{c}/rooms/3/levels/2/submit", code)
                .contentType(MediaType.APPLICATION_JSON).content(level2));

        mockMvc.perform(post("/api/sessions/{c}/rooms/3/levels/3/submit", code)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Player1\",\"command\":\"kubectl set selector service checkout-service app=checkout\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.gameCompleted").value(true));
    }
}
