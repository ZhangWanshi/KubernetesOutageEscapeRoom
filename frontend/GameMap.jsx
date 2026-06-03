import React from "react";

const ROOM_HOTSPOTS = [
  {
    id: 1,
    label: "Room 1",
    title: "Microservice",
    fullTitle: "Microservice Incident Response",
    positionClass: "room-one",
    accent: "forest",
    levels: [
      { name: "Service Health Check", info: "Select the healthy customer-api service status." },
      { name: "Responsibility Mapping", info: "Match each service with its platform responsibility." },
      { name: "Configuration Recovery", info: "Restore the missing database host value." },
    ],
  },
  {
    id: 2,
    label: "Room 2",
    title: "Container",
    fullTitle: "Container Recovery Operations",
    positionClass: "room-two",
    accent: "desert",
    levels: [
      { name: "Status Inspection", info: "Identify the failing container status from evidence." },
      { name: "Lifecycle Sequence", info: "Arrange the container startup steps in order." },
      { name: "Safe Recovery", info: "Choose the safest rollback action for the unstable image." },
    ],
  },
  {
    id: 3,
    label: "Room 3",
    title: "Routing",
    fullTitle: "Kubernetes Service Routing Fix",
    positionClass: "room-three",
    accent: "snow",
    levels: [
      { name: "Endpoint Inspection", info: "Type the command that checks service endpoints." },
      { name: "Investigation Sequence", info: "Order the routing investigation steps." },
      { name: "Selector Fix", info: "Type the command that fixes the selector mismatch." },
    ],
  },
];

function roomStateFor(roomId, room1State, room2State, room3State) {
  if (roomId === 1) return room1State;
  if (roomId === 2) return room2State;
  return room3State;
}

function isRoomLocked(roomId, room1State, room2State) {
  if (roomId === 1) return false;
  if (roomId === 2) return !room1State?.completed;
  return !room2State?.completed;
}

function currentActiveRoom(room1State, room2State, room3State) {
  if (room2State?.completed && !room3State?.completed) return 3;
  if (room1State?.completed && !room2State?.completed) return 2;
  return 1;
}

function unlockMessageFor(notice, selectedRoom, selectedRoomState) {
  if (selectedRoomState?.completed && selectedRoom?.id === 1) {
    return {
      title: "Room Complete",
      message: "All Microservice Incident Response levels are complete.",
      reward: "Room 2 Unlocked",
    };
  }
  if (selectedRoomState?.completed && selectedRoom?.id === 2) {
    return {
      title: "Room Complete",
      message: "All Container Recovery Operations levels are complete.",
      reward: "Room 3 Unlocked",
    };
  }
  if (selectedRoomState?.completed && selectedRoom?.id === 3) {
    return {
      title: "Escape Complete",
      message: "All Kubernetes service routing levels are complete.",
      reward: "Outage Resolved",
    };
  }
  if (!notice) return null;
  if (notice.includes("Room 1 completed")) {
    return {
      title: "Room Complete",
      message: "Microservice Incident Response cleared.",
      reward: "Room 2 Unlocked",
    };
  }
  if (notice.includes("Room 2 completed")) {
    return {
      title: "Room Complete",
      message: "Container Recovery Operations cleared.",
      reward: "Room 3 Unlocked",
    };
  }
  if (notice.includes("Room 3")) {
    return {
      title: "Level Complete",
      message: notice,
      reward: "Next Challenge Ready",
    };
  }
  return {
    title: "Level Complete",
    message: selectedRoom ? `${selectedRoom.fullTitle} progress updated.` : notice,
    reward: notice.includes("unlocked") ? notice.match(/Level \d+/)?.[0] || "Next Level Unlocked" : "Progress Saved",
  };
}

