/* LobbyView.jsx — multiplayer squad lobby. Port of renderLobby()/paintLobby():
   party slots, role cycling, difficulty, approve/decline join requests, chat, and
   the start gate. Local component state replaces the module-level `lobby` object. */

function makeLobby(target) {
  return {
    code: 'K8S-' + target.id.toUpperCase() + '7Q',
    diff: target.diff,
    slots: 4,
    party: [],
    waiting: [],
    chat: [],
  };
}

function LobbyView() {
  const { rooms, lobbyTarget, openRoom, sessionCode, player, navigate } = window.useGame();
  const ROLES = window.QuestData.ROLES;
  const target = lobbyTarget
    || rooms.find((r) => r.status === 'available')
    || rooms.find((r) => r.status === 'attempted') || rooms[0];
  const b = window.Islands.BIOMES[target.biome];

  const [L, setL] = React.useState(() => makeLobby(target));
  React.useEffect(() => { setL(makeLobby(target)); }, [target.id]);

  // Poll backend for real player list and activity feed
  React.useEffect(() => {
    if (!sessionCode) return;

    const pollState = () => {
      window.Api.getState(sessionCode)
        .then((state) => {
          if (!state) return;
          setL((prev) => ({
            ...prev,
            party: (state.players || []).map((p, i) => ({
              c: p.name,
              role: ROLES[i % ROLES.length],
              ready: true,
              host: i === 0,
              you: player && p.name === player.name,
            })),
            waiting: (state.pendingPlayers || []).map((p) => ({ c: p.name, since: 'waiting' })),
          }));
        })
        .catch(() => {});
    };

    const pollActivity = () => {
      window.Api.getActivity(sessionCode)
        .then((events) => {
          if (events && events.length > 0) {
            setL((prev) => ({
              ...prev,
              chat: events.map((e) => ({
                c: 'System',
                m: e.message,
                t: e.timestamp,
              })),
            }));
          }
        })
        .catch(() => {});
    };

    pollState();
    pollActivity();
    const stateId = setInterval(pollState, 3000);
    const activityId = setInterval(pollActivity, 5000);
    return () => { clearInterval(stateId); clearInterval(activityId); };
  }, [sessionCode]);

  const [msg, setMsg] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const chatRef = React.useRef(null);
  React.useEffect(() => { const el = chatRef.current; if (el) el.scrollTop = el.scrollHeight; }, [L.chat]);

  const displayCode = sessionCode || L.code;
  const full = L.party.length >= L.slots;
  const allReady = L.party.length >= 1 && L.party.every((p) => p.ready);

  const handleStart = () => {
    if (!allReady) return;
    const firstRoom = rooms.find((r) => r.status === 'available' || r.status === 'attempted') || rooms[0];
    if (sessionCode) {
      window.Api.startSession(sessionCode)
        .then(() => openRoom(firstRoom))
        .catch(() => openRoom(firstRoom));
    } else {
      openRoom(firstRoom);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const cycleRole = (cid) => setL((p) => ({
    ...p, party: p.party.map((m) => m.c === cid ? { ...m, role: ROLES[(ROLES.indexOf(m.role) + 1) % ROLES.length] } : m),
  }));
  const setDiff = (d) => setL((p) => ({ ...p, diff: d }));
  const invite = (cid) => {
    if (!sessionCode) return;
    window.Api.approvePlayer(sessionCode, cid)
      .then((state) => {
        if (state && state.players) {
          setL((prev) => ({
            ...prev,
            party: state.players.map((p, i) => ({
              c: p.name, role: ROLES[i % ROLES.length], ready: true, host: i === 0,
              you: player && p.name === player.name,
            })),
            waiting: (state.pendingPlayers || []).map((p) => ({ c: p.name, since: 'waiting' })),
          }));
        }
      })
      .catch(() => {});
  };
  const decline = (cid) => {
    if (!sessionCode) return;
    window.Api.declinePlayer(sessionCode, cid)
      .then((state) => {
        if (state && state.pendingPlayers !== undefined) {
          setL((prev) => ({
            ...prev,
            waiting: (state.pendingPlayers || []).map((p) => ({ c: p.name, since: 'waiting' })),
          }));
        }
      })
      .catch(() => {});
  };
  const send = () => {
    const v = msg.trim(); if (!v) return;
    setL((p) => ({ ...p, chat: [...p.chat, { c: 'Dana', m: v }] }));
    setMsg('');
  };

  return (
    <div className="view" id="view-lobby" style={window.biomeViewStyle(target.biome)}>
      <window.BiomeScene biome={target.biome} />
      <div className="screen" style={window.biomeScreenStyle(target.biome)}>
        <div className="screen-inner">
          <div className="lob-top">
            <div className="code-pill" title="Copy invite code" onClick={copyCode}>
              {copied ? 'Copied ✓' : <>Invite code <b>{displayCode}</b> ⧉</>}
            </div>
          </div>

          <div className="lob-headline">
            <h1>Squad Lobby</h1>
            <p>Assemble your team, lock in roles, then dive into <b>{target.title}</b>.</p>
          </div>

          <div className="lob-grid">
            <div className="lob-main">
              <div className="card pad">
                <div className="party-head">
                  <div className="eyebrow" style={{ margin: 0 }}>Party · {L.party.length}/{L.slots}</div>
                  <span className="ready-count">{L.party.filter((p) => p.ready).length} ready</span>
                </div>
                <div className="slots">
                  {L.party.map((p) => (
                    <div className="slot rdy" key={p.c}>
                      {p.host && <span className="crown" title="Party host">♛</span>}
                      <window.AvatarChip cid={p.c} size={46} />
                      <div className="slot-mid">
                        <div className="slot-name">{p.c}{p.you && <span className="youtag">you</span>}</div>
                        <div className="role-chip" title="Tap to change role" onClick={() => cycleRole(p.c)}>{p.role} <i>▾</i></div>
                      </div>
                      <span className="rdy-tag" title="Ready by default">✓ Ready</span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, L.slots - L.party.length) }).map((_, i) => (
                    <div className="slot empty" key={'e' + i}>
                      <div className="slot-plus">+</div><div className="slot-invite">Open slot</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card pad chat-card">
                <div className="eyebrow">Activity feed</div>
                <div className="chat" ref={chatRef}>
                  {L.chat.length === 0 && (
                    <div className="chat-row" style={{ opacity: 0.5 }}>
                      <div className="bubble" style={{ fontStyle: 'italic' }}>Activity will appear here once the game starts.</div>
                    </div>
                  )}
                  {L.chat.map((m, i) => (
                    <div className="chat-row" key={i}>
                      <span style={{ fontSize: 16, minWidth: 26, textAlign: 'center', lineHeight: '26px' }}>&#9998;</span>
                      <div className="bubble">{m.m}</div>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input placeholder="Message your squad…" value={msg}
                         onChange={(e) => setMsg(e.target.value)}
                         onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
                  <button onClick={send}>Send</button>
                </div>
              </div>
            </div>

            <aside className="lob-side">
              <div className="target-card" style={{ '--bc': b.top, '--bce': b.edge }}>
                <div className="tc-banner"><window.BiomeChip biome={target.biome} /></div>
                <h3>{target.title}</h3>
                <p className="tc-dom">{target.domain}</p>
                <div className="diffsel">
                  {['Easy', 'Medium', 'Hard'].map((d) => (
                    <button key={d} className={'diffopt' + (L.diff === d ? ' on' : '')} data-diff={d} onClick={() => setDiff(d)}>{d}</button>
                  ))}
                </div>
                <div className="tc-reward">
                  <span>Team reward</span>
                  <b><window.Star filled size={16} /><window.Star filled size={16} /><window.Star filled size={16} /> + 350 XP each</b>
                </div>
              </div>

              <div className="card pad">
                <div className="wait-head">
                  <div className="eyebrow" style={{ margin: 0 }}>Waiting to be invited</div>
                  {L.waiting.length > 0 && <span className="wait-badge">{L.waiting.length} pending</span>}
                </div>
                {L.waiting.length ? (
                  <div className="friends">
                    {L.waiting.map((f) => (
                      <div className="fr-row" key={f.c}>
                        <window.AvatarChip cid={f.c} size={32} />
                        <div className="fr-mid"><b>{f.c}</b><span className="dot-status waiting">entered code · {f.since}</span></div>
                        <div className="fr-acts">
                          <button className="fr-dec" title={'Decline ' + f.c} aria-label={'Decline ' + f.c} onClick={() => decline(f.c)}>✕</button>
                          <button className="fr-inv approve" disabled={full} onClick={() => invite(f.c)}>{full ? 'Squad full' : 'Approve'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="waiting-empty">
                    <span className="we-ico">📭</span>
                    <b>No one waiting</b>
                    <span>Share invite code <b>{displayCode}</b> — requests appear here for you to approve.</span>
                  </div>
                )}
              </div>

              <button className="btn-submit lob-start" disabled={!allReady} onClick={handleStart}>
                {allReady ? 'Start expedition ▶' : 'Waiting for squad…'}
              </button>
              <p className="side-note">{allReady ? 'All set — sail to the island together.' : 'Everyone must ready up to launch.'}</p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
window.LobbyView = LobbyView;
