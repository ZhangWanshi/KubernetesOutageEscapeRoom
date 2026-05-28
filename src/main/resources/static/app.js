/*
  Kubernetes Outage Escape Room Frontend
  -------------------------------------
  Connected backend endpoints:

  POST /api/sessions
  POST /api/sessions/{sessionId}/join
  GET  /api/sessions/{sessionId}/room
  POST /api/sessions/{sessionId}/submit
  GET  /api/sessions/{sessionId}/result
*/

const API_BASE_URL = "/api";

let gameState = {
  sessionId: null,
  playerName: "",
  score: 0,
  health: 100,
  currentRoomIndex: 0,
  totalRooms: 3,
  currentRoom: null,
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("join-game-btn").addEventListener("click", joinGame);
  document.getElementById("play-again-btn").addEventListener("click", resetGame);
});

async function joinGame() {
  const playerNameInput = document.getElementById("player-name");
  const sessionIdInput = document.getElementById("session-id");
  const joinError = document.getElementById("join-error");

  const playerName = playerNameInput.value.trim();
  const enteredSessionId = sessionIdInput.value.trim();

  joinError.classList.add("d-none");
  joinError.textContent = "";

  if (!playerName) {
    showJoinError("Please enter a player name.");
    return;
  }

  gameState.playerName = playerName;

  try {
    let sessionId = enteredSessionId;

    // If no session ID is provided, create a new session first.
    if (!sessionId) {
      const createData = await apiRequest("/sessions", {
        method: "POST",
        body: { playerName },
      });

      sessionId = extractSessionId(createData);

      if (!sessionId) {
        throw new Error("The backend did not return a sessionId.");
      }
    }

    gameState.sessionId = sessionId;

    // Join the selected or newly created session.
    const joinData = await apiRequest(`/sessions/${encodeURIComponent(sessionId)}/join`, {
      method: "POST",
      body: { playerName },
    });

    updateGameStateFromResponse(joinData);

    document.getElementById("player-display").textContent = playerName;
    document.getElementById("session-display").textContent = sessionId;

    await fetchCurrentRoom();
    showScreen("room-screen");
  } catch (error) {
    showJoinError(error.message);
  }
}

async function fetchCurrentRoom() {
  try {
    const roomData = await apiRequest(
      `/sessions/${encodeURIComponent(gameState.sessionId)}/room`
    );

    updateGameStateFromResponse(roomData);

    const room = normaliseRoom(roomData.room ?? roomData.currentRoom ?? roomData);

    if (!room) {
      throw new Error("The backend did not return a valid room.");
    }

    gameState.currentRoom = room;
    renderRoom();
  } catch (error) {
    showResultMessage(error.message, "danger");
  }
}

async function submitAction(actionId) {
  disableActionButtons(true);

  try {
    const result = await apiRequest(
      `/sessions/${encodeURIComponent(gameState.sessionId)}/submit`,
      {
        method: "POST",
        body: {
          playerName: gameState.playerName,
          roomId: gameState.currentRoom.id,
          actionId,
        },
      }
    );

    updateGameStateFromResponse(result);

    const correct = Boolean(
      result.correct ??
      result.isCorrect ??
      result.success ??
      result.status === "CORRECT" ??
      result.status === "correct"
    );

    const finished = Boolean(
      result.finished ??
      result.gameFinished ??
      result.completed ??
      result.finalRoomComplete
    );

    if (correct) {
      showResultMessage("Correct. Moving to the next room...", "success");

      setTimeout(async () => {
        if (finished) {
          await fetchFinalResult();
        } else {
          await fetchCurrentRoom();
        }
      }, 700);
    } else {
      showResultMessage("Incorrect. Health or score updated.", "danger");
      renderScoreAndHealth();
      disableActionButtons(false);
    }
  } catch (error) {
    showResultMessage(error.message, "danger");
    disableActionButtons(false);
  }
}

async function fetchFinalResult() {
  try {
    const result = await apiRequest(
      `/sessions/${encodeURIComponent(gameState.sessionId)}/result`
    );

    updateGameStateFromResponse(result);
    renderFinalResult(result);
    showScreen("final-screen");
  } catch (error) {
    // If result endpoint fails, still show a basic final result from current state.
    renderFinalResult({
      score: gameState.score,
      health: gameState.health,
      message: error.message,
    });
    showScreen("final-screen");
  }
}

