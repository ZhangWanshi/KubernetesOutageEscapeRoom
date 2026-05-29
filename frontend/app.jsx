import React from "react";
import ReactDOM from "react-dom/client";

const API_BASE_URL = "/api";
const TOTAL_ROOMS = 3;

function App() {
  const [screen, setScreen] = React.useState("join");
  const [playerName, setPlayerName] = React.useState(localStorage.getItem("escape.playerName") || "");
  const [sessionInput, setSessionInput] = React.useState(localStorage.getItem("escape.sessionCode") || "");
  const [sessionCode, setSessionCode] = React.useState(localStorage.getItem("escape.sessionCode") || "");
  const [sessionState, setSessionState] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [activity, setActivity] = React.useState([]);
  const [consoleEntry, setConsoleEntry] = React.useState({
    title: "Incident console",
    body: "Create or join a session to begin.",
  });
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [report, setReport] = React.useState(null);

  React.useEffect(() => {
    document.body.classList.remove("screen-join", "screen-room", "screen-final");
    document.body.classList.add(`screen-${screen}`);
  }, [screen]);

  React.useEffect(() => {
    document.body.classList.remove("theme-jungle", "theme-desert", "theme-snow");
    document.body.classList.add(themeClass(room?.theme));
  }, [room?.theme]);

  React.useEffect(() => {
    if (!sessionCode || !playerName || screen !== "room") {
      return undefined;
    }

    const handle = window.setInterval(() => {
      refreshGame(sessionCode).catch((refreshError) => {
        setConsoleEntry({
          title: "Connection issue",
          body: refreshError.message,
        });
      });
    }, 3000);

    return () => window.clearInterval(handle);
  }, [sessionCode, playerName, screen]);

  async function createSession() {
    const name = playerName.trim();
    if (!name) {
      setError("Enter a player name.");
      return;
    }

    setError("");
    const created = await apiRequest("/sessions", { method: "POST" });
    await joinSession(created.sessionCode, name);
  }

  async function joinExistingSession() {
    const name = playerName.trim();
    const code = sessionInput.trim().toUpperCase();
    if (!name || !code) {
      setError("Enter a player name and session code.");
      return;
    }

    setError("");
    await joinSession(code, name);
  }

  async function joinSession(code, name) {
    await apiRequest(`/sessions/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: { playerName: name },
    });

    localStorage.setItem("escape.sessionCode", code);
    localStorage.setItem("escape.playerName", name);
    setSessionCode(code);
    setSessionInput(code);
    setPlayerName(name);
    setScreen("room");
    await refreshGame(code);
  }

  async function startGame() {
    await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/start`, {
      method: "POST",
    });
    await refreshGame(sessionCode);
  }

  async function refreshGame(code = sessionCode) {
    const nextState = await apiRequest(`/sessions/${encodeURIComponent(code)}/state`);
    setSessionState(nextState);

    if (nextState.completed) {
      await loadReport(code);
      return;
    }

    const nextRoom = await apiRequest(`/rooms/${nextState.currentRoomId}`);
    setRoom(nextRoom);
    const nextActivity = await apiRequest(`/sessions/${encodeURIComponent(code)}/activity`);
    setActivity(nextActivity);
  }

  async function inspectEvidence(evidence) {
    setConsoleEntry({
      title: `${evidence.type} | ${evidence.title}`,
      body: evidence.content,
    });

    await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/evidence/view`, {
      method: "POST",
      body: {
        playerName,
        evidenceTitle: evidence.title,
      },
    });

    const nextActivity = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/activity`);
    setActivity(nextActivity);
  }

  async function submitAction(action) {
    setSubmitting(true);
    try {
      const result = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/submit`, {
        method: "POST",
        body: {
          playerName,
          selectedActionId: action.id,
        },
      });

      setConsoleEntry({
        title: result.correct ? "Correct remediation" : "Incorrect remediation",
        body: result.correct
          ? `${result.message}\n\nRoot cause:\n${result.rootCause}\n\nLearning point:\n${result.learningPoint}`
          : result.message,
      });

      await refreshGame(sessionCode);
    } catch (submitError) {
      setConsoleEntry({
        title: "Submission failed",
        body: submitError.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function requestHint() {
    if (!room) {
      return;
    }

    const hint = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/hint`, {
      method: "POST",
      body: { playerName },
    });

    setConsoleEntry({
      title: hint.hintNumber ? `Hint ${hint.hintNumber}` : "No more hints",
      body: hint.hint,
    });
    await refreshGame(sessionCode);
  }

  async function loadReport(code = sessionCode) {
    const nextReport = await apiRequest(`/sessions/${encodeURIComponent(code)}/report`);
    setReport(nextReport);
    setScreen("final");
  }

  function resetGame() {
    localStorage.removeItem("escape.sessionCode");
    localStorage.removeItem("escape.playerName");
    setScreen("join");
    setSessionCode("");
    setSessionInput("");
    setSessionState(null);
    setRoom(null);
    setActivity([]);
    setReport(null);
    setConsoleEntry({
      title: "Incident console",
      body: "Create or join a session to begin.",
    });
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Co-operative incident response</p>
          <h1>Kubernetes Outage Escape Room</h1>
        </div>
        <div className="session-chip">{sessionCode ? `Session ${sessionCode}` : "No active session"}</div>
      </header>

      {screen === "join" && (
        <JoinScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          sessionInput={sessionInput}
          setSessionInput={setSessionInput}
          createSession={createSession}
          joinExistingSession={joinExistingSession}
          error={error}
        />
      )}

      {screen === "room" && sessionState && room && (
        <RoomScreen
          playerName={playerName}
          sessionState={sessionState}
          room={room}
          activity={activity}
          consoleEntry={consoleEntry}
          startGame={startGame}
          inspectEvidence={inspectEvidence}
          submitAction={submitAction}
          requestHint={requestHint}
          submitting={submitting}
        />
      )}

      {screen === "final" && report && (
        <FinalScreen report={report} resetGame={resetGame} />
      )}
    </main>
  );
}

