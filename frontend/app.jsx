import React from "react";
import ReactDOM from "react-dom/client";

const API_BASE_URL = "/api";

function App() {
  const [screen, setScreen] = React.useState("join");
  const [playerName, setPlayerName] = React.useState("");
  const [sessionInput, setSessionInput] = React.useState("");
  const [sessionId, setSessionId] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [score, setScore] = React.useState(0);
  const [health, setHealth] = React.useState(100);
  const [currentRoomIndex, setCurrentRoomIndex] = React.useState(0);
  const [totalRooms, setTotalRooms] = React.useState(3);
  const [joinError, setJoinError] = React.useState("");
  const [resultMessage, setResultMessage] = React.useState("");
  const [resultType, setResultType] = React.useState("success");
  const [submitting, setSubmitting] = React.useState(false);
  const [finalResult, setFinalResult] = React.useState(null);

  React.useEffect(() => {
    document.body.classList.remove("screen-join", "screen-room", "screen-final");

    if (screen === "join") document.body.classList.add("screen-join");
    if (screen === "room") document.body.classList.add("screen-room");
    if (screen === "final") document.body.classList.add("screen-final");
  }, [screen]);

  async function joinGame() {
    setJoinError("");

    const trimmedName = playerName.trim();
    const trimmedSession = sessionInput.trim();

    if (!trimmedName) {
      setJoinError("Please enter a player name.");
      return;
    }

    try {
      let activeSessionId = trimmedSession;

      if (!activeSessionId) {
        const createData = await apiRequest("/sessions", {
          method: "POST",
          body: { playerName: trimmedName },
        });

        activeSessionId = extractSessionId(createData);

        if (!activeSessionId) {
          throw new Error("The backend did not return a sessionId.");
        }
      }

      setSessionId(activeSessionId);

      const joinData = await apiRequest(
        `/sessions/${encodeURIComponent(activeSessionId)}/join`,
        {
          method: "POST",
          body: { playerName: trimmedName },
        }
      );

      updateGameState(joinData);
      await fetchCurrentRoom(activeSessionId);
      setScreen("room");
    } catch (error) {
      setJoinError(error.message);
    }
  }

  async function fetchCurrentRoom(activeSessionId = sessionId) {
    try {
      const roomData = await apiRequest(
        `/sessions/${encodeURIComponent(activeSessionId)}/room`
      );

      updateGameState(roomData);

      const normalisedRoom = normaliseRoom(
        roomData.room ?? roomData.currentRoom ?? roomData
      );

      if (!normalisedRoom) {
        throw new Error("The backend did not return a valid room.");
      }

      setRoom(normalisedRoom);
      setResultMessage("");
      setSubmitting(false);
    } catch (error) {
      setResultType("danger");
      setResultMessage(error.message);
      setSubmitting(false);
    }
  }

  async function submitAction(actionId) {
    if (!room || !sessionId) return;

    setSubmitting(true);
    setResultMessage("");

    try {
      const result = await apiRequest(
        `/sessions/${encodeURIComponent(sessionId)}/submit`,
        {
          method: "POST",
          body: {
            playerName,
            roomId: room.id,
            actionId,
          },
        }
      );

      updateGameState(result);

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
        setResultType("success");
        setResultMessage("Correct. Transporting to the next area...");

        window.setTimeout(async () => {
          if (finished) {
            await fetchFinalResult();
          } else {
            await fetchCurrentRoom();
          }
        }, 800);
      } else {
        setResultType("danger");
        setResultMessage("Incorrect. Health or score updated.");
        setSubmitting(false);
      }
    } catch (error) {
      setResultType("danger");
      setResultMessage(error.message);
      setSubmitting(false);
    }
  }

  async function fetchFinalResult() {
    try {
      const result = await apiRequest(
        `/sessions/${encodeURIComponent(sessionId)}/result`
      );

      updateGameState(result);
      setFinalResult(result);
      setScreen("final");
    } catch (error) {
      setFinalResult({
        score,
        health,
        message: error.message,
      });
      setScreen("final");
    }
  }

  function updateGameState(data) {
    if (!data || typeof data !== "object") return;

    if (data.sessionId !== undefined || data.id !== undefined) {
      setSessionId(data.sessionId ?? data.id);
    }

    if (data.score !== undefined || data.currentScore !== undefined) {
      setScore(data.score ?? data.currentScore);
    }

    if (data.health !== undefined || data.serviceHealth !== undefined) {
      setHealth(data.health ?? data.serviceHealth);
    }

    if (
      data.currentRoomIndex !== undefined ||
      data.roomIndex !== undefined ||
      data.roomNumber !== undefined
    ) {
      setCurrentRoomIndex(
        data.currentRoomIndex ?? data.roomIndex ?? data.roomNumber - 1
      );
    }

    if (data.totalRooms !== undefined || data.roomCount !== undefined) {
      setTotalRooms(data.totalRooms ?? data.roomCount);
    }
  }

  function resetGame() {
    setScreen("join");
    setPlayerName("");
    setSessionInput("");
    setSessionId(null);
    setRoom(null);
    setScore(0);
    setHealth(100);
    setCurrentRoomIndex(0);
    setTotalRooms(3);
    setJoinError("");
    setResultMessage("");
    setResultType("success");
    setSubmitting(false);
    setFinalResult(null);
  }

  return (
    <main className="container py-5">
      {screen === "join" && (
        <JoinScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          sessionInput={sessionInput}
          setSessionInput={setSessionInput}
          joinGame={joinGame}
          joinError={joinError}
        />
      )}

      {screen === "room" && room && (
        <RoomScreen
          room={room}
          playerName={playerName}
          sessionId={sessionId}
          score={score}
          health={health}
          currentRoomIndex={currentRoomIndex}
          totalRooms={totalRooms}
          resultMessage={resultMessage}
          resultType={resultType}
          submitting={submitting}
          submitAction={submitAction}
        />
      )}

      {screen === "final" && (
        <FinalScreen
          finalResult={finalResult}
          score={score}
          health={health}
          resetGame={resetGame}
        />
      )}
    </main>
  );
}

