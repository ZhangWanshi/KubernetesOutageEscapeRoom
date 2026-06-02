/* chrome.jsx — persistent app chrome: top bar, the two diamond nav rails, and the
   right-rail utility popovers (Runbook / Rewards / Settings). Keeps the original
   data-view / data-util attributes so the CSS hover micro-animations still fire. */

const NAV_ICONS = {
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4L3 6.5v13L9 17l6 2.5L21 17V4l-6 2.5z" /><path d="M9 4v13M15 6.5v13" />
    </svg>
  ),
  lobby: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  ),
};

const UTIL_ICONS = {
  runbook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" /><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19M8 7h7M8 10.5h7" />
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="8" width="17" height="12" rx="1.5" /><path d="M3.5 12h17M12 8v12M12 8S10 3.5 7.5 4.2 9 8 12 8s2.5-3.1 0-3.8S12 8 12 8z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
    </svg>
  ),
};

function TopBar() {
  const { player, sessionStats } = window.useGame();
  const name = (player && player.name) || 'Guest';
  const av = player ? player.marker : '?';
  const avBg = player ? player.color : null;
  // Derive completed stars from backend currentRoomId so all clients agree
  const completedRooms = sessionStats && sessionStats.currentRoomId ? sessionStats.currentRoomId - 1 : 0;
  const stars = completedRooms;
  const score = sessionStats ? sessionStats.score : 0;
  return (
    <div className="topbar">
      <div className="brand" style={{ fontWeight: 700, fontSize: 30 }}>
        <span className="mark" style={{ backgroundSize: 'cover' }}>&#8968;</span> K8s Island Quest
      </div>
      <div className="spacer" />
      <div className="hud">
        <div className="stat"><span className="ic" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>&#9733;</span><span>{stars}</span></div>
        <div className="stat"><span className="ic" style={{ background: 'var(--coral)' }}>&#10022;</span><span>{score}</span></div>
        <div className="me"><span className="nm">{name}</span><span className="av" style={avBg ? { background: avBg } : null}>{av}</span></div>
      </div>
    </div>
  );
}

