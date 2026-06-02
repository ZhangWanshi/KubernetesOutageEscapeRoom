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
                .andExpect(jsonPath("$.hint").value("Compare the Order Service configuration with the Inventory API documentation. Look carefully at the endpoint path."))
                .andExpect(jsonPath("$.score").value(95));
    }

    @Test
    void hintPenaltyAppliesOnlyOncePerRoom() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/hint", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(95));

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/hint", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(95));

        mockMvc.perform(get("/api/sessions/{sessionCode}/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hintsUsed").value(1))
                .andExpect(jsonPath("$.currentRoomHintUsed").value(true));
    }

    @Test
    void evidenceViewAndBeginInvestigationAreRecordedInActivity() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/begin", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/evidence/view", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"evidenceTitle\":\"Order Service Logs\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/sessions/{sessionCode}/activity", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].message").value("Madhuri began investigation in Microservice Incident Response"))
                .andExpect(jsonPath("$[2].message").value("Madhuri viewed Order Service Logs"));
    }

    @Test
    void room1Level1AcceptsRunningAndMovesToLevel2() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedStatus\":\"Running\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.message").value("Health check passed. The customer-api service is running successfully."));

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/1/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.completed").value(false));
    }

    @Test
    void room1Level1RejectsPendingAndStaysOnLevel1() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedStatus\":\"Pending\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(1))
                .andExpect(jsonPath("$.score").value(90))
                .andExpect(jsonPath("$.serviceHealth").value(90))
                .andExpect(jsonPath("$.message").value("That status does not represent a healthy running service. Try again."));
    }

    @Test
    void room1Level2AcceptsCorrectPairs() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "matchedPairs":{
                                    "customer-api":"Handles customer requests",
                                    "order-service":"Processes customer orders",
                                    "database-service":"Stores application data"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("Service mapping completed. Each microservice responsibility is correctly identified."));
    }

    @Test
    void room1Level2RejectsIncorrectPairMapping() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "matchedPairs":{
                                    "customer-api":"Blocks user access",
                                    "order-service":"Processes customer orders",
                                    "database-service":"Stores application data"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.message").value("One or more services are mapped incorrectly. Review the service responsibilities and try again."));
    }

    @Test
    void room1Level3AcceptsDatabaseServiceAndCompletesRoom1() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1Level1(sessionCode);
        completeRoom1Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedDbHost\":\"database-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.roomCompleted").value(true))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("Configuration restored. customer-api can now connect to database-service."));

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/1/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.completionMessage").value(startsWith("Incident resolved.")));
    }

    @Test
    void room1Level3RejectsFrontendUi() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1Level1(sessionCode);
        completeRoom1Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedDbHost\":\"frontend-ui\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.roomCompleted").value(false))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("That value does not point to the database service. Choose the correct service host."));
    }

    @Test
    void room1CannotSkipDirectlyToLevel3() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedDbHost\":\"database-service\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Level is not active for Room 1"));
    }

    @Test
    void room2RemainsLockedUntilRoom1IsCompleted() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/2/state", sessionCode))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Room 2 is locked until Room 1 is completed"));
    }

    @Test
    void room2Level1AcceptsCrashLoopBackOffAndMovesToLevel2() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"CrashLoopBackOff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.message").value("Issue identified. The order-service container is repeatedly crashing."));
    }

    @Test
    void room2Level1RejectsRunningAndStaysOnLevel1() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"Running\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(1))
                .andExpect(jsonPath("$.score").value(150))
                .andExpect(jsonPath("$.serviceHealth").value(90))
                .andExpect(jsonPath("$.message").value("That status does not explain the repeated container failure. Review the evidence and try again."));
    }

    @Test
    void room2Level2AcceptsCorrectLifecycleOrder() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);
        completeRoom2Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Image Pulled","Container Created","Container Started","Health Check Passed","Service Ready"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("Lifecycle sequence completed. The container startup flow is now correctly understood."));
    }

    @Test
    void room2Level2RejectsIncorrectLifecycleOrder() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);
        completeRoom2Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Container Started","Image Pulled","Container Created","Health Check Passed","Service Ready"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.message").value("The lifecycle order is incorrect. Review how a container starts and try again."));
    }

    @Test
    void room2Level3AcceptsRollbackAndCompletesRoom2() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);
        completeRoom2Level1(sessionCode);
        completeRoom2Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"Rollback to order-service:v1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.roomCompleted").value(true))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("Recovery action applied. order-service has been restored using the previous stable image."));

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/2/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.completionMessage").value(startsWith("Container recovery completed.")));
    }

    @Test
    void room2Level3RejectsDeleteDatabase() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);
        completeRoom2Level1(sessionCode);
        completeRoom2Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"Delete the database\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.roomCompleted").value(false))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("That action does not safely recover the failing container. Choose the action that restores the last stable version."));
    }

    @Test
    void room2CannotSkipDirectlyToLevel3() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"Rollback to order-service:v1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Level is not active for Room 2"));
    }

    @Test
    void room3RemainsLockedUntilRoom2IsCompleted() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom1(sessionCode);

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/3/state", sessionCode))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Room 3 is locked until Room 2 is completed"));
    }

    @Test
    void room3Level1AcceptsEndpointCommand() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl get endpoints checkout-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(2));
    }

    @Test
    void room3Level1AcceptsEndpointAliasAndExtraSpaces() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"  kubectl   get   ep   checkout-service   -n   production  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(2));
    }

    @Test
    void room3Level1RejectsUnrelatedCommand() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl get pods\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(1))
                .andExpect(jsonPath("$.message").value("That command does not check service endpoints. Try a kubectl command that inspects endpoints for checkout-service."));
    }

    @Test
    void room3Level2AcceptsCorrectInvestigationOrder() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Check pod status","Check service endpoints","Compare service selector with pod labels","Identify selector mismatch","Apply selector fix"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.currentLevel").value(3));
    }

    @Test
    void room3Level2RejectsIncorrectInvestigationOrder() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Check service endpoints","Check pod status","Compare service selector with pod labels","Identify selector mismatch","Apply selector fix"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(2))
                .andExpect(jsonPath("$.message").value("The sequence is not correct. Start with checking pod health, then inspect service routing."));
    }

    @Test
    void room3Level3AcceptsSetSelectorServiceCommand() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);
        completeRoom3Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl set selector service checkout-service app=checkout\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.roomCompleted").value(true))
                .andExpect(jsonPath("$.gameCompleted").value(true));
    }

    @Test
    void room3Level3AcceptsSetSelectorSvcCommand() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);
        completeRoom3Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl set selector svc checkout-service app=checkout\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.gameCompleted").value(true));
    }

    @Test
    void room3Level3RejectsDangerousCommand() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);
        completeRoom3Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl delete service checkout-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.currentLevel").value(3))
                .andExpect(jsonPath("$.message").value("That command does not fix the selector mismatch. Use a command that updates checkout-service selector to app=checkout."));
    }

    @Test
    void room3CannotSkipDirectlyToLevel3() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl set selector service checkout-service app=checkout\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Level is not active for Room 3"));
    }

    @Test
    void fullGameIsCompletedAfterRoom3Level3() throws Exception {
        String sessionCode = createJoinedSession();
        completeRoom2(sessionCode);
        completeRoom3Level1(sessionCode);
        completeRoom3Level2(sessionCode);

        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl set selector service checkout-service app=checkout\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameCompleted").value(true));

        mockMvc.perform(get("/api/sessions/{sessionCode}/state", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.currentRoomId").value(3));
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
    void cannotAccessLockedRoomThroughSessionState() throws Exception {
        String sessionCode = createJoinedSession();

        mockMvc.perform(get("/api/sessions/{sessionCode}/rooms/2", sessionCode))
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
                .andExpect(jsonPath("$.roomName").value("Kubernetes Service Routing Fix"))
                .andExpect(jsonPath("$.rootCause").value(startsWith("The Service selected app=api")))
                .andExpect(jsonPath("$.learningSummaries.length()").value(3));
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

    private void completeRoom1Level1(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedStatus\":\"Running\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom1Level2(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "matchedPairs":{
                                    "customer-api":"Handles customer requests",
                                    "order-service":"Processes customer orders",
                                    "database-service":"Stores application data"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom1(String sessionCode) throws Exception {
        completeRoom1Level1(sessionCode);
        completeRoom1Level2(sessionCode);
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/1/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"selectedDbHost\":\"database-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom2Level1(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"CrashLoopBackOff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom2Level2(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Image Pulled","Container Created","Container Started","Health Check Passed","Service Ready"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom2(String sessionCode) throws Exception {
        completeRoom1(sessionCode);
        completeRoom2Level1(sessionCode);
        completeRoom2Level2(sessionCode);
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/2/levels/3/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"answer\":\"Rollback to order-service:v1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom3Level1(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/1/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Madhuri\",\"command\":\"kubectl get endpoints checkout-service\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private void completeRoom3Level2(String sessionCode) throws Exception {
        mockMvc.perform(post("/api/sessions/{sessionCode}/rooms/3/levels/2/submit", sessionCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "playerName":"Madhuri",
                                  "orderedSteps":["Check pod status","Check service endpoints","Compare service selector with pod labels","Identify selector mismatch","Apply selector fix"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }
}
