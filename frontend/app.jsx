import React from "react";
import ReactDOM from "react-dom/client";
import GameMap from "./GameMap.jsx";
import "./GameMap.css";

const API_BASE_URL = "/api";
const TOTAL_ROOMS = 3;

const ROOM_COPY = {
  1: {
    correctFix: "Updating the path to /api/inventory/check allows the Order Service to call Inventory successfully.",
    incorrect: "Restarting the pod does not fix the broken Inventory Service path. The configuration still points to the wrong endpoint.",
  },
  2: {
    correctFix: "Increasing memory request and limit gives the container enough resources during telemetry bursts.",
    incorrect: "Changing service or rollout settings does not fix a container that is being killed for exceeding its memory limit.",
  },
  3: {
    correctFix: "Updating the selector allows the Service to discover the correct pod endpoints.",
    incorrect: "The API pod is already healthy. This action does not fix the empty Service endpoint list.",
  },
};

const ROOM1_CORRECT_PAIRS = {
  "customer-api": "Handles customer requests",
  "order-service": "Processes customer orders",
  "database-service": "Stores application data",
};

const GAME_SOUNDS = {
  click: "/assets/sounds/universfield-click-button-app-147358.mp3",
  correct: "/assets/sounds/ui-success-chime.mp3",
  wrong: "/assets/sounds/47313572-ui-sounds-pack-5-2-359749.mp3",
  unlock: "/assets/sounds/dragon-studio-heavy-door-unlocking-515258.mp3",
  victory: "/assets/sounds/soundshelfstudio-ui-success-chime-513565.mp3",
};

const AMBIENCE_SOUNDS = {
  forest: "/assets/sounds/fxprosound-winter-rain-in-oak-forest-loop-185672.mp3",
  desert: "/assets/sounds/tanweraman-desert-wind-2-350417.mp3",
  snow: "/assets/sounds/snow-storm-wind-ambience-272426.mp3",
};

let gameAudioContext;

function getGameAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!gameAudioContext) {
    gameAudioContext = new AudioContextClass();
  }
  if (gameAudioContext.state === "suspended") {
    gameAudioContext.resume().catch(() => {});
  }
  return gameAudioContext;
}

function playFallbackTone(name, volumeOverride) {
  const context = getGameAudioContext();
  if (!context) return;

  const patterns = {
    click: [420],
    correct: [660, 880],
    wrong: [180, 120],
    unlock: [360, 540, 720],
    victory: [520, 660, 780, 980],
  };
  const frequencies = patterns[name] || [440];
  const baseVolume = volumeOverride ?? (name === "click" ? 0.12 : 0.2);

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.09;
    const end = start + (name === "click" ? 0.06 : 0.12);

    oscillator.type = name === "wrong" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(baseVolume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });
}

function playGameSound(name, volumeOverride) {
  const src = GAME_SOUNDS[name];
  playFallbackTone(name, volumeOverride);
  if (!src) return;
  const audio = new Audio(encodeURI(src));
  audio.volume = volumeOverride ?? (name === "click" ? 0.35 : name === "unlock" ? 0.48 : 0.6);
  audio.play().catch(() => {});
}

function ambienceKeyFor(screen, activeRoomId) {
  if (screen === "final") return "snow";
  if (screen === "briefing") return "forest";
  if (activeRoomId === 2) return "desert";
  if (activeRoomId === 3) return "snow";
  return "forest";
}

