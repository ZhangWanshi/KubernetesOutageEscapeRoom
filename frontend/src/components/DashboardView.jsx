/* DashboardView.jsx — player profile, expedition progress & squad. Port of
   renderDashboard(), with stats derived live from the rooms state. */
function DashboardView() {
  const { rooms, sessionStats, player, sessionCode, liveScore, roomAttempts } = window.useGame();
  const B = window.Islands.BIOMES;
  const cleared = rooms.filter((r) => r.status === 'completed');

  const wrongAttempts = Object.values(roomAttempts || {}).reduce((s, a) => s + (a.wrongAnswers || 0), 0);
  const hintsUsed = Object.values(roomAttempts || {}).reduce((s, a) => s + (a.hintsUsed || 0), 0);
  const squadPlayers = sessionStats && sessionStats.players && sessionStats.players.length > 0
    ? sessionStats.players.map((p) => p.name)
    : (player ? [player.name] : []);

  const stats = [
    { k: 'Islands cleared', v: `${cleared.length}/${rooms.length}`, c: '#5FD08A' },
    { k: 'Total score', v: String(liveScore), c: '#FFCE3A' },
    { k: 'Wrong attempts', v: String(wrongAttempts), c: '#FF6B5E' },
    { k: 'Hints used', v: String(hintsUsed), c: '#2BB6A8' },
  ];
  const stMap = {
    completed: ['Cleared', '#5FD08A'], attempted: ['In progress', '#FF6B5E'],
    available: ['Available', '#FFCE3A'], locked: ['Locked', '#8FA0B2'],
  };
  const biome = window.inProgressRoom(rooms).biome;

  return (
    <div className="view" id="view-dashboard" style={window.biomeViewStyle(biome)}>
      <window.BiomeScene biome={biome} />
      <div className="screen" style={window.biomeScreenStyle(biome)}>
        <div className="screen-inner">
          <div className="dash-head">
            <div className="dh-av">{player ? player.marker : '?'}</div>
            <div className="dh-info">
              <div className="dh-name">{player ? player.name : 'Guest'}</div>
              <div className="dh-title">Kubernetes Responder</div>
              <div className="xpbar"><span style={{ width: Math.min(100, liveScore / 10) + '%' }} /></div>
              <div className="xp-lab">Score: {liveScore}</div>
            </div>
          </div>

          <div className="stat-grid">
            {stats.map((s) => (
              <div className="card stat-tile" key={s.k}>
                <div className="st-v" style={{ color: s.c }}>{s.v}</div>
                <div className="st-k">{s.k}</div>
              </div>
            ))}
          </div>

          <div className="dash-cols">
            <div className="card pad">
              <div className="eyebrow">Expedition progress</div>
              <div className="prog-list">
                {rooms.map((r, i) => {
                  const [lab, col] = stMap[r.status];
                  return (
                    <div className={'prog-row' + (r.status === 'locked' ? ' lk' : '')} key={r.id}>
                      <span className="pr-n" style={{ background: B[r.biome].top }}>{i + 1}</span>
                      <div className="pr-mid">
                        <div className="pr-title">{r.title}</div>
                        <div className="pr-sub"><window.BiomeChip biome={r.biome} /> {r.domain}</div>
                      </div>
                      <div className="pr-stars">
                        {r.status === 'completed' && [0, 1, 2].map((s) => <window.Star key={s} filled={s < r.score} size={15} />)}
                      </div>
                      <span className="pill" style={{ background: col + '22', color: col }}>{lab}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card pad">
              <div className="eyebrow">Your squad</div>
              <div className="squad-list">
                {squadPlayers.length === 0 && (
                  <div style={{ opacity: 0.5, fontStyle: 'italic', padding: '8px 0' }}>No players in session yet.</div>
                )}
                {squadPlayers.map((name, i) => (
                  <div className="sq-row" key={name}>
                    <window.AvatarChip cid={name} size={34} />
                    <div className="sq-mid"><b>{name}</b>{name === (player && player.name) && <span style={{ marginLeft: 6, opacity: 0.6 }}>you</span>}</div>
                    <div className="sq-bar"><span style={{ width: Math.max(20, 100 - i * 15) + '%' }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.DashboardView = DashboardView;