export default function GameMap({ sessionCode, playerName, players = [], openRoom, room1State, room2State, room3State, selectedRoomId, setSelectedRoomId, notice }) {
  const activeRoomId = currentActiveRoom(room1State, room2State, room3State);
  const [localSelectedRoomId, setLocalSelectedRoomId] = React.useState(null);
  const [rewardDismissed, setRewardDismissed] = React.useState(false);
  const selectedId = selectedRoomId ?? localSelectedRoomId;
  const selectedRoom = ROOM_HOTSPOTS.find((room) => room.id === selectedId);
  const selectedRoomState = selectedRoom ? roomStateFor(selectedRoom.id, room1State, room2State, room3State) : null;
  const selectedRoomLocked = selectedRoom ? isRoomLocked(selectedRoom.id, room1State, room2State) : false;
  const unlockMessage = unlockMessageFor(notice, selectedRoom, selectedRoomState);
  const showRewardPopup = Boolean(selectedRoom && unlockMessage && !rewardDismissed);

  React.useEffect(() => {
    setRewardDismissed(false);
  }, [selectedRoomId, notice]);

  function selectRoom(roomId, locked) {
    if (locked) return;
    if (setSelectedRoomId) {
      setSelectedRoomId(roomId);
    } else {
      setLocalSelectedRoomId(roomId);
    }
  }

  function closeRoomPopup() {
    if (setSelectedRoomId) {
      setSelectedRoomId(null);
    } else {
      setLocalSelectedRoomId(null);
    }
    setRewardDismissed(false);
  }

  function enterRoom(roomId, locked) {
    if (locked) return;
    window.history.pushState({}, "", `/rooms/${roomId}`);
    openRoom(roomId);
  }

  return (
    <section className="game-map-page" aria-label="Game map">
      <header className="game-map-header">
        <div>
          <p>Game Map</p>
          <h1>Kubernetes Outage Escape Room</h1>
        </div>
        <div className="game-map-status">
          <span>Session <strong>{sessionCode}</strong></span>
          <span>{playerName}</span>
          <span>{players.length} online</span>
        </div>
      </header>

      <div className="map-board-wrap">
        <div className="map-board" role="group" aria-label="2.5D incident room map">
          <img src="/assets/levels.png" alt="Forest, desert, and snow mountain outage room map" />
          {ROOM_HOTSPOTS.map((room) => {
            const state = roomStateFor(room.id, room1State, room2State, room3State);
            const locked = isRoomLocked(room.id, room1State, room2State);
            const completed = Boolean(state?.completed);
            const active = !locked && !completed && activeRoomId === room.id;
            const level = state?.currentLevel || 1;

            return (
              <button
                type="button"
                key={room.id}
                className={`map-hotspot ${room.positionClass} ${active ? "active" : ""} ${completed ? "completed" : ""} ${locked ? "locked" : ""}`}
                disabled={locked}
                onClick={() => selectRoom(room.id, locked)}
                aria-label={`${room.label}: ${room.fullTitle}${locked ? " locked" : ""}`}
              >
                <span className="hotspot-main"><span className="hotspot-room">{room.label}</span><span className="hotspot-title">{room.title}</span></span>
                <span className="hotspot-level">{locked ? "Locked" : completed ? "Completed" : `Level ${level}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRoom && showRewardPopup && (
        <div className="level-popup-backdrop reward-backdrop" role="presentation" onClick={() => setRewardDismissed(true)}>
          <section className={`reward-popup ${selectedRoom.accent}`} role="dialog" aria-modal="true" aria-labelledby="reward-popup-title" onClick={(event) => event.stopPropagation()}>
            <div className="reward-medal">✓</div>
            <p>{unlockMessage.title}</p>
            <h2 id="reward-popup-title">{unlockMessage.reward}</h2>
            <span>{unlockMessage.message}</span>
            <button type="button" className="reward-continue" onClick={() => setRewardDismissed(true)}>
              Continue
            </button>
          </section>
        </div>
      )}

      {selectedRoom && !showRewardPopup && (
        <div className="level-popup-backdrop" role="presentation" onClick={closeRoomPopup}>
          <section className={`level-popup ${selectedRoom.accent}`} role="dialog" aria-modal="true" aria-labelledby="level-popup-title" onClick={(event) => event.stopPropagation()}>
            <div className="level-popup-header">
              <div>
                <p>{selectedRoom.label}</p>
                <h2 id="level-popup-title">{selectedRoom.fullTitle}</h2>
              </div>
              <button type="button" className="level-popup-close" onClick={closeRoomPopup} aria-label="Close level selection">Close</button>
            </div>
            <div className="level-popup-list">
              {selectedRoom.levels.map((level, index) => {
                const levelNumber = index + 1;
                const currentLevel = selectedRoomState?.currentLevel || 1;
                const completed = Boolean(selectedRoomState?.completed) || levelNumber < currentLevel;
                const available = !selectedRoomLocked && !selectedRoomState?.completed && levelNumber === currentLevel;
                return (
                  <button
                    type="button"
                    key={level.name}
                    className={`level-popup-card ${available ? "available" : ""} ${completed ? "completed" : ""}`}
                    disabled={!available}
                    onClick={() => enterRoom(selectedRoom.id, selectedRoomLocked)}
                  >
                    <span>Level {levelNumber}</span>
                    <strong>{level.name}</strong>
                    <small>{level.info}</small>
                    <em>{available ? "Enter Level" : completed ? "Completed" : "Locked"}</em>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