async function apiRequest(path, options = {}) {
  const fetchOptions = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  let data = null;
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

function extractSessionId(data) {
  return (
    data.sessionId ??
    data.id ??
    data.session?.id ??
    data.session?.sessionId ??
    null
  );
}

function updateGameStateFromResponse(data) {
  if (!data || typeof data !== "object") {
    return;
  }

  gameState.sessionId = data.sessionId ?? data.id ?? gameState.sessionId;
  gameState.score = data.score ?? data.currentScore ?? gameState.score;
  gameState.health = data.health ?? data.serviceHealth ?? gameState.health;
  gameState.currentRoomIndex =
    data.currentRoomIndex ??
    data.roomIndex ??
    data.roomNumber - 1 ??
    gameState.currentRoomIndex;
  gameState.totalRooms = data.totalRooms ?? data.roomCount ?? gameState.totalRooms;
}

function normaliseRoom(room) {
  if (!room || typeof room !== "object") {
    return null;
  }

  return {
    id: room.id ?? room.roomId ?? room.number ?? gameState.currentRoomIndex + 1,
    title: room.title ?? room.roomTitle ?? "Outage Room",
    problemDescription:
      room.problemDescription ??
      room.description ??
      room.problem ??
      "Inspect the evidence and choose the best remediation action.",
    evidence: normaliseEvidence(room.evidence ?? room.evidenceItems ?? room.clues ?? []),
    actions: normaliseActions(room.actions ?? room.possibleActions ?? room.options ?? []),
  };
}

function normaliseEvidence(evidence) {
  if (!Array.isArray(evidence)) {
    return [String(evidence)];
  }

  return evidence.map((item) => {
    if (typeof item === "string") {
      return item;
    }

    return (
      item.text ??
      item.description ??
      item.value ??
      JSON.stringify(item)
    );
  });
}

function normaliseActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map((action, index) => {
    if (typeof action === "string") {
      return {
        id: action,
        label: action,
      };
    }

    return {
      id: action.id ?? action.actionId ?? action.value ?? `action-${index}`,
      label: action.label ?? action.name ?? action.description ?? action.text ?? `Action ${index + 1}`,
    };
  });
}

function renderRoom() {
  const room = gameState.currentRoom;

  document.getElementById("room-title").textContent = room.title;
  document.getElementById("room-problem").textContent = room.problemDescription;

  renderScoreAndHealth();
  renderProgress();
  renderEvidence(room.evidence);
  renderActions(room.actions);

  const resultMessage = document.getElementById("result-message");
  resultMessage.className = "alert mt-3 d-none";
  resultMessage.textContent = "";
}

function renderScoreAndHealth() {
  document.getElementById("score-value").textContent = gameState.score;
  document.getElementById("health-value").textContent = gameState.health;
}

function renderProgress() {
  document.getElementById("room-number").textContent =
    gameState.currentRoomIndex + 1;
  document.getElementById("total-rooms").textContent = gameState.totalRooms;

  const progressPercent = Math.round(
    (gameState.currentRoomIndex / gameState.totalRooms) * 100
  );

  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = `${progressPercent}%`;
  progressBar.textContent = `${progressPercent}%`;
}

function renderEvidence(evidenceItems) {
  const evidencePanel = document.getElementById("evidence-panel");
  evidencePanel.innerHTML = "";

  if (!evidenceItems.length) {
    evidencePanel.innerHTML = `<p class="text-muted mb-0">No evidence available.</p>`;
    return;
  }

  const list = document.createElement("ul");
  list.className = "list-group list-group-flush";

  evidenceItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";
    listItem.textContent = item;
    list.appendChild(listItem);
  });

  evidencePanel.appendChild(list);
}

function renderActions(actions) {
  const actionButtons = document.getElementById("action-buttons");
  actionButtons.innerHTML = "";

  if (!actions.length) {
    actionButtons.innerHTML = `<p class="text-muted mb-0">No actions available.</p>`;
    return;
  }

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.className = "btn btn-outline-primary text-start";
    button.textContent = action.label;
    button.addEventListener("click", () => submitAction(action.id));
    actionButtons.appendChild(button);
  });
}

function renderFinalResult(result) {
  const finalScore = result.score ?? result.finalScore ?? gameState.score;
  const finalHealth = result.health ?? result.serviceHealth ?? gameState.health;

  document.getElementById("final-score").textContent = finalScore;
  document.getElementById("final-health").textContent = finalHealth;

  document.getElementById("final-status").textContent =
    result.status ??
    result.title ??
    (finalHealth > 0 ? "You escaped the outage." : "The service health reached zero.");

  document.getElementById("final-summary").textContent =
    result.summary ??
    result.message ??
    "Final result loaded from backend.";
}

function showJoinError(message) {
  const joinError = document.getElementById("join-error");
  joinError.textContent = message;
  joinError.classList.remove("d-none");
}

function showResultMessage(message, type) {
  const resultMessage = document.getElementById("result-message");
  resultMessage.className = `alert alert-${type} mt-3`;
  resultMessage.textContent = message;
}

function disableActionButtons(disabled) {
  const buttons = document.querySelectorAll("#action-buttons button");
  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}

function resetGame() {
  gameState = {
    sessionId: null,
    playerName: "",
    score: 0,
    health: 100,
    currentRoomIndex: 0,
    totalRooms: 3,
    currentRoom: null,
  };

  document.getElementById("player-name").value = "";
  document.getElementById("session-id").value = "";
  document.getElementById("player-display").textContent = "Not joined";
  document.getElementById("session-display").textContent = "None";

  showScreen("join-screen");
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.add("d-none");
  });

  document.getElementById(screenId).classList.remove("d-none");
}