function JoinScreen({
  playerName,
  setPlayerName,
  sessionInput,
  setSessionInput,
  joinGame,
  joinError,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    joinGame();
  }

  return (
    <section id="join-screen" className="screen">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="h3 mb-3 text-center">
                Kubernetes Outage Escape Room
              </h1>

              <p className="text-muted text-center">
                Enter the time machine and transport to the first outage area.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="player-name" className="form-label">
                    Player name
                  </label>
                  <input
                    type="text"
                    id="player-name"
                    className="form-control"
                    placeholder="e.g. Billie Jean"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="session-id" className="form-label">
                    Session ID <span className="text-muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="session-id"
                    className="form-control"
                    placeholder="Leave blank to create a new session"
                    value={sessionInput}
                    onChange={(event) => setSessionInput(event.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  Join Game
                </button>
              </form>

              {joinError && (
                <div className="alert alert-danger mt-3">{joinError}</div>
              )}

              <p className="small text-muted mt-3 mb-0">
                This page connects to the backend under <code>/api</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomScreen({
  room,
  playerName,
  sessionId,
  score,
  health,
  currentRoomIndex,
  totalRooms,
  resultMessage,
  resultType,
  submitting,
  submitAction,
}) {
  const progressPercent = Math.round((currentRoomIndex / totalRooms) * 100);

  return (
    <section id="room-screen" className="screen">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 id="room-title" className="h3 mb-1">
            {room.title}
          </h1>
          <p id="room-problem" className="text-muted mb-0">
            {room.problemDescription}
          </p>
        </div>

        <div className="text-end">
          <span className="badge text-bg-success me-2">
            Score: <span id="score-value">{score}</span>
          </span>
          <span className="badge text-bg-danger">
            Health: <span id="health-value">{health}</span>
          </span>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header">Evidence</div>
            <div className="card-body">
              <EvidencePanel evidence={room.evidence} />
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">Choose a remediation action</div>
            <div className="card-body">
              <ActionButtons
                actions={room.actions}
                submitting={submitting}
                submitAction={submitAction}
              />

              {resultMessage && (
                <div className={`alert alert-${resultType} mt-3`}>
                  {resultMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header">Player / Session</div>
            <div className="card-body">
              <p className="mb-1"><strong>Name:</strong></p>
              <p id="player-display" className="mb-3 text-muted">{playerName}</p>

              <p className="mb-1"><strong>Session ID:</strong></p>
              <p id="session-display" className="mb-0 text-muted">{sessionId}</p>
            </div>
          </div>

          <div className="card shadow-sm mt-4">
            <div className="card-header">Progress</div>
            <div className="card-body">
              <p className="mb-1">
                Room <span id="room-number">{currentRoomIndex + 1}</span> of{" "}
                <span id="total-rooms">{totalRooms}</span>
              </p>

              <div className="progress">
                <div
                  id="progress-bar"
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${progressPercent}%` }}
                >
                  {progressPercent}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EvidencePanel({ evidence }) {
  if (!evidence || evidence.length === 0) {
    return <p className="text-muted mb-0">No evidence available.</p>;
  }

  return (
    <ul id="evidence-panel" className="list-group list-group-flush">
      {evidence.map((item, index) => (
        <li key={index} className="list-group-item">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ActionButtons({ actions, submitting, submitAction }) {
  if (!actions || actions.length === 0) {
    return <p className="text-muted mb-0">No actions available.</p>;
  }

  return (
    <div id="action-buttons" className="d-grid gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          className="btn btn-outline-primary text-start"
          disabled={submitting}
          onClick={() => submitAction(action.id)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function FinalScreen({ finalResult, score, health, resetGame }) {
  const finalScore = finalResult?.score ?? finalResult?.finalScore ?? score;
  const finalHealth = finalResult?.health ?? finalResult?.serviceHealth ?? health;

  const status =
    finalResult?.status ??
    finalResult?.title ??
    (finalHealth > 0 ? "You escaped the outage." : "The service health reached zero.");

  const summary =
    finalResult?.summary ??
    finalResult?.message ??
    "Final result loaded from backend.";

  return (
    <section id="final-screen" className="screen">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm text-center">
            <div className="card-body p-4">
              <h1 className="h3 mb-3">Final Result</h1>
              <p id="final-status" className="lead">{status}</p>

              <div className="row my-4">
                <div className="col">
                  <div className="result-box">
                    <p className="small text-muted mb-1">Final Score</p>
                    <h2 id="final-score" className="h4 mb-0">{finalScore}</h2>
                  </div>
                </div>

                <div className="col">
                  <div className="result-box">
                    <p className="small text-muted mb-1">Health Remaining</p>
                    <h2 id="final-health" className="h4 mb-0">{finalHealth}</h2>
                  </div>
                </div>
              </div>

              <p id="final-summary" className="text-muted">{summary}</p>

              <button className="btn btn-primary" onClick={resetGame}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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

function normaliseRoom(room) {
  if (!room || typeof room !== "object") return null;

  return {
    id: room.id ?? room.roomId ?? room.number ?? 1,
    title: room.title ?? room.roomTitle ?? "Jungle Outage Area",
    problemDescription:
      room.problemDescription ??
      room.description ??
      room.problem ??
      "Inspect the evidence and choose the best remediation action.",
    evidence: normaliseEvidence(
      room.evidence ?? room.evidenceItems ?? room.clues ?? []
    ),
    actions: normaliseActions(
      room.actions ?? room.possibleActions ?? room.options ?? []
    ),
  };
}

function normaliseEvidence(evidence) {
  if (!Array.isArray(evidence)) return [String(evidence)];

  return evidence.map((item) => {
    if (typeof item === "string") return item;
    return item.text ?? item.description ?? item.value ?? JSON.stringify(item);
  });
}

function normaliseActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions.map((action, index) => {
    if (typeof action === "string") {
      return { id: action, label: action };
    }

    return {
      id: action.id ?? action.actionId ?? action.value ?? `action-${index}`,
      label:
        action.label ??
        action.name ??
        action.description ??
        action.text ??
        `Action ${index + 1}`,
    };
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
