/* JoinView.jsx — the onboarding entry screen. Full React port of Join.html:
   name + marker + invite-code form, with the four transient right-panel states
   (form → waiting / creating → approved). On completion it hands the player
   profile up to App, which stores it and sails into the map. */

const JOIN_MARKERS = [
  { e: '🐢', n: 'Turtle', c: '#2BB673' },
  { e: '🦜', n: 'Parrot', c: '#E2554A' },
  { e: '🐙', n: 'Octopus', c: '#9B59B6' },
  { e: '🦀', n: 'Crab', c: '#E67E22' },
  { e: '🐠', n: 'Fish', c: '#2E86DE' },
  { e: '🐬', n: 'Dolphin', c: '#16A39A' },
  { e: '🦩', n: 'Flamingo', c: '#E84393' },
  { e: '🐡', n: 'Pufferfish', c: '#F4B73C' },
];

const OkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

function randCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

function JoinView() {
  const { finishJoin } = window.useGame();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [marker, setMarker] = React.useState(JOIN_MARKERS[0]);
  const [screen, setScreen] = React.useState('form'); // form | wait | creating | approved
  const [queue, setQueue] = React.useState({ pos: '2', line: "You're #2 in the waiting list", sub: 'Hang tight — the host has been notified' });
  const [approved, setApproved] = React.useState({ title: "You're in!", sub: 'Welcome aboard. Setting sail for the island…' });

  const [joinError, setJoinError] = React.useState('');
  const timers = React.useRef([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  React.useEffect(() => clearTimers, []);

  // ── validation ────────────────────────────────────────────────────
  const nm = name.trim();
  let nameState, nameHint;
  if (!nm) { nameState = 'mut'; nameHint = 'Must be unique — this is how teammates spot you.'; }
  else if (nm.length < 2) { nameState = 'bad'; nameHint = 'A little longer, captain — at least 2 characters.'; }
  else { nameState = 'ok'; nameHint = 'Nice — “' + nm + '” is free to claim.'; }
  const nameOk = nameState === 'ok';

  const cd = code.trim().toUpperCase();
  let codeMode, codeState, codeHint;
  if (!cd) { codeMode = 'new'; codeState = 'mut'; codeHint = 'Have a code? Enter it to join a friend\'s island.'; }
  else { codeMode = 'join'; codeState = 'ok'; codeHint = 'Island found — you\'ll ask the host to let you in.'; }

  const canSubmit = nameOk;
  let joinLbl, footHtml;
  if (!nameOk) { joinLbl = 'Enter your name to continue'; footHtml = <>No code? You'll <b>host a fresh island</b> and get a code to share.</>; }
  else if (codeMode === 'join') { joinLbl = 'Request to join →'; footHtml = <>You'll drop straight into the squad lobby once connected.</>; }
  else { joinLbl = 'Set sail & host new island →'; footHtml = <>No code? You'll <b>host a fresh island</b> and get a code to share.</>; }

  const go = (host, hostCode, currentRoomId) => {
    finishJoin({ name: nm, marker: marker.e, markerName: marker.n, color: marker.c, code: cd || hostCode || null, host, currentRoomId: currentRoomId || null });
  };

  const submit = () => {
    if (!canSubmit) return;
    if (window.Sfx) window.Sfx.play('click');
    clearTimers();
    setJoinError('');
    if (codeMode === 'join') {
      setScreen('wait');
      setQueue({ pos: '…', line: 'Requesting to join…', sub: 'Waiting for the host to approve you' });
      window.Api.joinSession(cd, nm)
        .then((session) => {
          const code = session.sessionCode;
          setQueue({ pos: '?', line: 'Waiting for host approval', sub: 'The host will see your request and let you in' });
          // Poll until the host approves (name moves from pendingPlayers to players)
          const poll = setInterval(() => {
            window.Api.getState(code)
              .then((state) => {
                const approved = state.players && state.players.some((p) => p.name === nm);
                const declined = !approved && state.pendingPlayers && !state.pendingPlayers.some((p) => p.name === nm);
                if (approved) {
                  clearInterval(poll);
                  const inProgress = state.status === 'IN_PROGRESS' || state.status === 'COMPLETED';
                  const roomId = inProgress ? state.currentRoomId : null;
                  const sub = inProgress
                    ? <>Game is in progress — dropping you into room {roomId}.</>
                    : <>Host approved you. Welcome to session <b>{code}</b>!</>;
                  setApproved({ title: "You're in!", sub });
                  setScreen('approved');
                  timers.current.push(setTimeout(() => go(false, code, roomId), 1700));
                } else if (declined) {
                  clearInterval(poll);
                  setScreen('form');
                  setJoinError('The host declined your request. Try a different name or ask the host.');
                }
              })
              .catch(() => {});
          }, 3000);
          timers.current.push(poll);
        })
        .catch((err) => {
          setScreen('form');
          const msg = err && err.message && err.message.includes('409')
            ? 'That name is already taken in this session — choose a different one.'
            : 'Could not join — check the invite code and try again.';
          setJoinError(msg);
        });
    } else {
      setScreen('creating');
      window.Api.createSession()
        .then((session) => {
          const hc = session.sessionCode;
          // Join own session so the host appears in the player list
          return window.Api.joinSession(hc, nm).then(() => {
            setApproved({ title: 'Island ready!', sub: <>You're the host. Your invite code is <b>{hc}</b> — entering the lobby…</> });
            setScreen('approved');
            timers.current.push(setTimeout(() => go(true, hc), 1700));
          });
        })
        .catch(() => {
          setScreen('form');
          setJoinError('Failed to create a session — is the server running?');
        });
    }
  };

    const leave = () => { clearTimers(); setScreen('form'); };

  return (
    <div className="join-root">
      <div className="ocean-bg" />
      <div className="stage">
        <div className="card" role="dialog" aria-label="Join the escape room">

          <div className="left">
            <div className="glow" />
            <div className="brand"><span className="mk">K</span> K8s Island Quest</div>
            <div className="pitch">
              <h1>Debug the outage.<br /><em>Escape the island.</em></h1>
              <p>A co-op race against the clock across six broken clusters. Grab your crew, lock in roles, and ship the fix before the pager wins.</p>
              <div className="steps">
                <div className="st"><i>1</i> Name &amp; marker</div>
                <div className="st"><i>2</i> Squad up</div>
                <div className="st"><i>3</i> Set sail</div>
              </div>
            </div>
            <svg className="isleimg" viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <ellipse cx="220" cy="124" rx="158" ry="30" fill="rgba(0,0,0,0.18)" />
              <path d="M70 112 q150 -54 300 0 q-13 26 -150 26 q-137 0 -150 -26Z" fill="#79C24A" />
              <path d="M70 112 q150 -42 300 0 q-28 13 -150 13 q-122 0 -150 -13Z" fill="#8FD45C" />
              <path d="M210 64 l6 -34 l14 0 l6 34Z" fill="#7A4A2B" />
              <ellipse cx="226" cy="34" rx="28" ry="16" fill="#5FB23C" />
              <ellipse cx="206" cy="46" rx="20" ry="12" fill="#6CC24A" />
            </svg>
          </div>

          <div className="right">
            {/* FORM */}
            <div className={'state' + (screen === 'form' ? ' on' : '')}>
              <div className="eyebrow">Prepare for deployment</div>
              <div className="field">
                <label htmlFor="join-name">Player name</label>
                <input className={'inp' + (nameState === 'ok' ? ' ok' : nameState === 'bad' ? ' bad' : '')}
                       id="join-name" type="text" maxLength={22} autoComplete="off" spellCheck="false"
                       placeholder="e.g. Billie Jean" value={name}
                       onChange={(e) => setName(e.target.value)} />
                <div className={'hint ' + (nameState === 'ok' ? 'good' : nameState === 'bad' ? 'err' : 'mut')}>
                  {nameState === 'ok' && <OkIcon />}{nameState === 'bad' && <XIcon />}{nameHint}
                </div>
              </div>
              <div className="field">
                <label>Choose your marker <span className="mk">{marker.n}</span></label>
                <div className="marker-row">
                  <div className="swatches">
                    {JOIN_MARKERS.map((m) => (
                      <button key={m.n} className={'sw' + (m.n === marker.n ? ' on' : '')}
                              style={{ background: m.c }} title={m.n} aria-label={m.n + ' marker'}
                              onClick={() => setMarker(m)}>{m.e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="join-code">Invite code <span className="opt">(optional)</span></label>
                <input className={'inp' + (codeState === 'ok' ? ' ok' : codeState === 'bad' ? ' bad' : '')}
                       id="join-code" type="text" maxLength={9} autoComplete="off" spellCheck="false"
                       placeholder="Leave blank to start a new island" value={code}
                       onChange={(e) => setCode(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) submit(); }} />
                <div className={'hint ' + (codeState === 'ok' ? 'good' : codeState === 'bad' ? 'err' : 'mut')}>
                  {codeState === 'ok' && <OkIcon />}{codeState === 'bad' && <XIcon />}{codeHint}
                </div>
              </div>
              {joinError && <div className="hint err" style={{ marginBottom: 8 }}><XIcon />{joinError}</div>}
              <button className="join" disabled={!canSubmit} onClick={submit}><span>{joinLbl}</span></button>
              <div className="foot">{footHtml}</div>
            </div>

            {/* WAITING */}
            <div className={'state' + (screen === 'wait' ? ' on' : '')}>
              <div className="wait">
                <div className="radar"><span className="pulse" /><span className="pulse" /><span className="pulse" />
                  <div className="av" style={{ background: marker.c }}><span>{marker.e}</span></div>
                </div>
                <h2>Waiting to be invited<span className="dots" /></h2>
                <p>Asking the host of island <span className="codechip">{cd || 'K8S-R37Q'}</span> to wave you aboard. You'll drop straight into the squad lobby once they approve.</p>
                <div className="queue"><div className="qn">{queue.pos}</div><div className="ql"><b>{queue.line}</b><span>{queue.sub}</span></div></div>
                <div><button className="ghost" onClick={leave}>← Leave the queue</button></div>
              </div>
            </div>

            {/* CREATING */}
            <div className={'state' + (screen === 'creating' ? ' on' : '')}>
              <div className="wait">
                <div className="radar"><span className="pulse" /><span className="pulse" /><span className="pulse" />
                  <div className="av" style={{ background: marker.c }}><span>{marker.e}</span></div>
                </div>
                <h2>Charting a new island<span className="dots" /></h2>
                <p>Spinning up a fresh cluster and a private island just for your squad.</p>
                <div className="loadbar"><span /></div>
              </div>
            </div>

            {/* APPROVED */}
            <div className={'state' + (screen === 'approved' ? ' on' : '')}>
              <div className="approved">
                <div className="check"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></div>
                <h2>{approved.title}</h2>
                <p>{approved.sub}</p>
                <div className="loadbar"><span /></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
window.JoinView = JoinView;