function App() {
  const [screen, setScreen] = React.useState("join");
  const [playerName, setPlayerName] = React.useState(localStorage.getItem("escape.playerName") || "");
  const [sessionInput, setSessionInput] = React.useState(localStorage.getItem("escape.sessionCode") || "");
  const [sessionCode, setSessionCode] = React.useState(localStorage.getItem("escape.sessionCode") || "");
  const [sessionState, setSessionState] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [room1State, setRoom1State] = React.useState(null);
  const [room2State, setRoom2State] = React.useState(null);
  const [room3State, setRoom3State] = React.useState(null);
  const [activeRoomId, setActiveRoomId] = React.useState(1);
  const [activity, setActivity] = React.useState([]);
  const [investigationStarted, setInvestigationStarted] = React.useState(false);
  const [viewedEvidence, setViewedEvidence] = React.useState(null);
  const [pendingAction, setPendingAction] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const [hintModal, setHintModal] = React.useState(null);
  const [completionSummary, setCompletionSummary] = React.useState(null);
  const [briefingNotice, setBriefingNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [soundEnabled, setSoundEnabled] = React.useState(localStorage.getItem("escape.soundEnabled") === "true");
  const [mapPopupRoomId, setMapPopupRoomId] = React.useState(null);
  const ambienceRef = React.useRef(null);
  const resumeAttemptedRef = React.useRef(false);

  React.useEffect(() => {
    document.body.classList.remove("screen-join", "screen-briefing", "screen-map", "screen-room", "screen-final");
    document.body.classList.add(`screen-${screen}`);
  }, [screen]);

  React.useEffect(() => {
    document.body.classList.remove("theme-jungle", "theme-desert", "theme-snow", "theme-container", "theme-kubernetes");
    document.body.classList.add(themeClass(room?.theme));
  }, [room?.theme]);

  React.useEffect(() => {
    document.body.classList.remove("briefing-level-1", "briefing-level-2", "briefing-level-3", "briefing-complete");
    if (screen !== "briefing") return;
    document.body.classList.add(room1State?.completed ? "briefing-complete" : `briefing-level-${room1State?.currentLevel || 1}`);
  }, [screen, room1State?.currentLevel, room1State?.completed]);

  React.useEffect(() => {
    if (!sessionCode || !playerName || screen !== "room" || feedback?.correct) return undefined;
    const handle = window.setInterval(() => refreshGame(sessionCode, { keepBriefing: true }).catch(() => {}), 3000);
    return () => window.clearInterval(handle);
  }, [sessionCode, playerName, screen, feedback, activeRoomId]);

  React.useEffect(() => {
    if (!sessionCode || !playerName || !["briefing", "map"].includes(screen)) return undefined;
    const handle = window.setInterval(() => refreshBriefingState(sessionCode).catch(() => {}), 2500);
    return () => window.clearInterval(handle);
  }, [sessionCode, playerName, screen]);

  React.useEffect(() => {
    const handleClick = (event) => {
      if (soundEnabled && event.target.closest("button")) {
        playGameSound("click");
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [soundEnabled]);

  React.useEffect(() => {
    if (!soundEnabled) {
      ambienceRef.current?.pause();
      return undefined;
    }
    const key = ambienceKeyFor(screen, activeRoomId);
    const src = AMBIENCE_SOUNDS[key];
    if (!src) return undefined;
    let cancelled = false;

    function startAmbience() {
      if (cancelled) return;
      if (ambienceRef.current?.dataset.src === src) {
        ambienceRef.current.play().catch(() => {});
        return;
      }
      if (ambienceRef.current) {
        ambienceRef.current.pause();
      }
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0.18;
      audio.dataset.src = src;
      ambienceRef.current = audio;
      audio.play().catch(() => {});
    }

    document.addEventListener("click", startAmbience, { once: true });
    startAmbience();

    return () => {
      cancelled = true;
      document.removeEventListener("click", startAmbience);
    };
  }, [screen, activeRoomId, soundEnabled]);

  React.useEffect(() => {
    if (!feedback || !soundEnabled) return;
    playGameSound(feedback.correct ? "correct" : "wrong");
  }, [feedback?.message, feedback?.correct, soundEnabled]);

  React.useEffect(() => {
    if (briefingNotice && soundEnabled) {
      playGameSound("unlock");
    }
  }, [briefingNotice, soundEnabled]);

  React.useEffect(() => {
    if (screen === "final" && soundEnabled) {
      playGameSound("victory");
    }
  }, [screen, soundEnabled]);

  React.useEffect(() => {
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const savedCode = localStorage.getItem("escape.sessionCode");
    const savedPlayerName = localStorage.getItem("escape.playerName");
    if (!savedCode || !savedPlayerName) return;

    resumeSavedSession(savedCode, savedPlayerName).catch(() => {
      clearSavedSession();
      setError("Saved session was not available. Create or join a session to start fresh.");
    });
  }, []);

  function toggleSound() {
    getGameAudioContext();
    const nextSoundEnabled = !soundEnabled;
    setSoundEnabled(nextSoundEnabled);
    localStorage.setItem("escape.soundEnabled", String(nextSoundEnabled));
    if (!nextSoundEnabled) {
      ambienceRef.current?.pause();
      return;
    }
    playGameSound("correct", 0.22);
  }

  async function createSession() {
    const name = playerName.trim();
    if (!name) {
      setError("Enter a player name before creating a session.");
      return;
    }
    setError("");
    const created = await apiRequest("/sessions", { method: "POST" });
    await joinSession(created.sessionCode, name, "briefing");
  }

  async function joinExistingSession() {
    const name = playerName.trim();
    const code = sessionInput.trim().toUpperCase();
    if (!name || !code) {
      setError("Enter both a player name and session code to join.");
      return;
    }
    setError("");
    await joinSession(code, name, "briefing");
  }

  async function joinSession(code, name, nextScreen = "room") {
    const joinedState = await apiRequest(`/sessions/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: { playerName: name },
    });
    localStorage.setItem("escape.sessionCode", code);
    localStorage.setItem("escape.playerName", name);
    setSessionCode(code);
    setSessionInput(code);
    setPlayerName(name);
    setSessionState(joinedState);
    if (nextScreen === "briefing") {
      const nextRoom1State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/1/state`);
      setRoom1State(nextRoom1State);
      if (nextRoom1State.completed) {
        const nextRoom2State = await refreshRoom2State(code);
        if (nextRoom2State?.completed) {
          await refreshRoom3State(code);
        }
      } else {
        setRoom2State(null);
        setRoom3State(null);
      }
      setBriefingNotice("Mission ready. Review the rules, then start Room 1 Level 1.");
      setScreen("briefing");
      await refreshActivity(code);
      return;
    }
    setScreen("room");
    await refreshGame(code);
  }

  async function resumeSavedSession(code, name) {
    const normalizedCode = code.trim().toUpperCase();
    setError("");
    setSessionCode(normalizedCode);
    setSessionInput(normalizedCode);
    setPlayerName(name);

    const nextState = await apiRequest(`/sessions/${encodeURIComponent(normalizedCode)}/state`);
    setSessionState(nextState);

    if (!nextState.players.some((player) => player.name.toLowerCase() === name.trim().toLowerCase())) {
      await joinSession(normalizedCode, name, "briefing");
      return;
    }

    if (nextState.completed) {
      await loadReport(normalizedCode);
      return;
    }

    const nextRoom1State = await apiRequest(`/sessions/${encodeURIComponent(normalizedCode)}/rooms/1/state`);
    setRoom1State(nextRoom1State);
    if (nextRoom1State.completed) {
      const nextRoom2State = await refreshRoom2State(normalizedCode);
      if (nextRoom2State?.completed) {
        await refreshRoom3State(normalizedCode);
      }
    } else {
      setRoom2State(null);
      setRoom3State(null);
    }
    await refreshActivity(normalizedCode);
    setBriefingNotice("Session restored. Continue from the current mission state or start a new session.");
    setScreen("briefing");
  }

  async function startGame() {
    setBriefingNotice("");
    setMapPopupRoomId(null);
    setScreen("map");
  }

  async function openRoom(roomId) {
    if (sessionState?.status === "WAITING") {
      await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/start`, { method: "POST" });
    }
    setBriefingNotice("");
    setFeedback(null);
    setMapPopupRoomId(null);
    setActiveRoomId(roomId);
    setScreen("room");
    await refreshGame(sessionCode, { keepBriefing: true, roomId });
  }

  async function refreshGame(code = sessionCode, options = {}) {
    const nextState = await apiRequest(`/sessions/${encodeURIComponent(code)}/state`);
    setSessionState(nextState);
    if (nextState.completed) {
      await loadReport(code);
      return;
    }
    const requestedRoomId = options.roomId || activeRoomId || nextState.currentRoomId;
    if (requestedRoomId === 3) {
      const nextRoom3State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/3/state`);
      setRoom3State(nextRoom3State);
      setRoom((currentRoom) => {
        const nextRoom = { roomId: 3, name: nextRoom3State.roomName, theme: nextRoom3State.theme, story: nextRoom3State.story, difficulty: "HARD" };
        if (!options.keepBriefing || currentRoom?.roomId !== 3) {
          setInvestigationStarted(false);
          setFeedback(null);
          setViewedEvidence(null);
          setPendingAction(null);
        }
        return nextRoom;
      });
      await refreshActivity(code);
      return;
    }
    if (requestedRoomId === 2) {
      const nextRoom2State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/2/state`);
      setRoom2State(nextRoom2State);
      setRoom((currentRoom) => {
        const nextRoom = { roomId: 2, name: nextRoom2State.roomName, theme: nextRoom2State.theme, story: nextRoom2State.story, difficulty: "MEDIUM" };
        if (!options.keepBriefing || currentRoom?.roomId !== 2) {
          setInvestigationStarted(false);
          setFeedback(null);
          setViewedEvidence(null);
          setPendingAction(null);
        }
        return nextRoom;
      });
      await refreshActivity(code);
      return;
    }
    const nextRoom = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/1`);
    if (nextState.currentRoomId === 1 || requestedRoomId === 1) {
      const nextRoom1State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/1/state`);
      setRoom1State(nextRoom1State);
    } else {
      setRoom1State(null);
    }
    setRoom((currentRoom) => {
      if (!options.keepBriefing || currentRoom?.roomId !== nextRoom.roomId) {
        setInvestigationStarted(false);
        setFeedback(null);
        setViewedEvidence(null);
        setPendingAction(null);
      }
      return nextRoom;
    });
    await refreshActivity(code);
  }

  async function refreshRoom2State(code = sessionCode) {
    try {
      const nextRoom2State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/2/state`);
      setRoom2State(nextRoom2State);
      return nextRoom2State;
    } catch {
      setRoom2State(null);
      return null;
    }
  }

  async function refreshRoom3State(code = sessionCode) {
    try {
      const nextRoom3State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/3/state`);
      setRoom3State(nextRoom3State);
      return nextRoom3State;
    } catch {
      setRoom3State(null);
      return null;
    }
  }

  async function refreshActivity(code = sessionCode) {
    const nextActivity = await apiRequest(`/sessions/${encodeURIComponent(code)}/activity`);
    setActivity(nextActivity);
  }

  async function refreshBriefingState(code = sessionCode) {
    const nextState = await apiRequest(`/sessions/${encodeURIComponent(code)}/state`);
    setSessionState(nextState);
    if (nextState.currentRoomId === 1 && !nextState.completed) {
      const nextRoom1State = await apiRequest(`/sessions/${encodeURIComponent(code)}/rooms/1/state`);
      setRoom1State(nextRoom1State);
      if (nextRoom1State.completed) {
        const nextRoom2State = await refreshRoom2State(code);
        if (nextRoom2State?.completed) {
          await refreshRoom3State(code);
        } else {
          setRoom3State(null);
        }
      } else {
        setRoom2State(null);
        setRoom3State(null);
      }
    }
    await refreshActivity(code);
  }

  async function beginInvestigation() {
    await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/begin`, {
      method: "POST",
      body: { playerName },
    });
    setInvestigationStarted(true);
    await refreshActivity();
  }

  async function inspectEvidence(evidence) {
    setViewedEvidence(evidence);
    await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/evidence/view`, {
      method: "POST",
      body: { playerName, evidenceTitle: evidence.title },
    });
    await refreshActivity();
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setSubmitting(true);
    try {
      const result = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/submit`, {
        method: "POST",
        body: { playerName, selectedActionId: pendingAction.id },
      });
      setPendingAction(null);
      setFeedback({
        ...result,
        actionTitle: pendingAction.text,
        correctFix: ROOM_COPY[room.roomId]?.correctFix,
        incorrect: ROOM_COPY[room.roomId]?.incorrect,
      });
      setSessionState((current) => current ? {
        ...current,
        score: result.score,
        serviceHealth: result.serviceHealth,
        completed: result.completed,
        wrongAttempts: result.correct ? current.wrongAttempts : current.wrongAttempts + 1,
      } : current);
      await refreshActivity();
    } catch (submitError) {
      setFeedback({ correct: false, message: submitError.message, actionTitle: pendingAction.text });
      setPendingAction(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestHint() {
    if (!room || sessionState.currentRoomHintUsed) return;
    const hint = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/${room.roomId}/hint`, {
      method: "POST",
      body: { playerName },
    });
    setHintModal(hint);
    await refreshGame(sessionCode, { keepBriefing: true });
  }

  async function submitRoom1Level(levelNumber, answer) {
    const result = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/1/levels/${levelNumber}/submit`, {
      method: "POST",
      body: { playerName, ...answer },
    });
    if (result.correct) {
      setBriefingNotice(result.roomCompleted
        ? "Room 1 completed. Review the mission status before continuing."
        : `Level ${result.levelNumber} completed. Level ${result.currentLevel} is now unlocked.`);
      setMapPopupRoomId(result.roomCompleted ? null : 1);
      setScreen("map");
      if (result.roomCompleted) {
        setCompletionSummary(createCompletionSummary({
          roomId: 1,
          roomName: "Microservice Incident Response",
          levelNumber: result.levelNumber,
          roomCompleted: true,
          gameCompleted: false,
          score: result.score,
          serviceHealth: result.serviceHealth,
          message: result.message,
        }));
      }
    }
    setFeedback({
      correct: result.correct,
      message: result.message,
      roomCompleted: result.roomCompleted,
    });
    setSessionState((current) => current ? {
      ...current,
      score: result.score,
      serviceHealth: result.serviceHealth,
      wrongAttempts: result.correct ? current.wrongAttempts : current.wrongAttempts + 1,
    } : current);
    const nextRoom1State = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/1/state`);
    setRoom1State(nextRoom1State);
    await refreshActivity();
    return result;
  }

  async function submitRoom2Level(levelNumber, answer) {
    const result = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/2/levels/${levelNumber}/submit`, {
      method: "POST",
      body: { playerName, ...answer },
    });
    if (result.correct) {
      setBriefingNotice(result.roomCompleted
        ? "Room 2 completed. Room 3 Level 1 is now unlocked."
        : `Room 2 Level ${result.currentLevel} is now unlocked.`);
      setMapPopupRoomId(result.roomCompleted ? null : 2);
      setScreen("map");
      if (result.roomCompleted) {
        setCompletionSummary(createCompletionSummary({
          roomId: 2,
          roomName: "Container Recovery Operations",
          levelNumber: result.levelNumber,
          roomCompleted: true,
          gameCompleted: false,
          score: result.score,
          serviceHealth: result.serviceHealth,
          message: result.message,
        }));
      }
    }
    setFeedback({
      correct: result.correct,
      message: result.message,
      roomCompleted: result.roomCompleted,
    });
    setSessionState((current) => current ? {
      ...current,
      score: result.score,
      serviceHealth: result.serviceHealth,
      wrongAttempts: result.correct ? current.wrongAttempts : current.wrongAttempts + 1,
    } : current);
    const nextRoom2State = await refreshRoom2State(sessionCode);
    if (nextRoom2State?.completed) {
      await refreshRoom3State(sessionCode);
    }
    await refreshActivity();
    return result;
  }

  async function submitRoom3Level(levelNumber, answer) {
    const result = await apiRequest(`/sessions/${encodeURIComponent(sessionCode)}/rooms/3/levels/${levelNumber}/submit`, {
      method: "POST",
      body: { playerName, ...answer },
    });
    if (result.correct && result.gameCompleted) {
      setCompletionSummary(createCompletionSummary({
        roomId: 3,
        roomName: "Kubernetes Service Routing Fix",
        levelNumber: result.levelNumber,
        roomCompleted: result.roomCompleted,
        gameCompleted: true,
        score: result.score,
        serviceHealth: result.serviceHealth,
        message: result.message,
      }));
    } else if (result.correct) {
      setBriefingNotice(`Room 3 Level ${result.currentLevel} is now unlocked.`);
      setMapPopupRoomId(3);
      setScreen("map");
    }
    setFeedback({
      correct: result.correct,
      message: result.message,
      roomCompleted: result.roomCompleted,
      gameCompleted: result.gameCompleted,
    });
    setSessionState((current) => current ? {
      ...current,
      score: result.score,
      serviceHealth: result.serviceHealth,
      completed: result.gameCompleted || current.completed,
      currentRoomId: result.gameCompleted ? 3 : current.currentRoomId,
      wrongAttempts: result.correct ? current.wrongAttempts : current.wrongAttempts + 1,
    } : current);
    if (!result.gameCompleted) {
      await refreshRoom3State(sessionCode);
      await refreshActivity();
    }
    return result;
  }

  function createCompletionSummary({ roomId, roomName, levelNumber, roomCompleted, gameCompleted, score, serviceHealth, message }) {
    return {
      roomId,
      roomName,
      levelNumber,
      roomCompleted,
      gameCompleted,
      score,
      serviceHealth,
      message,
      hintsUsed: sessionState?.hintsUsed || 0,
      wrongAttempts: sessionState?.wrongAttempts || 0,
      buttonText: gameCompleted ? "View Final Report" : roomCompleted ? "Next Room" : "Next Level",
    };
  }

  async function continueAfterCompletion() {
    const summary = completionSummary;
    setCompletionSummary(null);
    if (summary?.gameCompleted) {
      await loadReport(sessionCode);
      return;
    }
    if (summary?.roomCompleted) {
      setScreen("map");
      setMapPopupRoomId(summary.roomId);
    }
  }

  async function goNext() {
    await refreshGame(sessionCode);
  }

  async function loadReport(code = sessionCode) {
    const nextReport = await apiRequest(`/sessions/${encodeURIComponent(code)}/report`);
    setReport(nextReport);
    const nextActivity = await apiRequest(`/sessions/${encodeURIComponent(code)}/activity`);
    setActivity(nextActivity);
    setScreen("final");
  }

  function clearSavedSession() {
    localStorage.removeItem("escape.sessionCode");
    localStorage.removeItem("escape.playerName");
    setSessionCode("");
    setSessionInput("");
    setSessionState(null);
    setRoom(null);
    setRoom1State(null);
    setRoom2State(null);
    setRoom3State(null);
    setActiveRoomId(1);
    setActivity([]);
    setReport(null);
    setInvestigationStarted(false);
    setFeedback(null);
    setError("");
  }

  function resetGame() {
    clearSavedSession();
    setScreen("join");
  }

  const canCreate = playerName.trim().length > 0;
  const canJoin = playerName.trim().length > 0 && sessionInput.trim().length > 0;

  return (
    <main className="app-shell">
      <button
        type="button"
        className={`sound-toggle ${soundEnabled ? "enabled" : ""}`}
        onClick={toggleSound}
        aria-label={soundEnabled ? "Turn game sound off" : "Turn game sound on"}
      >
        {soundEnabled ? "Sound On" : "Sound Off"}
      </button>
      {screen !== "join" && (
        <button type="button" className="session-reset-button" onClick={resetGame}>
          Leave Session
        </button>
      )}

      {screen === "join" && (
        <header className="top-bar">
          <div>
            <p className="eyebrow">Co-operative incident response</p>
            <h1>Kubernetes Outage Escape Room</h1>
          </div>
          <div className="session-chip">{sessionCode ? `Session ${sessionCode}` : "No active session"}</div>
        </header>
      )}

      {screen === "join" && (
        <JoinScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          sessionInput={sessionInput}
          setSessionInput={setSessionInput}
          createSession={createSession}
          joinExistingSession={joinExistingSession}
          resetGame={resetGame}
          error={error}
          canCreate={canCreate}
          canJoin={canJoin}
          hasSavedSession={Boolean(sessionCode)}
        />
      )}

      {screen === "briefing" && sessionState && (
        <MissionBriefing
          sessionCode={sessionCode}
          playerName={playerName}
          players={sessionState.players}
          activity={activity}
          startGame={startGame}
          openRoom={openRoom}
          room1State={room1State}
          room2State={room2State}
          room3State={room3State}
          notice={briefingNotice}
        />
      )}

      {screen === "map" && sessionState && (
        <GameMap
          sessionCode={sessionCode}
          playerName={playerName}
          players={sessionState.players}
          openRoom={openRoom}
          room1State={room1State}
          room2State={room2State}
          room3State={room3State}
          selectedRoomId={mapPopupRoomId}
          setSelectedRoomId={setMapPopupRoomId}
          notice={briefingNotice}
        />
      )}

      {screen === "room" && sessionState && room && (
        <RoomScreen
          playerName={playerName}
          sessionState={sessionState}
          room={room}
          room1State={room1State}
          room2State={room2State}
          room3State={room3State}
          activity={activity}
          investigationStarted={investigationStarted}
          beginInvestigation={beginInvestigation}
          startGame={startGame}
          inspectEvidence={inspectEvidence}
          setPendingAction={setPendingAction}
          requestHint={requestHint}
          submitting={submitting}
          feedback={feedback}
          goNext={goNext}
          loadReport={loadReport}
          submitRoom1Level={submitRoom1Level}
          submitRoom2Level={submitRoom2Level}
          submitRoom3Level={submitRoom3Level}
        />
      )}

      {screen === "final" && report && <FinalScreen report={report} activity={activity} resetGame={resetGame} />}

      {viewedEvidence && (
        <Modal title={viewedEvidence.title} onClose={() => setViewedEvidence(null)}>
          <p className="modal-kicker">{viewedEvidence.type}</p>
          <pre>{viewedEvidence.content}</pre>
        </Modal>
      )}

      {pendingAction && (
        <Modal title="Confirm remediation" onClose={() => setPendingAction(null)}>
          <p>Are you sure you want to apply this remediation?</p>
          <div className="selected-action">{pendingAction.text}</div>
          <p className="warning-text">Incorrect actions reduce score and service health.</p>
          <div className="modal-actions">
            <button type="button" className="primary-button" disabled={submitting} onClick={confirmAction}>
              Confirm Fix
            </button>
            <button type="button" onClick={() => setPendingAction(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {hintModal && (
        <Modal title="Investigation hint" onClose={() => setHintModal(null)}>
          <p>{hintModal.hint}</p>
          <p className="warning-text">Hint used: 5 marks reduced. Current score: {hintModal.score}.</p>
        </Modal>
      )}

      {completionSummary && (
        <CompletionSummaryModal summary={completionSummary} onContinue={continueAfterCompletion} />
      )}
    </main>
  );
}

function JoinScreen({ playerName, setPlayerName, sessionInput, setSessionInput, createSession, joinExistingSession, resetGame, error, canCreate, canJoin, hasSavedSession }) {
  return (
    <section className="lobby">
      <div className="panel intro-panel">
        <div className="briefing-card">
          <p className="eyebrow">Incident briefing</p>
          <p>
            Welcome to a cooperative incident response simulation. Your team must investigate Kubernetes outage evidence,
            identify the root cause, and apply the correct remediation before service health drops too low.
          </p>
        </div>
        <div className="how-it-works">
          {["Create or join a session", "Inspect evidence in each outage room", "Submit the correct remediation action to unlock the next room"].map((step, index) => (
            <div key={step}><strong>{index + 1}</strong><span>{step}</span></div>
          ))}
        </div>
        <h2>Assemble the response team</h2>
        <label>
          Player name
          <input value={playerName} maxLength={40} placeholder="Madhuri" onChange={(event) => setPlayerName(event.target.value)} />
        </label>
        <div className="join-actions">
          <button type="button" className="primary-button" disabled={!canCreate} onClick={createSession}>Create Session</button>
          <label>
            Session code
            <input value={sessionInput} maxLength={6} placeholder="ABC123" onChange={(event) => setSessionInput(event.target.value.toUpperCase())} />
          </label>
          <button type="button" disabled={!canJoin} onClick={joinExistingSession}>Join Session</button>
          {hasSavedSession && <button type="button" onClick={resetGame}>Clear Saved Session</button>}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function MissionBriefing({ sessionCode, playerName, players = [], activity = [], startGame, openRoom, room1State, room2State, room3State, notice }) {
  const rules = [
    "Each room has 3 levels.",
    "Complete levels in order.",
    "Solve one technical puzzle per level.",
    "Correct answers unlock progress.",
    "Wrong answers reduce score or health.",
    "Backend validates every answer.",
    "Rooms and levels cannot be skipped.",
    "Complete all rooms to escape.",
  ];

  const room1Completed = Boolean(room1State?.completed);
  const room2Unlocked = room1Completed;
  const room2Completed = Boolean(room2State?.completed);
  const room3Unlocked = room2Completed;
  const room3Completed = Boolean(room3State?.completed);
  const activeRoom = room3Unlocked && !room3Completed ? 3 : room2Unlocked && !room2Completed ? 2 : 1;
  const currentRoom1Level = room1State?.currentLevel || 1;
  const currentRoom2Level = room2State?.currentLevel || 1;
  const currentRoom3Level = room3State?.currentLevel || 1;
  const rooms = [
    {
      id: 1,
      label: room1Completed ? "Room 1: Completed" : "Room 1: Available",
      title: "Microservice Incident Response",
      description: "Restore customer-api health, ownership, and database configuration.",
      levels: ["Service Health Check", "Service Responsibility Mapping", "Configuration Recovery"],
      locked: false,
      completed: room1Completed,
      currentLevel: currentRoom1Level,
    },
    {
      id: 2,
      label: !room2Unlocked ? "Room 2: Locked" : room2Completed ? "Room 2: Completed" : "Room 2: Available",
      title: "Container Recovery Operations",
      description: "Identify the failed container state, rebuild startup order, and roll back safely.",
      levels: ["Container Status Inspection", "Container Lifecycle Sequence", "Safe Container Recovery"],
      locked: !room2Unlocked,
      completed: room2Completed,
      currentLevel: currentRoom2Level,
    },
    {
      id: 3,
      label: !room3Unlocked ? "Room 3: Locked" : room3Completed ? "Room 3: Completed" : "Room 3: Available",
      title: "Kubernetes Service Routing Fix",
      description: "Inspect endpoints, follow routing evidence, and repair the selector mismatch.",
      levels: ["Endpoint Inspection", "Investigation Sequence", "Selector Fix Command"],
      locked: !room3Unlocked,
      completed: room3Completed,
      currentLevel: currentRoom3Level,
    },
  ];
  const playerStatus = room3Unlocked && !room3Completed
    ? `Room 3 Level ${currentRoom3Level}`
    : room3Completed
      ? "Escape complete"
      : room2Unlocked && !room2Completed
    ? `Room 2 Level ${currentRoom2Level}`
    : room2Completed
      ? "Room 2 complete"
      : room1Completed
      ? "Room 1 complete"
      : `Room 1 Level ${currentRoom1Level}`;
  const activeRoomData = rooms.find((room) => room.id === activeRoom) || rooms[0];
  const roomBriefings = [
    {
      title: "Room 1: Microservice Incident Response",
      text: "Check customer-api health, map service responsibilities, and restore the missing DB_HOST configuration.",
    },
    {
      title: "Room 2: Container Recovery Operations",
      text: "Inspect a failing order-service container, arrange the startup lifecycle, and choose a safe rollback action.",
    },
    {
      title: "Room 3: Kubernetes Service Routing Fix",
      text: "Inspect service endpoints, follow a routing investigation sequence, and fix the selector mismatch.",
    },
  ];

  return (
    <section className="briefing-screen">
      <div className="panel mission-panel">
        <div className="mission-hero">
          <div>
            <h1>Mission Briefing</h1>
            <h2>Kubernetes Outage Escape Room</h2>
            <p>
              A production outage has affected a containerised service platform. Complete each room's 3 levels in order to restore service.
            </p>
          </div>
          <div className="briefing-top-status">
            <div className="briefing-chip">
              <span>Session</span>
              <strong>{sessionCode}</strong>
              <span>Player</span>
              <strong>{playerName}</strong>
              <small>{players.length} connected</small>
            </div>
            <div className="briefing-chip team-chip">
              <span>Team Online</span>
              <ul className="briefing-player-list">
                {players.map((player) => (
                  <li key={player.name}>
                    <span>{player.name}</span>
                    <small>{playerStatus}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mission-lobby-grid">
          <section className="briefing-section mission-rules-card">
            <div className="section-kicker">Game Rules</div>
            <h3>How to Escape</h3>
            <div className="mission-rule-list">
              {rules.map((rule, index) => (
                <span key={rule}><strong>{index + 1}</strong>{rule}</span>
              ))}
            </div>
          </section>

          <section className="briefing-section room1-detail active-mission-card mission-briefing-card">
            <div className="section-kicker">Mission Briefing</div>
            <h3>Incident Room Overview</h3>
            {notice && <p className="briefing-notice">{notice}</p>}
            <div className="room-briefing-list">
              {roomBriefings.map((briefing, index) => (
                <article key={briefing.title} className={activeRoom === index + 1 ? "active" : ""}>
                  <strong>{briefing.title}</strong>
                  <p>{briefing.text}</p>
                </article>
              ))}
            </div>
            <button type="button" className="mission-cta map-cta" onClick={startGame}>
              Start Game Map
            </button>
          </section>
        </div>

        <div className="briefing-main-grid">
          <section className="briefing-section">
            <h3>Game Rules</h3>
            <div className="rule-grid">
              {rules.map((rule, index) => (
                <div className="rule-card" key={rule}>
                  <strong>{index + 1}</strong>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="briefing-right-column">
            <section className="briefing-section">
              <h3>Outage Map</h3>
              <div className="outage-map">
                {rooms.map((room, index) => (
                  <React.Fragment key={room.title}>
                    <article className={`map-room-card ${room.locked ? "locked" : "available"} ${room.completed ? "completed" : ""} ${activeRoom === room.id && !room.completed ? "current-room" : ""}`}>
                      <p className="map-status">{room.locked ? "Locked" : room.completed ? "Completed" : "Available"}</p>
                      <h4>{room.label}</h4>
                      <strong>{room.title}</strong>
                      <ol>
                        {room.levels.map((level, levelIndex) => (
                          <li
                            key={level}
                            className={room.completed || levelIndex + 1 < room.currentLevel ? "level-done" : !room.locked && activeRoom === room.id && levelIndex + 1 === room.currentLevel ? "level-active" : ""}
                          >
                            {!room.locked && !room.completed && activeRoom === room.id && levelIndex + 1 === room.currentLevel ? (
                              <button type="button" className="level-map-button" onClick={() => openRoom(room.id)}>
                                Level {levelIndex + 1}: {level}
                              </button>
                            ) : (
                              <span>Level {levelIndex + 1}: {level}</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </article>
                    {index < rooms.length - 1 && <div className="map-arrow" aria-hidden="true">↓</div>}
                  </React.Fragment>
                ))}
              </div>
            </section>

            <section className="briefing-section room1-detail">
              <h3>{room3Unlocked && !room3Completed ? "Room 3: Kubernetes Service Routing Fix" : room2Unlocked && !room2Completed ? "Room 2: Container Recovery Operations" : "Room 1: Microservice Incident Response"}</h3>
              {room3Unlocked && !room3Completed ? (
                <>
                  <p><strong>Objective:</strong> Inspect checkout-service endpoints, follow a service routing investigation path, and patch the selector to app=checkout.</p>
                  <p><strong>Incident preview:</strong> Pods are healthy and replicas are available, but user traffic is not reaching the application.</p>
                  <p><strong>Levels:</strong> Endpoint Command, Debugging Sequence, Selector Fix Command.</p>
                </>
              ) : room2Unlocked && !room2Completed ? (
                <>
                  <p><strong>Objective:</strong> Recover the order-service container by identifying its failed status, rebuilding the startup sequence, and selecting the safest rollback action.</p>
                  <p><strong>Incident preview:</strong> Container order-service is running image order-service:v2 with restart count 5, last exit code 1, and a hidden status value to investigate.</p>
                  <p><strong>Levels:</strong> Status Inspection, Lifecycle Sequence, Safe Recovery.</p>
                </>
              ) : (
                <>
                  <p><strong>Objective:</strong> Restore the customer-api flow by checking health, mapping responsibilities, and fixing DB_HOST.</p>
                  <p><strong>Levels:</strong> Health Check, Responsibility Mapping, Configuration Recovery.</p>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function LegacyGameMap({ sessionCode, playerName, players = [], openRoom, room1State, room2State, room3State }) {
  const room1Completed = Boolean(room1State?.completed);
  const room2Unlocked = room1Completed;
  const room2Completed = Boolean(room2State?.completed);
  const room3Unlocked = room2Completed;
  const room3Completed = Boolean(room3State?.completed);
  const activeRoom = room3Unlocked && !room3Completed ? 3 : room2Unlocked && !room2Completed ? 2 : 1;
  const rooms = [
    {
      id: 1,
      title: "Microservice Incident Response",
      levels: ["Health Check", "Responsibility Mapping", "Configuration Recovery"],
      locked: false,
      completed: room1Completed,
      currentLevel: room1State?.currentLevel || 1,
    },
    {
      id: 2,
      title: "Container Recovery Operations",
      levels: ["Status Inspection", "Lifecycle Sequence", "Safe Recovery"],
      locked: !room2Unlocked,
      completed: room2Completed,
      currentLevel: room2State?.currentLevel || 1,
    },
    {
      id: 3,
      title: "Kubernetes Service Routing Fix",
      levels: ["Endpoint Inspection", "Investigation Sequence", "Selector Fix"],
      locked: !room3Unlocked,
      completed: room3Completed,
      currentLevel: room3State?.currentLevel || 1,
    },
  ];

  return (
    <section className="game-map-screen">
      <header className="map-game-hud">
        <div>
          <p className="eyebrow">Game Map</p>
          <h1>Kubernetes Outage Escape Room</h1>
        </div>
        <div className="map-hud-chips">
          <span>Session <strong>{sessionCode}</strong></span>
          <span>{playerName}</span>
          <span>{players.length} online</span>
        </div>
      </header>

      <section className="level-map-page island-map-page game-only-map" aria-label="Escape room island map">
        <img className="level-map-image" src="/assets/teammate-island-map.png" alt="Island-style escape room map with selectable incident rooms" />
        <div className="level-map-overlay">
          {rooms.map((room) => (
            <article
              key={room.id}
              className={`world-room-card map-level-strip world-room-${room.id} ${room.locked ? "locked" : "available"} ${room.completed ? "completed" : ""} ${activeRoom === room.id && !room.completed ? "current-room" : ""}`}
            >
              <p className="map-status">{room.locked ? "Locked" : room.completed ? "Completed" : "Current"}</p>
              <h3>Room {room.id}</h3>
              <strong>{room.title}</strong>
              <div className="world-level-list">
                {room.levels.map((level, levelIndex) => {
                  const levelNumber = levelIndex + 1;
                  const done = room.completed || levelNumber < room.currentLevel;
                  const active = !room.locked && !room.completed && activeRoom === room.id && levelNumber === room.currentLevel;
                  return active ? (
                    <button type="button" key={level} className="world-level-button active" onClick={() => openRoom(room.id)}>
                      <span className="level-3d-cap" aria-hidden="true" />
                      <span className="level-3d-content">
                        <span>Level {levelNumber}</span>
                        <small>{level}</small>
                      </span>
                    </button>
                  ) : (
                    <div key={level} className={`world-level-button ${done ? "done" : "locked"}`}>
                      <span className="level-3d-cap" aria-hidden="true" />
                      <span className="level-3d-content">
                        <span>Level {levelNumber}</span>
                        <small>{level}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function RoomScreen({ playerName, sessionState, room, room1State, room2State, room3State, activity, investigationStarted, beginInvestigation, startGame, inspectEvidence, setPendingAction, requestHint, submitting, feedback, goNext, loadReport, submitRoom1Level, submitRoom2Level, submitRoom3Level }) {
  const solved = Boolean(feedback?.correct);
  if (room.roomId === 1 && room1State) {
    return (
      <section className="game-layout room1-layout">
        <Sidebar sessionState={sessionState} activity={activity} startGame={startGame} requestHint={requestHint} room1State={room1State} />
        <Room1Puzzle room1State={room1State} feedback={feedback} submitRoom1Level={submitRoom1Level} />
      </section>
    );
  }
  if (room.roomId === 2 && room2State) {
    return (
      <section className="game-layout room1-layout">
        <Sidebar sessionState={sessionState} activity={activity} startGame={startGame} requestHint={requestHint} room2State={room2State} />
        <Room2Puzzle room2State={room2State} feedback={feedback} submitRoom2Level={submitRoom2Level} />
      </section>
    );
  }
  if (room.roomId === 3 && room3State) {
    return (
      <section className="game-layout room1-layout">
        <Sidebar sessionState={sessionState} activity={activity} startGame={startGame} requestHint={requestHint} room3State={room3State} />
        <Room3Puzzle room3State={room3State} feedback={feedback} submitRoom3Level={submitRoom3Level} />
      </section>
    );
  }

  return (
    <section className="game-layout">
      <Sidebar sessionState={sessionState} activity={activity} startGame={startGame} requestHint={requestHint} />
      <section className="room-stage">
        <div className="room-heading">
          <div>
            <p className="eyebrow">{themeLabel(room.theme)}</p>
            <h2>{room.name}</h2>
            <p>{room.story}</p>
          </div>
          <div className="difficulty-badge">{room.difficulty}</div>
        </div>

        {!investigationStarted && !feedback && (
          <section className="panel briefing-panel">
            <p className="eyebrow">{themeLabel(room.theme)} briefing</p>
            <h3>{room.name}</h3>
            <Metric label="Difficulty" value={room.difficulty} />
            <p>{room.story}</p>
            <button type="button" className="primary-button" onClick={beginInvestigation}>Begin Investigation</button>
          </section>
        )}

        {(investigationStarted || feedback) && (
          <>
            <div className="workspace-grid">
              <section className="panel evidence-panel">
                <div className="section-heading"><h3>Evidence</h3><span>{room.evidence.length} clues</span></div>
                <div className="evidence-list">
                  {room.evidence.map((evidence) => (
                    <button type="button" className="evidence-button" key={evidence.title} onClick={() => inspectEvidence(evidence)}>
                      <span className="evidence-type">{shortType(evidence.type)}</span>
                      <span><span className="evidence-title">{evidence.title}</span><span className="evidence-summary">{preview(evidence.content)}</span></span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="panel action-panel">
                <div className="section-heading"><h3>Remediation actions</h3><span>{room.failureArea}</span></div>
                <div className="action-list">
                  {room.actions.map((action) => (
                    <button type="button" className="action-button" key={action.id} disabled={submitting || solved} onClick={() => setPendingAction(action)}>
                      <span className="action-title">{action.text}</span><span className="action-id">Action {action.id}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <FeedbackPanel feedback={feedback} room={room} goNext={goNext} loadReport={loadReport} />
            <RootCausePanel feedback={feedback} room={room} />
          </>
        )}
      </section>
    </section>
  );
}

function Room1Puzzle({ room1State, feedback, submitRoom1Level }) {
  const level = room1State.level;
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedService, setSelectedService] = React.useState("");
  const [matchedPairs, setMatchedPairs] = React.useState({});
  const [selectedDbHost, setSelectedDbHost] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => {
    setSelectedStatus("");
    setSelectedService("");
    setMatchedPairs({});
    setSelectedDbHost("");
    setLocalError("");
  }, [level.levelNumber]);

  async function handleSubmit() {
    setLocalError("");
    setSubmitting(true);
    try {
      if (level.levelNumber === 1) {
        if (!selectedStatus) {
          setLocalError("Select a status value before submitting.");
          return;
        }
        await submitRoom1Level(1, { selectedStatus });
      }
      if (level.levelNumber === 2) {
        if (Object.keys(matchedPairs).length !== level.services.length) {
          setLocalError("Match every service before submitting.");
          return;
        }
        await submitRoom1Level(2, { matchedPairs });
      }
      if (level.levelNumber === 3) {
        if (!selectedDbHost) {
          setLocalError("Place a service value into DB_HOST before submitting.");
          return;
        }
        await submitRoom1Level(3, { selectedDbHost });
      }
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function selectResponsibility(responsibility) {
    if (!selectedService) return;
    setMatchedPairs((current) => ({ ...current, [selectedService]: responsibility }));
    setSelectedService("");
  }

  return (
    <section className="room-stage room1-stage">
      <div className="room-heading">
        <div>
          <p className="eyebrow">FOREST INCIDENT ROOM</p>
          <h2>Room 1: {room1State.roomName}</h2>
          <p>{room1State.story}</p>
        </div>
        <div className="difficulty-badge">Level {room1State.currentLevel} / {room1State.totalLevels}</div>
      </div>

      <div className="room-level-map" aria-label={`Level ${room1State.currentLevel} of ${room1State.totalLevels}`}>
        {["Service Health Check", "Responsibility Mapping", "Configuration Recovery"].map((label, index) => {
          const number = index + 1;
          const done = number < room1State.currentLevel || room1State.completed;
          const active = number === room1State.currentLevel && !room1State.completed;
          return (
            <button
              type="button"
              key={label}
              className={`room-level-node ${done ? "done" : ""} ${active ? "active" : ""}`}
              disabled={!active}
            >
              <span>{done ? "Completed" : active ? "Current" : "Locked"}</span>
              <strong>Level {number}</strong>
              <small>{label}</small>
            </button>
          );
        })}
      </div>

      <section className="panel room1-panel">
        {room1State.completed ? (
          <div className="room1-complete">
            <h3>Room 1 Completed</h3>
            <pre>{room1State.completionMessage}</pre>
          </div>
        ) : (
          <>
            <p className="eyebrow">{level.type.replace("_", " ")}</p>
            <h3>{level.title}</h3>
            <p className="level-prompt">{level.prompt}</p>
            {level.levelNumber === 1 && (
              <div className="puzzle-grid">
                <pre className="yaml-card">{level.snippet}</pre>
                <div className="option-grid">
                  {level.options.map((option) => (
                    <button type="button" key={option} className={level1OptionClass(option, selectedStatus)} onClick={() => setSelectedStatus(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {level.levelNumber === 2 && (
              <div className="match-board">
                <div>
                  <h4>Services</h4>
                  {level.services.map((service) => (
                    <button
                      type="button"
                      key={service}
                      className={`match-item ${selectedService === service ? "selected" : ""} ${pairClass(service, matchedPairs[service])}`}
                      onClick={() => setSelectedService(service)}
                    >
                      <span>{service}</span>
                      <small>{matchedPairs[service] || "Select responsibility"}</small>
                    </button>
                  ))}
                </div>
                <div>
                  <h4>Responsibilities</h4>
                  {level.responsibilities.map((responsibility) => (
                    <button type="button" key={responsibility} className="match-item" disabled={!selectedService} onClick={() => selectResponsibility(responsibility)}>
                      {responsibility}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {level.levelNumber === 3 && (
              <div className="puzzle-grid room1-config-grid">
                <pre className="yaml-card">{selectedDbHost ? "service: customer-api\nenv:\n  DB_HOST: " + selectedDbHost : level.snippet}</pre>
                <div className="option-grid">
                  {level.options.map((option) => (
                    <button
                      type="button"
                      draggable
                      key={option}
                      className={level3OptionClass(option, selectedDbHost)}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", option)}
                      onClick={() => setSelectedDbHost(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="drop-slot"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => setSelectedDbHost(event.dataTransfer.getData("text/plain"))}
                >
                  DB_HOST: {selectedDbHost || "______"}
                </button>
              </div>
            )}
            {(feedback || localError) && (
              <div className={`level-feedback ${feedback?.correct ? "success" : "danger"}`} role="status">
                {localError || feedback.message}
              </div>
            )}
            {level.levelNumber === 1 && selectedStatus === "Running" && !feedback && !localError && (
              <div className="inline-answer-feedback success" role="status">
                Correct answer
              </div>
            )}
            {level.levelNumber === 3 && selectedDbHost === "database-service" && !feedback && !localError && (
              <div className="inline-answer-feedback success" role="status">
                Correct answer
              </div>
            )}
            <button type="button" className="primary-button level-submit" disabled={submitting} onClick={handleSubmit}>
              Submit Answer
            </button>
          </>
        )}
      </section>
    </section>
  );
}

function Room2Puzzle({ room2State, feedback, submitRoom2Level }) {
  const level = room2State.level;
  const [selectedAnswer, setSelectedAnswer] = React.useState("");
  const [orderedSteps, setOrderedSteps] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => {
    setSelectedAnswer("");
    setOrderedSteps([]);
    setLocalError("");
  }, [level.levelNumber]);

  function addStep(step) {
    if (orderedSteps.includes(step)) return;
    setOrderedSteps((current) => [...current, step]);
  }

  async function handleSubmit() {
    setLocalError("");
    setSubmitting(true);
    try {
      if (level.levelNumber === 1 || level.levelNumber === 3) {
        if (!selectedAnswer) {
          setLocalError("Select an option before submitting.");
          return;
        }
        await submitRoom2Level(level.levelNumber, { answer: selectedAnswer });
      }
      if (level.levelNumber === 2) {
        if (orderedSteps.length !== level.options.length) {
          setLocalError("Select every lifecycle step before submitting.");
          return;
        }
        await submitRoom2Level(2, { orderedSteps });
      }
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="room-stage room2-stage">
      <div className="room-heading">
        <div>
          <p className="eyebrow">CONTAINER CONTROL ROOM</p>
          <h2>Room 2: {room2State.roomName}</h2>
          <p>{room2State.story}</p>
        </div>
        <div className="difficulty-badge">Level {room2State.currentLevel} / {room2State.totalLevels}</div>
      </div>

      <div className="room-level-map room2-level-map" aria-label={`Level ${room2State.currentLevel} of ${room2State.totalLevels}`}>
        {["Container Status Inspection", "Lifecycle Sequence", "Safe Recovery"].map((label, index) => {
          const number = index + 1;
          const done = number < room2State.currentLevel || room2State.completed;
          const active = number === room2State.currentLevel && !room2State.completed;
          return (
            <button
              type="button"
              key={label}
              className={`room-level-node ${done ? "done" : ""} ${active ? "active" : ""}`}
              disabled={!active}
            >
              <span>{done ? "Completed" : active ? "Current" : "Locked"}</span>
              <strong>Level {number}</strong>
              <small>{label}</small>
            </button>
          );
        })}
      </div>

      <section className="panel room1-panel room2-panel">
        {room2State.completed ? (
          <div className="room1-complete">
            <h3>Room 2 Completed</h3>
            <pre>{room2State.completionMessage}</pre>
          </div>
        ) : (
          <>
            <p className="eyebrow">{level.type.replace("_", " ")}</p>
            <h3>{level.title}</h3>
            <p className="level-prompt">{level.prompt}</p>

            {level.levelNumber === 1 && (
              <div className="puzzle-grid">
                <pre className="yaml-card terminal-card">{level.evidence}</pre>
                <div className="option-grid">
                  {level.options.map((option) => (
                    <button type="button" key={option} className={room2OptionClass(option, selectedAnswer, "CrashLoopBackOff")} onClick={() => setSelectedAnswer(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {level.levelNumber === 2 && (
              <div className="sequence-board">
                <div>
                  <h4>Available steps</h4>
                  <div className="option-grid">
                    {level.options.map((step) => (
                      <button type="button" key={step} disabled={orderedSteps.includes(step)} className={orderedSteps.includes(step) ? "sequence-selected" : ""} onClick={() => addStep(step)}>
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="selected-order">
                  <h4>Selected order</h4>
                  {orderedSteps.length === 0 ? (
                    <p>Select lifecycle steps in order.</p>
                  ) : (
                    <ol>
                      {orderedSteps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  )}
                  <button type="button" onClick={() => setOrderedSteps([])} disabled={orderedSteps.length === 0}>Reset Order</button>
                </div>
              </div>
            )}

            {level.levelNumber === 3 && (
              <div className="puzzle-grid">
                <pre className="yaml-card terminal-card">{level.evidence}</pre>
                <div className="option-grid">
                  {level.options.map((option) => (
                    <button type="button" key={option} className={room2OptionClass(option, selectedAnswer, "Rollback to order-service:v1")} onClick={() => setSelectedAnswer(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(feedback || localError) && (
              <div className={`level-feedback ${feedback?.correct ? "success" : "danger"}`} role="status">
                {localError || feedback.message}
              </div>
            )}
            {(level.levelNumber === 1 && selectedAnswer === "CrashLoopBackOff" && !feedback && !localError) && (
              <div className="inline-answer-feedback success" role="status">Correct answer</div>
            )}
            {(level.levelNumber === 3 && selectedAnswer === "Rollback to order-service:v1" && !feedback && !localError) && (
              <div className="inline-answer-feedback success" role="status">Correct answer</div>
            )}
            <button type="button" className="primary-button level-submit" disabled={submitting} onClick={handleSubmit}>
              Submit Answer
            </button>
          </>
        )}
      </section>
    </section>
  );
}

function Room3Puzzle({ room3State, feedback, submitRoom3Level }) {
  const level = room3State.level;
  const [command, setCommand] = React.useState("");
  const [orderedSteps, setOrderedSteps] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => {
    setCommand("");
    setOrderedSteps([]);
    setLocalError("");
  }, [level.levelNumber]);

  function addStep(step) {
    if (orderedSteps.includes(step)) return;
    setOrderedSteps((current) => [...current, step]);
  }

  async function handleSubmit() {
    setLocalError("");
    setSubmitting(true);
    try {
      if (level.levelNumber === 1 || level.levelNumber === 3) {
        if (!command.trim()) {
          setLocalError("Type a kubectl command before submitting.");
          return;
        }
        await submitRoom3Level(level.levelNumber, { command });
      }
      if (level.levelNumber === 2) {
        if (orderedSteps.length !== level.options.length) {
          setLocalError("Select every investigation step before submitting.");
          return;
        }
        await submitRoom3Level(2, { orderedSteps });
      }
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="room-stage room3-stage">
      <div className="room-heading">
        <div>
          <p className="eyebrow">KUBERNETES COMMAND CENTER</p>
          <h2>Room 3: {room3State.roomName}</h2>
          <p>{room3State.story}</p>
        </div>
        <div className="difficulty-badge">Level {room3State.currentLevel} / {room3State.totalLevels}</div>
      </div>

      <div className="room-level-map room3-level-map" aria-label={`Level ${room3State.currentLevel} of ${room3State.totalLevels}`}>
        {["Endpoint Inspection", "Investigation Sequence", "Selector Fix Command"].map((label, index) => {
          const number = index + 1;
          const done = number < room3State.currentLevel || room3State.completed;
          const active = number === room3State.currentLevel && !room3State.completed;
          return (
            <button
              type="button"
              key={label}
              className={`room-level-node ${done ? "done" : ""} ${active ? "active" : ""}`}
              disabled={!active}
            >
              <span>{done ? "Completed" : active ? "Current" : "Locked"}</span>
              <strong>Level {number}</strong>
              <small>{label}</small>
            </button>
          );
        })}
      </div>

      <section className="panel room1-panel room3-panel">
        {room3State.completed ? (
          <div className="room1-complete">
            <h3>Room 3 Completed</h3>
            <pre>{room3State.completionMessage}</pre>
            <pre>{room3State.gameCompletionMessage}</pre>
          </div>
        ) : (
          <>
            <p className="eyebrow">{level.type.replace("_", " ")}</p>
            <h3>{level.title}</h3>
            <p className="level-prompt">{level.prompt}</p>

            {(level.levelNumber === 1 || level.levelNumber === 3) && (
              <div className="command-grid">
                <pre className="yaml-card terminal-card">{level.evidence}</pre>
                <div className="terminal-input-panel">
                  <label>
                    Command
                    <input
                      className="terminal-input"
                      value={command}
                      placeholder={level.levelNumber === 1 ? "Type kubectl command here..." : "Type fix command here..."}
                      spellCheck="false"
                      onChange={(event) => setCommand(event.target.value)}
                    />
                  </label>
                  <p>{level.levelNumber === 1 ? "Example topic: inspect service endpoints." : "Example topic: update checkout-service selector to app=checkout."}</p>
                </div>
              </div>
            )}

            {level.levelNumber === 2 && (
              <div className="sequence-board">
                <div>
                  <h4>Available steps</h4>
                  <div className="option-grid">
                    {level.options.map((step) => (
                      <button type="button" key={step} disabled={orderedSteps.includes(step)} className={orderedSteps.includes(step) ? "sequence-selected" : ""} onClick={() => addStep(step)}>
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="selected-order">
                  <h4>Selected order</h4>
                  {orderedSteps.length === 0 ? (
                    <p>Select debugging steps in order.</p>
                  ) : (
                    <ol>
                      {orderedSteps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  )}
                  <button type="button" onClick={() => setOrderedSteps([])} disabled={orderedSteps.length === 0}>Reset Order</button>
                </div>
              </div>
            )}

            {(feedback || localError) && (
              <div className={`level-feedback ${feedback?.correct ? "success" : "danger"}`} role="status">
                {localError || feedback.message}
              </div>
            )}
            <button type="button" className="primary-button level-submit" disabled={submitting} onClick={handleSubmit}>
              Submit Answer
            </button>
          </>
        )}
      </section>
    </section>
  );
}

function pairClass(service, selectedResponsibility) {
  if (!selectedResponsibility) return "";
  return ROOM1_CORRECT_PAIRS[service] === selectedResponsibility ? "pair-correct" : "pair-incorrect";
}

function level1OptionClass(option, selectedStatus) {
  if (selectedStatus !== option) return "";
  return option === "Running" ? "option-correct" : "option-incorrect";
}

function level3OptionClass(option, selectedDbHost) {
  if (selectedDbHost !== option) return "";
  return option === "database-service" ? "option-correct" : "option-incorrect";
}

function room2OptionClass(option, selectedAnswer, correctAnswer) {
  if (selectedAnswer !== option) return "";
  return option === correctAnswer ? "option-correct" : "option-incorrect";
}

function Sidebar({ sessionState, activity, startGame, requestHint, room1State, room2State, room3State }) {
  const levelState = room3State || room2State || room1State;
  return (
    <aside className="panel status-panel">
      <h2>Incident Status</h2>

      <div className="status-box">
        <h3>Progress</h3>
        <Metric label="Room" value={`${levelState?.roomId || sessionState.currentRoomId} / ${TOTAL_ROOMS}`} />
        {levelState && <Metric label="Level" value={`${levelState.currentLevel} / ${levelState.totalLevels}`} />}
      </div>

      <div className="status-box">
        <h3>Score</h3>
        <Metric label="Score" value={sessionState.score} />
        <Metric label="Service Health" value={`${sessionState.serviceHealth}%`} />
        <div className="health-track" aria-label={`Service Health ${sessionState.serviceHealth}%`}>
          <div className={healthClass(sessionState.serviceHealth)} style={{ width: `${sessionState.serviceHealth}%` }} />
        </div>
        <Metric label="Wrong Attempts" value={sessionState.wrongAttempts} />
        <Metric label="Hints Used" value={sessionState.hintsUsed} />
        {room1State && <button type="button" disabled={sessionState.currentRoomHintUsed} onClick={requestHint}>{sessionState.currentRoomHintUsed ? "Hint used" : "Request hint"}</button>}
      </div>

      <div className="status-box">
        <h3>Players</h3>
        <ul className="plain-list">{sessionState.players.map((player) => <li key={player.name}>{player.name}</li>)}</ul>
        <h3>Activity Log</h3>
        <ol className="activity-list">{activity.slice(-8).reverse().map((event, index) => <li key={`${event.timestamp}-${index}`}>{event.message}</li>)}</ol>
      </div>
    </aside>
  );
}

function FeedbackPanel({ feedback, room, goNext, loadReport }) {
  if (!feedback) return null;
  return (
    <section className={`panel feedback-panel ${feedback.correct ? "success" : "danger"}`} role="status">
      <h3>{feedback.correct ? "Correct remediation applied." : "Incorrect action."}</h3>
      <p>{feedback.correct ? `Root cause: ${feedback.rootCause}` : feedback.incorrect || feedback.message}</p>
      {feedback.correct && <p>Fix: {feedback.correctFix}</p>}
      {feedback.correct && (feedback.completed
        ? <button type="button" className="primary-button" onClick={() => loadReport()}>View Final Report</button>
        : <button type="button" className="primary-button" onClick={goNext}>Next Room</button>)}
      {!feedback.correct && <p className="warning-text">Incorrect actions reduce score and service health.</p>}
    </section>
  );
}

function RootCausePanel({ feedback, room }) {
  const copy = ROOM_COPY[room.roomId];
  return (
    <section className="panel root-panel">
      <h3>Root Cause</h3>
      {!feedback?.correct ? (
        <p>Hidden until the correct remediation is applied.</p>
      ) : (
        <>
          <p><strong>Root cause:</strong> {feedback.rootCause}</p>
          <p><strong>Correct fix:</strong> {copy?.correctFix}</p>
          <p><strong>Learning point:</strong> {feedback.learningPoint}</p>
        </>
      )}
    </section>
  );
}

function CompletionSummaryModal({ summary, onContinue }) {
  return (
    <Modal title={summary.gameCompleted ? "Escape Complete" : summary.roomCompleted ? "Room Completed" : "Level Completed"} onClose={onContinue}>
      <section className="completion-summary">
        <p className="eyebrow">Room {summary.roomId}</p>
        <h2>{summary.roomName}</h2>
        <p className="completion-message">
          {summary.gameCompleted
            ? "All outage rooms are resolved."
            : summary.roomCompleted
            ? `Room ${summary.roomId} completed.`
            : `Level ${summary.levelNumber} completed.`}
        </p>
        <p>{summary.message}</p>
        <div className="report-grid completion-grid">
          <ReportMetric label="Score" value={summary.score} />
          <ReportMetric label="Service health" value={`${summary.serviceHealth}%`} />
          <ReportMetric label="Hints used" value={summary.hintsUsed} />
          <ReportMetric label="Wrong attempts" value={summary.wrongAttempts} />
        </div>
        <button type="button" className="primary-button completion-next-button" onClick={onContinue}>
          {summary.buttonText}
        </button>
      </section>
    </Modal>
  );
}

function FinalScreen({ report, activity, resetGame }) {
  return (
    <section className="panel report-panel">
      <p className="eyebrow">Final report</p>
      <h2>Incident Resolved</h2>
      <p className="level-prompt">
        Outage resolved. All incident rooms have been completed successfully. Your team restored service health by fixing microservice configuration, recovering a failing container, and correcting Kubernetes service routing. Escape Room completed.
      </p>
      <div className="report-grid">
        <ReportMetric label="Final score" value={report.finalScore} />
        <ReportMetric label="Service health" value={`${report.serviceHealth}%`} />
        <ReportMetric label="Rooms completed" value="3/3" />
        <ReportMetric label="Wrong attempts" value={report.wrongAttempts} />
        <ReportMetric label="Hints used" value={report.hintsUsed} />
      </div>
      <h3>Players</h3>
      <ul className="plain-list">{report.players.map((player) => <li key={player.name}>{player.name}</li>)}</ul>
      <h3>Activity summary</h3>
      <ol className="activity-list report-activity">{activity.slice(-8).reverse().map((event, index) => <li key={`${event.timestamp}-${index}`}>{event.message}</li>)}</ol>
      <h3>Learning summary</h3>
      <div className="learning-list">{report.learningSummaries.map((item) => <p key={item.roomId}><strong>{item.roomName}:</strong> {item.summary}</p>)}</div>
      <button type="button" className="primary-button" onClick={resetGame}>Start New Session</button>
    </section>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <div className="modal-heading"><h2>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="metric-row"><span>{label}</span><strong>{value}</strong></div>;
}

function ReportMetric({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

async function apiRequest(path, options = {}) {
  const request = { method: options.method || "GET", headers: {} };
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
  if (normalized.includes("kubernetes")) return "theme-kubernetes";
  if (normalized.includes("container")) return "theme-container";
  if (normalized.includes("desert")) return "theme-desert";
  if (normalized.includes("snow")) return "theme-snow";
  return "theme-jungle";
}

function themeLabel(theme = "") {
  return theme.toUpperCase();
}

function healthClass(value) {
  if (value >= 80) return "health-good";
  if (value >= 50) return "health-warning";
  return "health-low";
}

function preview(content) {
  return content.replace(/\s+/g, " ").slice(0, 88);
}

function shortType(type) {
  return type.split("_").map((part) => part.slice(0, 3)).join("");
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
