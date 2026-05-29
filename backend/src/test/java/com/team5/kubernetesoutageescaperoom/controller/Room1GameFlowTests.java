package com.team5.kubernetesoutageescaperoom.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class Room1GameFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void creatingSessionInitializesScoreAndHealth() throws Exception {
        mockMvc.perform(post("/api/sessions"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionCode").isNotEmpty())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.currentRoomId").value(1))
                .andExpect(jsonPath("$.score").value(100))
                .andExpect(jsonPath("$.serviceHealth").value(100))
                .andExpect(jsonPath("$.completed").value(false));
    }

    @Test
    void joiningSessionAddsPlayer() throws Exception {
        String sessionCode = createSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/join", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players[0].name").value("Madhuri"));
    }

    @Test
    void correctAnswerReturnsCorrectTrueAndIncreasesScore() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedActionId\":\"C\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.score").value(120))
                .andExpect(jsonPath("$.completed").value(false))
                .andExpect(jsonPath("$.rootCause").value(startsWith("Order Service called")));

        mockMvc.perform(get("/api/sessions/{sessionCode}/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentRoomId").value(2))
                .andExpect(jsonPath("$.completed").value(false));
    }

    @Test
    void wrongAnswerReducesScoreAndServiceHealth() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedActionId\":\"A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.score").value(90))
                .andExpect(jsonPath("$.serviceHealth").value(90))
                .andExpect(jsonPath("$.rootCause").value(nullValue()));
    }

    @Test
    void hintRequestReturnsFirstHintAndReducesScore() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/hint", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hintNumber").value(1))
                .andExpect(jsonPath("$.hint").value("Both services are running. Look at the API response from the dependency call."))
                .andExpect(jsonPath("$.score").value(95));
    }

    @Test
    void getRoomOneDoesNotExposeCorrectActionId() throws Exception {
        mockMvc.perform(get("/api/rooms/1"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("correctActionId"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("rootCause"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("learningPoint"))));
    }

    @Test
    void getRoomTwoReturnsDesertScenario() throws Exception {
        mockMvc.perform(get("/api/rooms/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Desert Resource Survival"))
                .andExpect(jsonPath("$.theme").value("Desert"))
                .andExpect(jsonPath("$.failureArea").value("Containers / resource limits"));
    }

    @Test
    void invalidSessionCodeReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/sessions/NOPE99/state"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Session not found"));
    }

    @Test
    void invalidSelectedActionIdReturnsBadRequest() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedActionId\":\"Z\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid selectedActionId"));
    }

    @Test
    void cannotSubmitRoomThatIsNotActive() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedActionId\":\"A\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Room is not active for this session"));
    }

    @Test
    void fullEscapeFlowProgressesThroughThreeRooms() throws Exception {
        String sessionCode = createJoinedSession();

        submitCorrect(sessionCode, 1, "C")
                .andExpect(jsonPath("$.completed").value(false));
        submitCorrect(sessionCode, 2, "A")
                .andExpect(jsonPath("$.completed").value(false));
        submitCorrect(sessionCode, 3, "A")
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.score").value(160));

        mockMvc.perform(get("/api/sessions/{sessionCode}/report", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.roomName").value("Snow Mountain Service Pass"))
                .andExpect(jsonPath("$.rootCause").value(startsWith("The Service selected app=api")));
    }

    @Test
    void reportHidesRootCauseAndLearningPointIfRoomIsNotCompleted() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(get("/api/sessions/{sessionCode}/report", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(false))
                .andExpect(jsonPath("$.rootCause").value(nullValue()))
                .andExpect(jsonPath("$.learningPoint").value(nullValue()));
    }

    private String createJoinedSession() throws Exception {
        String sessionCode = createSession();
        mockMvc.perform(post("/api/sessions/{sessionCode}/join", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk());
        return sessionCode;
    }

    private String createSession() throws Exception {
        String response = mockMvc.perform(post("/api/sessions"))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("sessionCode").asText();
    }

    private org.springframework.test.web.servlet.ResultActions submitCorrect(
            String sessionCode,
            int roomId,
            String selectedActionId
    ) throws Exception {
        return mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/{roomId}/submit", sessionCode, roomId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedActionId\":\"" + selectedActionId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }
}