function NavRail() {
  const { view, navigate } = window.useGame();
  const items = [
    { view: 'map', label: 'Map' },
    { view: 'lobby', label: 'Lobby' },
    { view: 'dashboard', label: 'Dashboard' },
  ];
  // room/results are sub-views of the map flow → keep Map lit
  const active = (v) => v === view || (v === 'map' && (view === 'room' || view === 'results'));
  return (
    <nav className="rail rail-left">
      {items.map((it) => (
        <button key={it.view} className={'gbtn' + (active(it.view) ? ' on' : '')}
                data-view={it.view} onClick={() => navigate(it.view)}>
          <span className="gdia"><span className="gico">{NAV_ICONS[it.view]}</span></span>
          <span className="glabel">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

function UtilRail() {
  const { openUtil, rewardsClaimed } = window.useGame();
  return (
    <nav className="rail rail-right">
      <button className="gbtn" data-util="runbook" onClick={() => openUtil('runbook')}>
        <span className="gdia"><span className="gico">{UTIL_ICONS.runbook}</span></span>
        <span className="glabel">Runbook</span>
      </button>
      <button className="gbtn" data-util="rewards" onClick={() => openUtil('rewards')}>
        {!rewardsClaimed && <span className="gbadge">!</span>}
        <span className="gdia"><span className="gico">{UTIL_ICONS.rewards}</span></span>
        <span className="glabel">Rewards</span>
      </button>
      <button className="gbtn" data-util="settings" onClick={() => openUtil('settings')}>
        <span className="gdia"><span className="gico">{UTIL_ICONS.settings}</span></span>
        <span className="glabel">Settings</span>
      </button>
    </nav>
  );
}

// ── popover bodies ──────────────────────────────────────────────────
const RUNBOOK = [
  ['kubectl get pods', 'List pods & their status'],
  ['kubectl logs <pod> --previous', 'Logs from the last crash'],
  ['kubectl describe pod <pod>', 'Events, probes & last state'],
  ['kubectl get endpoints <svc>', 'Which pods a Service targets'],
  ['kubectl rollout undo deploy/<d>', 'Revert a bad deployment'],
  ['kubectl top pods', 'Live CPU / memory usage'],
];

function RunbookBody() {
  return (
    <div className="rb-list">
      {RUNBOOK.map(([code, desc], i) => (
        <div className="rb-row" key={i}><code>{code}</code><span>{desc}</span></div>
      ))}
    </div>
  );
}

function RewardsBody() {
  const { playSfx, claimReward } = window.useGame();
  const [claimed, setClaimed] = React.useState({ login: false, hint: false });
  const claim = (k) => { playSfx('click'); setClaimed((c) => ({ ...c, [k]: true })); claimReward(); };
  return (
    <div className="rw-claim">
      <div className={'rw-item' + (claimed.login ? ' done' : '')}>
        <span className="rw-ic" style={{ background: 'var(--gold)' }}>★</span>
        <div><b>Daily login</b><span>Day 5 streak</span></div>
        {claimed.login ? <span className="rw-done">Claimed ✓</span>
          : <button className="btn-gold sm" onClick={() => claim('login')}>Claim +200 XP</button>}
      </div>
      <div className={'rw-item' + (claimed.hint ? ' done' : '')}>
        <span className="rw-ic" style={{ background: 'var(--teal)' }}>⬡</span>
        <div><b>Hint token ×2</b><span>Reveal a clue free</span></div>
        {claimed.hint ? <span className="rw-done">Claimed ✓</span>
          : <button className="btn-gold sm" onClick={() => claim('hint')}>Claim</button>}
      </div>
      <div className="rw-item done">
        <span className="rw-ic" style={{ background: '#5FD08A' }}>✓</span>
        <div><b>First clear bonus</b><span>Already claimed</span></div>
        <span className="rw-done">Claimed</span>
      </div>
    </div>
  );
}

function SettingsBody() {
  const { soundOn, setSoundOn } = window.useGame();
  return (
    <div className="set-list">
      <div className="set-row">
        <div><b>Sound effects</b><span>UI clicks, chimes &amp; victory fanfare</span></div>
        <button className={'toggle' + (soundOn ? ' on' : '')} role="switch" aria-label="Toggle sound"
                onClick={() => setSoundOn(!soundOn)}><span className="knob" /></button>
      </div>
      <div className="set-note">More options coming as the expedition grows.</div>
    </div>
  );
}

const UTIL_META = {
  runbook: { title: 'Field Runbook', sub: 'Quick kubectl reference for the expedition', Body: RunbookBody },
  rewards: { title: 'Daily Rewards', sub: 'Claim your on-call loot', Body: RewardsBody },
  settings: { title: 'Settings', sub: 'Audio & preferences', Body: SettingsBody },
};

function UtilPopover() {
  const { util, closeUtil } = window.useGame();
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (!util) { setShow(false); return; }
    const id = requestAnimationFrame(() => setShow(true));
    const onKey = (e) => { if (e.key === 'Escape') closeUtil(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', onKey); };
  }, [util]);
  if (!util) return null;
  const meta = UTIL_META[util];
  if (!meta) return null;
  const { Body } = meta;
  return (
    <div className={'pop-overlay' + (show ? ' show' : '')}
         onClick={(e) => { if (e.target === e.currentTarget) closeUtil(); }}>
      <div className="pop-card">
        <button className="pop-x" aria-label="Close" onClick={closeUtil}>✕</button>
        <div className="eyebrow">{meta.sub}</div>
        <h2 className="pop-title">{meta.title}</h2>
        <Body />
      </div>
    </div>
  );
}

Object.assign(window, { TopBar, NavRail, UtilRail, UtilPopover });
