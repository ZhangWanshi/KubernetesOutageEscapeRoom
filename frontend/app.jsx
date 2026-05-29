import React from "react";
import ReactDOM from "react-dom/client";

const API_BASE_URL = "/api";

function App() {
  const [screen, setScreen] = React.useState("join");
  const [playerName, setPlayerName] = React.useState("");
  const [sessionInput, setSessionInput] = React.useState("");
  const [avatar, setAvatar] = React.useState("🦊");
  const [sessionId, setSessionId] = React.useState(null);
  const [roomNumber, setRoomNumber] = React.useState(null);
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
  const [players, setPlayers] = React.useState([]);

  React.useEffect(() => {
    if (screen !== "room" || !sessionId) return;
    async function fetchPlayers() {
      try {
        const data = await apiRequest(`/sessions/${encodeURIComponent(sessionId)}/players`);
        setPlayers(Array.isArray(data) ? data : []);
      } catch (_) {}
    }
    fetchPlayers();
    const interval = window.setInterval(fetchPlayers, 5000);
    return () => window.clearInterval(interval);
  }, [screen, sessionId]);

  React.useEffect(() => {
    document.body.classList.remove("screen-join", "screen-intro", "screen-room", "screen-room-jungle", "screen-room-desert", "screen-final");

    if (screen === "join") document.body.classList.add("screen-join");
    if (screen === "intro") document.body.classList.add("screen-intro");
    if (screen === "room") {
      document.body.classList.add("screen-room");
      const themeClass = ["screen-room-jungle", "screen-room-desert"][currentRoomIndex] ?? "screen-room-jungle";
      document.body.classList.add(themeClass);
    }
    if (screen === "final") document.body.classList.add("screen-final");
  }, [screen, currentRoomIndex]);

  async function joinGame() {
    setJoinError("");

    const trimmedName = playerName.trim();
    const trimmedSession = sessionInput.trim();

    if (!trimmedName) {
      setJoinError("Please enter a player name.");
      return;
    }

    try {
      let activeSessionId = "";
      let isNewSession = false;
      const trimmedRoomNumber = parseInt(trimmedSession, 10);

      if (!trimmedSession) {
        const createData = await apiRequest("/sessions", {
          method: "POST",
          body: { playerName: trimmedName },
        });

        activeSessionId = extractSessionId(createData);

        if (!activeSessionId) {
          throw new Error("The backend did not return a sessionId.");
        }
        isNewSession = true;
        if (createData.roomNumber) setRoomNumber(createData.roomNumber);
      } else if (!isNaN(trimmedRoomNumber)) {
        const sessionData = await apiRequest(`/sessions/by-room/${trimmedRoomNumber}`);
        activeSessionId = extractSessionId(sessionData);
        if (!activeSessionId) throw new Error("Room not found.");
        setRoomNumber(trimmedRoomNumber);
      } else {
        throw new Error("Please enter a valid room number.");
      }

      setSessionId(activeSessionId);

      if (!isNewSession) {
        const joinData = await apiRequest(
          `/sessions/${encodeURIComponent(activeSessionId)}/join`,
          {
            method: "POST",
            body: { playerName: trimmedName },
          }
        );
        updateGameState(joinData);
      }

      await fetchCurrentRoom(activeSessionId);
      setScreen("intro");
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

  async function useHint() {
    try {
      const newHealth = await apiRequest(`/sessions/${encodeURIComponent(sessionId)}/hint`, {
        method: "POST",
      });
      setHealth(newHealth);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function submitAction(actionId, onSuccess) {
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
            answer: actionId,
          },
        }
      );

      const correct = Boolean(
        result.correct ??
        result.isCorrect ??
        result.success ??
        (result.status === "CORRECT" || result.status === "correct")
      );

      const finished = Boolean(
        result.finished ??
        result.gameFinished ??
        result.completed ??
        result.finalRoomComplete ??
        result.status === "COMPLETED"
      );

      if (correct) {
        if (result.score !== undefined) setScore(result.score);
        setResultType("success");
        setResultMessage("Correct. Transporting to the next area...");

        if (onSuccess) {
          onSuccess(finished);
        } else {
          window.setTimeout(async () => {
            if (finished) {
              await fetchFinalResult();
            } else {
              await fetchCurrentRoom(sessionId);
            }
            setSubmitting(false);
          }, 1200);
        }
      } else {
        if (result.health !== undefined) setHealth(result.health);
        setResultType("danger");
        setResultMessage(`Incorrect. Health: ${result.health ?? health - 20}`);
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
    setAvatar("🦊");
    setSessionId(null);
    setRoomNumber(null);
    setPlayers([]);
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
          avatar={avatar}
          setAvatar={setAvatar}
          joinGame={joinGame}
          joinError={joinError}
        />
      )}

      {screen === "intro" && (
        <IntroScreen
          playerName={playerName}
          avatar={avatar}
          onStart={() => setScreen("room")}
        />
      )}

      {screen === "room" && room && (
        <RoomScreen
          room={room}
          playerName={playerName}
          avatar={avatar}
          sessionId={sessionId}
          score={score}
          health={health}
          currentRoomIndex={currentRoomIndex}
          totalRooms={totalRooms}
          roomNumber={roomNumber}
          players={players}
          resultMessage={resultMessage}
          resultType={resultType}
          submitting={submitting}
          submitAction={submitAction}
          useHint={useHint}
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

const AVATARS = [
  { emoji: "🦊", label: "Fox" },
  { emoji: "🐺", label: "Wolf" },
  { emoji: "🦁", label: "Lion" },
  { emoji: "🐯", label: "Tiger" },
];

function JoinScreen({
  playerName,
  setPlayerName,
  sessionInput,
  setSessionInput,
  avatar,
  setAvatar,
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
                  <label className="form-label">Choose your avatar</label>
                  <div className="avatar-selector">
                    {AVATARS.map((a) => (
                      <button
                        key={a.emoji}
                        type="button"
                        className={`avatar-option${avatar === a.emoji ? " selected" : ""}`}
                        onClick={() => setAvatar(a.emoji)}
                        title={a.label}
                      >
                        <span className="avatar-emoji">{a.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="player-name" className="form-label">
                    Player name
                  </label>
                  <input
                    type="text"
                    id="player-name"
                    className="form-control"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="session-id" className="form-label">
                    Room Number <span className="text-muted">(optional — join existing)</span>
                  </label>
                  <input
                    type="text"
                    id="session-id"
                    className="form-control"
                    placeholder="Leave blank to create a new room"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntroScreen({ playerName, avatar, onStart }) {
  return (
    <section id="intro-screen" className="screen">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <span className="intro-avatar">{avatar}</span>
                <h1 className="h3 mt-3 mb-1">Welcome, {playerName}!</h1>
                <p className="text-muted">Your mission briefing</p>
              </div>

              <div className="intro-section mb-4">
                <h2 className="h5 intro-section-title">🌿 The Mission</h2>
                <p>
                  A series of Kubernetes outages have struck the jungle infrastructure.
                  You must travel through each outage area, diagnose the problem from
                  the evidence, and apply the correct remediation before service health
                  reaches zero.
                </p>
              </div>

              <div className="intro-section mb-4">
                <h2 className="h5 intro-section-title">📋 Rules</h2>
                <ul className="intro-rules">
                  <li>Each room presents a Kubernetes outage scenario with evidence clues.</li>
                  <li>Choose the correct remediation action to progress.</li>
                  <li>A wrong answer costs you health points.</li>
                  <li>Your score increases with each correct answer.</li>
                  <li>Survive all rooms with health remaining to escape.</li>
                </ul>
              </div>

              <div className="intro-section mb-4">
                <h2 className="h5 intro-section-title">⚡ Scoring</h2>
                <div className="row text-center g-3">
                  <div className="col">
                    <div className="result-box">
                      <p className="small text-muted mb-1">Correct answer</p>
                      <strong className="text-success">+10 pts</strong>
                    </div>
                  </div>
                  <div className="col">
                    <div className="result-box">
                      <p className="small text-muted mb-1">Wrong answer</p>
                      <strong className="text-danger">-20 health</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary w-100" onClick={onStart}>
                Enter the Jungle 🌿
              </button>
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
  avatar,
  sessionId,
  score,
  health,
  currentRoomIndex,
  totalRooms,
  roomNumber,
  players,
  resultMessage,
  resultType,
  submitting,
  submitAction,
  useHint,
}) {
  const progressPercent = Math.round((currentRoomIndex / totalRooms) * 100);
  const ROOM_THEMES = [
    { label: "The Jungle", icon: "🌿" },
    { label: "The Desert", icon: "🏜️" },
  ];
  const theme = ROOM_THEMES[currentRoomIndex] ?? { label: "Unknown Area", icon: "📍" };
  const [command, setCommand] = React.useState("");
  const [commandError, setCommandError] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [modalFinished, setModalFinished] = React.useState(false);
  const [hintUsed, setHintUsed] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);

  async function handleHint() {
    if (hintUsed) return;
    const success = await useHint();
    if (success) {
      setHintUsed(true);
      setShowHint(true);
    }
  }

  async function handleCommand(e) {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    const actionId = trimmed.toLowerCase().replace(/\s+/g, "-");
    const matched = room.actions.find(
      (a) => a.id.toLowerCase() === actionId || a.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (!matched) {
      setCommandError(`Unknown command: ${trimmed}`);
      return;
    }
    setCommandError("");
    setCommand("");
    await submitAction(matched.id, (finished) => { setShowModal(true); setModalFinished(finished); });
  }

  return (
    <section id="room-screen" className="screen">
      {showModal && (
        <CongratsModal
          playerName={playerName}
          avatar={avatar}
          onClose={async () => {
            setShowModal(false);
            if (modalFinished) {
              await fetchFinalResult();
            } else {
              await fetchCurrentRoom();
            }
          }}
        />
      )}
      <div className="level-banner">
        <span className="level-badge">Level {currentRoomIndex + 1}</span>
        <span className="level-theme">{theme.icon} {theme.label}</span>
      </div>

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
            <div className="card-header">Hint</div>
            <div className="card-body">
              {!hintUsed ? (
                <div className="text-center">
                  <p className="text-muted mb-3">Need help? Get a hint for -10 health</p>
                  <button 
                    className="btn btn-outline-warning" 
                    onClick={handleHint}
                    disabled={submitting}
                  >
                    💡 Show Hint
                  </button>
                </div>
              ) : (
                <div className="hint-box">
                  <p className="mb-0">{room.hint}</p>
                </div>
              )}

              {resultMessage && (
                <div className={`alert alert-${resultType} mt-3`}>
                  {resultMessage}
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mt-4 command-bar-card">
            <div className="card-header">$ kubectl terminal</div>
            <div className="card-body">
              <form onSubmit={handleCommand} className="d-flex gap-2">
                <span className="command-prompt">$</span>
                <input
                  type="text"
                  className="form-control command-input"
                  placeholder=""
                  value={command}
                  onChange={(e) => { setCommand(e.target.value); setCommandError(""); }}
                  disabled={submitting}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  Run
                </button>
              </form>
              {commandError && (
                <div className="alert alert-danger mt-2 mb-0 py-2">{commandError}</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header">Player / Session</div>
            <div className="card-body">
              <p className="mb-1"><strong>Player:</strong></p>
              <p id="player-display" className="mb-3 text-muted">
                <span className="me-2">{avatar}</span>{playerName}
              </p>

              <p className="mb-1"><strong>Room Number:</strong></p>
              <p id="session-display" className="mb-3 text-muted">{roomNumber}</p>

              <p className="mb-1"><strong>Players online:</strong> <span className="badge text-bg-success ms-1">{players.length}</span></p>
              <ul className="players-list">
                {players.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
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

function CongratsModal({ playerName, avatar, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <span className="congrats-avatar">{avatar}</span>
          <h2 className="h3 mt-3 mb-2">Level Solved!</h2>
          <p className="congrats-sub">Well done, <strong>{playerName}</strong>!</p>
          <p className="text-muted">Your command fixed the outage. Transporting to the next area...</p>
          <button className="btn btn-primary mt-3" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
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
    hint: room.hint ?? "No hint available.",
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