function JoinScreen({
  playerName,
  setPlayerName,
  sessionInput,
  setSessionInput,
  createSession,
  joinExistingSession,
  error,
}) {
  return (
    <section className="lobby">
      <div className="panel intro-panel">
        <h2>Assemble the response team</h2>
        <p>
          Create a new outage room or join with a session code. Open a second browser window with
          the same code to demo co-operative multiplayer.
        </p>

        <label>
          Player name
          <input
            value={playerName}
            maxLength={40}
            placeholder="Madhuri"
            onChange={(event) => setPlayerName(event.target.value)}
          />
        </label>

        <div className="join-actions">
          <button type="button" className="primary-button" onClick={createSession}>
            Create session
          </button>
          <label>
            Existing session code
            <input
              value={sessionInput}
              maxLength={6}
              placeholder="ABC123"
              onChange={(event) => setSessionInput(event.target.value.toUpperCase())}
            />
          </label>
          <button type="button" onClick={joinExistingSession}>
            Join session
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}

function RoomScreen({
  playerName,
  sessionState,
  room,
  activity,
  consoleEntry,
  startGame,
  inspectEvidence,
  submitAction,
  requestHint,
  submitting,
}) {
  return (
    <section className="game-layout">
      <aside className="panel status-panel">
        <Metric label="Room" value={`${sessionState.currentRoomId} / ${TOTAL_ROOMS}`} />
        <Metric label="Score" value={sessionState.score} />
        <Metric label="Service health" value={sessionState.serviceHealth} />
        <div className="health-track">
          <div style={{ width: `${sessionState.serviceHealth}%` }} />
        </div>

        <button type="button" disabled={sessionState.status !== "WAITING"} onClick={startGame}>
          {sessionState.status === "WAITING" ? "Start game" : "Game started"}
        </button>
        <button type="button" onClick={requestHint}>
          Request hint
        </button>

        <h3>Players</h3>
        <ul className="plain-list">
          {sessionState.players.map((player) => (
            <li key={player.name}>{player.name}</li>
          ))}
        </ul>

        <h3>Activity</h3>
        <ol className="activity-list">
          {activity.slice(-10).reverse().map((event, index) => (
            <li key={`${event.timestamp}-${index}`}>{event.message}</li>
          ))}
        </ol>
      </aside>

      <section className="room-stage">
        <div className="room-heading">
          <div>
            <p className="eyebrow">{room.theme}</p>
            <h2>{room.name}</h2>
            <p>{room.story}</p>
          </div>
          <div className="difficulty-badge">{room.difficulty}</div>
        </div>

        <div className="workspace-grid">
          <section className="panel evidence-panel">
            <div className="section-heading">
              <h3>Evidence</h3>
              <span>{room.evidence.length} clues</span>
            </div>
            <div className="evidence-list">
              {room.evidence.map((evidence) => (
                <button
                  type="button"
                  className="evidence-button"
                  key={evidence.title}
                  onClick={() => inspectEvidence(evidence)}
                >
                  <span className="evidence-type">{shortType(evidence.type)}</span>
                  <span>
                    <span className="evidence-title">{evidence.title}</span>
                    <span className="evidence-summary">{preview(evidence.content)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel action-panel">
            <div className="section-heading">
              <h3>Remediation actions</h3>
              <span>{room.failureArea}</span>
            </div>
            <div className="action-list">
              {room.actions.map((action) => (
                <button
                  type="button"
                  className="action-button"
                  key={action.id}
                  disabled={submitting}
                  onClick={() => submitAction(action)}
                >
                  <span className="action-title">{action.text}</span>
                  <span className="action-id">Action {action.id}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="panel console-panel" aria-live="polite">
          <div className="section-heading">
            <h3>Incident console</h3>
            <span>{playerName}</span>
          </div>
          <strong>{consoleEntry.title}</strong>
          <pre>{consoleEntry.body}</pre>
        </section>
      </section>
    </section>
  );
}

function FinalScreen({ report, resetGame }) {
  return (
    <section className="panel report-panel">
      <p className="eyebrow">Final report</p>
      <h2>{report.completed ? "Outage escaped" : "Outage still active"}</h2>

      <div className="report-grid">
        <ReportMetric label="Final score" value={report.finalScore} />
        <ReportMetric label="Service health" value={report.serviceHealth} />
        <ReportMetric label="Wrong attempts" value={report.wrongAttempts} />
        <ReportMetric label="Hints used" value={report.hintsUsed} />
      </div>

      <h3>Root cause</h3>
      <p>{report.rootCause || "Complete the final room to reveal the root cause."}</p>

      <h3>Learning point</h3>
      <p>{report.learningPoint || "Complete the final room to reveal the learning point."}</p>

      <button type="button" onClick={resetGame}>New session</button>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function apiRequest(path, options = {}) {
  const request = {
    method: options.method || "GET",
    headers: {},
  };

  if (options.body !== undefined) {
    request.headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, request);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload.message ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload;
}

function themeClass(theme = "") {
  const normalized = theme.toLowerCase();
  if (normalized.includes("desert")) return "theme-desert";
  if (normalized.includes("snow")) return "theme-snow";
  return "theme-jungle";
}

function preview(content) {
  return content.replace(/\s+/g, " ").slice(0, 88);
}

function shortType(type) {
  return type
    .split("_")
    .map((part) => part.slice(0, 3))
    .join("");
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
