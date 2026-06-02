/* RoomView.jsx — the diegetic "Ops Terminal" challenge screen. Full port of the
   original renderRoom(): evidence tabs, resolution protocol (root cause +
   remediation), hint reveal, live checklist/progress, and scoring on submit. */

function Evidence({ ev }) {
  if (ev.kind === 'metrics') {
    return (
      <div className="ops-code ops-metrics">
        <div className="metrics">
          {ev.rows.map((r, i) => (
            <div className={'metric ' + r[2]} key={i}>
              <span className="m-k">{r[0]}</span><span className="m-v">{r[1]}</span><i className="m-dot" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="ops-gutter">{ev.lines.map((_, i) => <span key={i}>{i + 1}</span>)}</div>
      <div className="ops-code"><window.TermLines lines={ev.lines} /></div>
    </>
  );
}

function RoomView() {
  const { activeRoom: room, openResults, sessionCode, player } = window.useGame();
  const c = window.QuestData.CONTENT[room.id];
  const b = window.Islands.BIOMES[room.biome];
  const th = window.QuestData.ROOM_THEME[room.biome] || { accent: 'var(--navy)', base: '#0E3550', bg: '' };

  const [tab, setTab] = React.useState(0);
  const [viewed, setViewed] = React.useState(() => new Set([0]));
  const [cause, setCause] = React.useState(null);
  const [fix, setFix] = React.useState(null);
  const [hintUsed, setHintUsed] = React.useState(false);

  // Notify backend when player opens the room
  React.useEffect(() => {
    if (!sessionCode || !player) return;
    const roomNum = parseInt(room.id.replace('r', ''), 10);
    window.Api.beginInvestigation(sessionCode, roomNum, player.name).catch(() => {});
  }, []);

  const selectTab = (i) => {
    setTab(i);
    setViewed((prev) => { const n = new Set(prev); n.add(i); return n; });
    // Record evidence view in backend
    if (sessionCode && player) {
      const roomNum = parseInt(room.id.replace('r', ''), 10);
      const title = c.evidence[i] ? c.evidence[i].tab : String(i);
      window.Api.recordEvidenceView(sessionCode, roomNum, player.name, title).catch(() => {});
    }
  };

  const evDone = viewed.size >= c.evidence.length;
  const caDone = cause !== null;
  const fxDone = fix !== null;
  const pct = (evDone + caDone + fxDone) / 4 * 100;
  const ready = evDone && caDone && fxDone;

  const submit = () => {
    const causeCorrect = c.cause.opts[cause].c;
    const fixCorrect = c.fix.opts[fix].c;
    const correct = fixCorrect;
    const stars = !fixCorrect ? 1 : (causeCorrect ? (hintUsed ? 2 : 3) : 2);
    const xp = !fixCorrect ? 80 : (causeCorrect ? (hintUsed ? 280 : 380) : 240);
    const result = { correct, stars, xp, hintUsed, causeCorrect, fixCorrect,
      causeText: c.cause.opts[cause].t, fixText: c.fix.opts[fix].t };
    openResults(room, result);
    // Advance backend room state on correct answer so all clients see the marker move
    if (sessionCode && correct) {
      const roomNum = parseInt(room.id.replace('r', ''), 10);
      window.Api.completeRoom(sessionCode, roomNum).catch(() => {});
    }
  };

  const todo = [
    ['evidence', 'Evidence', evDone],
    ['cause', 'Root cause', caDone],
    ['fix', 'Remediation', fxDone],
    ['health', 'Service health', false],
  ];

  return (
    <div className="view" id="view-room" style={window.biomeViewStyle(room.biome)}>
      {th.scene && <window.BiomeScene biome={room.biome} />}
      <div className="screen" style={window.biomeScreenStyle(room.biome, { scrim: false })}>
        <div className="screen-inner">
          <div className="ops-room" style={{ '--bc': b.top, '--bce': b.edge }}>

            <div className="ops-term">
              <div className="ops-tbar">
                <span className="ops-lights"><i /><i /><i /></span>
                <span className="ops-path">root@k8s-quest:<b>~/{room.id}</b>$</span>
                <span className="ops-tbmeta">
                  <span className="ops-bars"><i /><i /><i /><i /></span>
                  <span className="ops-conn"><span className="d" />cluster live</span>
                </span>
              </div>
              <div className="ops-tabs">
                {c.evidence.map((e, i) => (
                  <button key={i} className={'evtab' + (i === tab ? ' on' : '') + (viewed.has(i) ? ' seen' : '')}
                          onClick={() => selectTab(i)}>
                    <span className="evdot" />{e.tab}
                  </button>
                ))}
                <span className="ops-tabcount"><b>{viewed.size}/{c.evidence.length}</b></span>
              </div>
              <div className="evbody ops-body"><Evidence ev={c.evidence[tab]} /></div>
              <div className="ops-status">
                <span className="seg mode">READ</span>
                <span className="seg">⎇ incident/{room.id}</span>
                <span className="seg alert">● incident active</span>
              </div>
            </div>

            <div className="ops-rail">
              <div className="ops-hud ops-brief">
                <div className="briefcap">
                  <span className="ops-incident"><span className="dot" />Incident</span>
                  <span className="bk">{room.domain}</span>
                  <span className="avrow">{room.chars.map((x) => <window.AvatarChip key={x} cid={x} size={28} />)}</span>
                </div>
                <div className="b-body">
                  <div className="b-pills"><window.BiomeChip biome={room.biome} /> <window.DiffPill d={room.diff} /></div>
                  <div className="b-title">{room.title}</div>
                  <p className="b-mission">{c.mission}</p>
                  <ul className="todo-list">
                    {todo.map(([k, label, done]) => (
                      <li key={k} className={done ? 'done' : ''}><i className="tk" /><span>{label}</span></li>
                    ))}
                  </ul>
                  <div className="b-foot">
                    <button className="btn-line" disabled={hintUsed} onClick={() => {
                      setHintUsed(true);
                      if (sessionCode) {
                        const roomNum = parseInt(room.id.replace('r', ''), 10);
                        const playerName = player ? player.name : null;
                        window.Api.requestHint(sessionCode, roomNum, playerName).catch(() => {});
                      }
                    }}>
                      {hintUsed ? 'Hint revealed' : 'Reveal a hint (−1★)'}
                    </button>
                    <span className="hint-text">{hintUsed ? c.hint : ''}</span>
                  </div>
                </div>
              </div>

              <div className="ops-hud ops-protocol">
                <div className="hudcap">
                  <span className="hi">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" />
                    </svg>
                  </span>
                  <span className="ht">Resolution Protocol</span>
                </div>
                <div className="hudbody">
                  <div className="ops-prog"><span style={{ width: pct + '%' }} /></div>
                  <div className="ops-step">
                    <div className="ops-steplab"><span className="step-n">1</span> Identify the root cause</div>
                    <div className="opts">
                      {c.cause.opts.map((o, i) => (
                        <button key={i} className={'opt' + (cause === i ? ' sel' : '')} onClick={() => setCause(i)}>
                          <span className="dot" /><span>{o.t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ops-step">
                    <div className="ops-steplab"><span className="step-n">2</span> Choose a remediation</div>
                    <div className="opts">
                      {c.fix.opts.map((o, i) => (
                        <button key={i} className={'opt' + (fix === i ? ' sel' : '')} onClick={() => setFix(i)}>
                          <span className="dot" /><span>{o.t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="btn-submit" disabled={!ready} onClick={submit}>Execute resolution ⚡</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
window.RoomView = RoomView;
