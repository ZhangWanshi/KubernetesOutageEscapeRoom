/* RoomView.jsx — dispatches to per-room challenge type with 3-level progression. */

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

// ── Challenge type metadata ──────────────────────────────────────────────────
const CHALLENGE_META = {
  'cause-fix': { label: 'Resolution Protocol', todoItem: null },
  'fill-blank': { label: 'Fill in the Blanks',  todoItem: 'Complete blanks' },
  'drag-match': { label: 'Match Objects',        todoItem: 'Match all objects' },
  'sequence':   { label: 'Arrange Sequence',     todoItem: 'Order the steps' },
  'command':    { label: 'Build Command',         todoItem: 'Build the command' },
};

const CHALLENGE_COMPONENTS = {
  'fill-blank': () => window.FillBlankChallenge,
  'drag-match': () => window.DragMatchChallenge,
  'sequence':   () => window.RearrangeChallenge,
  'command':    () => window.CommandChallenge,
};

function RoomView() {
  const { activeRoom: room, openResults, sessionCode, player, roomAttempts, recordHintUsed } = window.useGame();
  const content = window.QuestData.CONTENT[room.id];
  const levels = content.levels;
  const challengeType = content.type || 'cause-fix';
  const totalLevels = levels.length;

  const b = window.Islands.BIOMES[room.biome];
  const th = window.QuestData.ROOM_THEME[room.biome] || { accent: 'var(--navy)', base: '#0E3550', bg: '' };

  // ── Level progression state ──────────────────────────────────────────────
  const [currentLevel, setCurrentLevel] = React.useState(0);
  const [anyHintUsed, setAnyHintUsed] = React.useState(false);

  // ── Per-level evidence panel state ──────────────────────────────────────
  const [tab, setTab] = React.useState(0);
  const [viewed, setViewed] = React.useState(() => new Set([0]));

  // ── cause-fix only ───────────────────────────────────────────────────────
  const [cause, setCause] = React.useState(null);
  const [fix, setFix] = React.useState(null);
  const [openStep, setOpenStep] = React.useState(1);

  // ── other challenge types ─────────────────────────────────────────────
  const [hintUsed, setHintUsed] = React.useState(false);
  const [challengeReady, setChallengeReady] = React.useState(false);
  const challengeRef = React.useRef(null);

  const c = levels[currentLevel];
  const meta = CHALLENGE_META[challengeType] || CHALLENGE_META['cause-fix'];

  // ── Countdown timer (display only, no score effect) ──────────────────────
  const scoreCfg = window.SCORE_CONFIG || {};
  const timeLimit = (scoreCfg.timeLimit || {})[room.diff] || 600;
  const attemptData = roomAttempts && roomAttempts[room.id];
  const [timeRemaining, setTimeRemaining] = React.useState(() => {
    if (!attemptData || !attemptData.startTime) return timeLimit;
    return Math.max(0, timeLimit - Math.floor((Date.now() - attemptData.startTime) / 1000));
  });
  React.useEffect(() => {
    const startTime = attemptData && attemptData.startTime;
    if (!startTime) return;
    const id = setInterval(() => {
      setTimeRemaining(Math.max(0, timeLimit - Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [attemptData && attemptData.startTime, timeLimit]);
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  React.useEffect(() => {
    if (!sessionCode || !player) return;
    const roomNum = parseInt(room.id.replace('r', ''), 10);
    window.Api.beginInvestigation(sessionCode, roomNum, player.name).catch(() => {});
  }, []);

  const selectTab = (i) => {
    setTab(i);
    setViewed(prev => { const n = new Set(prev); n.add(i); return n; });
    if (sessionCode && player) {
      const roomNum = parseInt(room.id.replace('r', ''), 10);
      const title = c.evidence[i] ? c.evidence[i].tab : String(i);
      window.Api.recordEvidenceView(sessionCode, roomNum, player.name, title).catch(() => {});
    }
  };

  const evDone = viewed.size >= c.evidence.length;

  // Ready logic differs by type
  const caDone = challengeType === 'cause-fix' ? cause !== null : true;
  const fxDone = challengeType === 'cause-fix' ? fix !== null : challengeReady;
  const pct = (evDone + caDone + fxDone) / 4 * 100;
  const ready = evDone && (challengeType === 'cause-fix' ? (cause !== null && fix !== null) : challengeReady);

  const isLastLevel = currentLevel >= totalLevels - 1;

  const advanceLevel = () => {
    if (hintUsed) setAnyHintUsed(true);
    setCurrentLevel(prev => prev + 1);
    setCause(null); setFix(null);
    setHintUsed(false); setOpenStep(1);
    setTab(0); setViewed(new Set([0]));
    setChallengeReady(false);
  };

  const submit = () => {
    let isCorrect, causeCorrect, fixCorrect, causeText, fixText;
    const hintEver = anyHintUsed || hintUsed;

    if (challengeType === 'cause-fix') {
      causeCorrect = c.cause.opts[cause].c;
      fixCorrect   = c.fix.opts[fix].c;
      isCorrect    = fixCorrect;
      causeText    = c.cause.opts[cause].t;
      fixText      = c.fix.opts[fix].t;
    } else {
      const res = challengeRef.current.getResult();
      isCorrect  = res.isCorrect;
      causeCorrect = isCorrect;
      fixCorrect   = isCorrect;
      causeText    = '';
      fixText      = '';
    }

    if (isCorrect && !isLastLevel) {
      advanceLevel();
      return;
    }

    const stars = !isCorrect ? 1 : (causeCorrect ? (hintEver ? 2 : 3) : 2);
    const xp    = !isCorrect ? 80 : (causeCorrect ? (hintEver ? 280 : 380) : 240);
    const result = {
      correct: isCorrect, stars, xp,
      hintUsed: hintEver, causeCorrect, fixCorrect,
      causeText, fixText,
      levelsCompleted: isCorrect ? totalLevels : currentLevel + 1,
      totalLevels,
    };
    openResults(room, result);
    if (sessionCode && isCorrect) {
      const roomNum = parseInt(room.id.replace('r', ''), 10);
      window.Api.completeRoom(sessionCode, roomNum).catch(() => {});
    }
  };

  // Todo sidebar items
  const todo = challengeType === 'cause-fix'
    ? [['ev', 'Evidence', evDone], ['ca', 'Root cause', cause !== null], ['fx', 'Remediation', fix !== null], ['h', 'Service health', false]]
    : [['ev', 'Evidence', evDone], ['ch', meta.todoItem, challengeReady], ['h', 'Service health', false]];

  const buttonLabel = isLastLevel
    ? `Level ${totalLevels}/${totalLevels} — Execute Resolution ⚡`
    : `Level ${currentLevel + 1}/${totalLevels} — Continue →`;

  // Challenge component (null for cause-fix — rendered inline)
  const ChallengeComp = challengeType !== 'cause-fix'
    ? CHALLENGE_COMPONENTS[challengeType]?.()
    : null;

  return (
    <div className="view" id="view-room" style={window.biomeViewStyle(room.biome)}>
      {th.scene && <window.BiomeScene biome={room.biome} />}
      <div className="screen" style={window.biomeScreenStyle(room.biome, { scrim: false })}>
        <div className="screen-inner">
          <div className="ops-room" style={{ '--bc': b.top, '--bce': b.edge }}>

            {/* ── Evidence terminal ── */}
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
                  <button key={i}
                    className={'evtab' + (i === tab ? ' on' : '') + (viewed.has(i) ? ' seen' : '')}
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

            {/* ── Right rail ── */}
            <div className="ops-rail">

              {/* Brief */}
              <div className="ops-hud ops-brief">
                <div className="briefcap">
                  <span className="ops-incident"><span className="dot" />Incident</span>
                  <span className="bk">{room.domain}</span>
                  <span className="avrow">{room.chars.map(x => <window.AvatarChip key={x} cid={x} size={28} />)}</span>
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
                    <div className="room-timer">
                      <span className="timer-label">Time remaining</span>
                      <span className={'timer-val' + (timeRemaining < 60 ? ' timer-danger' : timeRemaining < 180 ? ' timer-warn' : '')}>{fmtTime(timeRemaining)}</span>
                    </div>
                    <button className="btn-line" disabled={hintUsed} onClick={() => {
                      setHintUsed(true);
                      const hintsUsedSoFar = (roomAttempts && roomAttempts[room.id]?.hintsUsed) || 0;
                      const hintPenalty = (window.SCORE_CONFIG?.hintPenalty || [10, 20, 30])[Math.min(hintsUsedSoFar, 2)];
                      recordHintUsed(room.id, hintPenalty);
                      if (sessionCode) {
                        const roomNum = parseInt(room.id.replace('r', ''), 10);
                        window.Api.requestHint(sessionCode, roomNum, player ? player.name : null).catch(() => {});
                      }
                    }}>
                      {hintUsed ? 'Hint revealed' : 'Reveal a hint (−1★)'}
                    </button>
                    <span className="hint-text">{hintUsed ? c.hint : ''}</span>
                  </div>
                </div>
              </div>

              {/* Protocol / Challenge panel */}
              <div className="ops-hud ops-protocol">
                <div className="hudcap">
                  <span className="hi">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" />
                    </svg>
                  </span>
                  <span className="ht">{meta.label}</span>
                  <span className="level-badge">
                    {[...Array(totalLevels)].map((_, i) => (
                      <span key={i} className={'lvl-pip' + (i < currentLevel ? ' done' : i === currentLevel ? ' active' : '')} />
                    ))}
                    Level {currentLevel + 1}/{totalLevels}
                  </span>
                </div>

                <div className="hudbody">
                  <div className="ops-prog"><span style={{ width: pct + '%' }} /></div>

                  {/* ── cause-fix inline ── */}
                  {challengeType === 'cause-fix' && (
                    <>
                      <div className={'ops-step' + (openStep === 1 ? ' ops-step--open' : '')}>
                        <div className="ops-steplab" onClick={() => setOpenStep(openStep === 1 ? null : 1)} style={{ cursor: 'pointer' }}>
                          <span className="step-n">1</span> Identify the root cause
                          <span className="step-chevron">▼</span>
                        </div>
                        <div className="ops-step-body">
                          <div className="opts">
                            {c.cause.opts.map((o, i) => (
                              <button key={i} className={'opt' + (cause === i ? ' sel' : '')}
                                onClick={() => { setCause(i); setOpenStep(2); }}>
                                <span className="dot" /><span>{o.t}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className={'ops-step' + (openStep === 2 ? ' ops-step--open' : '')}>
                        <div className="ops-steplab" onClick={() => setOpenStep(openStep === 2 ? null : 2)} style={{ cursor: 'pointer' }}>
                          <span className="step-n">2</span> Choose a remediation
                          <span className="step-chevron">▼</span>
                        </div>
                        <div className="ops-step-body">
                          <div className="opts">
                            {c.fix.opts.map((o, i) => (
                              <button key={i} className={'opt' + (fix === i ? ' sel' : '')}
                                onClick={() => { setFix(i); setOpenStep(null); }}>
                                <span className="dot" /><span>{o.t}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── other challenge types ── */}
                  {ChallengeComp && (
                    <ChallengeComp
                      key={currentLevel}
                      c={c}
                      onReady={setChallengeReady}
                      ref={challengeRef}
                    />
                  )}

                  <button className="btn-submit" disabled={!ready} onClick={submit}>
                    {buttonLabel}
                  </button>
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
