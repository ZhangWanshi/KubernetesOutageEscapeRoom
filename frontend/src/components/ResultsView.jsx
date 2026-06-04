/* ResultsView.jsx — post-challenge debrief. Port of renderResults(). Room
   completion is applied in App.openResults() before this renders, so `next`
   reflects the newly-unlocked island. */
function ResultsView() {
  const { activeRoom: room, result: res, rooms, navigate, openRoom } = window.useGame();
  const B = window.Islands.BIOMES;
  const win = res.correct;
  const next = rooms.find((r) => r.status === 'available');
  const xpTotal = res.xp || 0;
  const perHead = room.chars.length > 0 ? Math.round(xpTotal / room.chars.length) : xpTotal;

  return (
    <div className="view" id="view-results" style={window.biomeViewStyle(room.biome)}>
      <window.BiomeScene biome={room.biome} />
      <div className="screen" style={window.biomeScreenStyle(room.biome)}>
        <div className="screen-inner narrow">
          <div className={'result-hero ' + (win ? 'win' : 'lose')}>
            <div className="rh-burst" />
            <div className="res-eyebrow">{win ? 'Levels Completed!' : 'Not quite'}</div>
            <h1>{win ? room.title.replace(/^The /, '') + ' — all levels cleared!' : 'The bug got away'}</h1>
            <div className="res-stars">
              {[0, 1, 2].map((i) => (
                <span key={i} className={'rs' + (i < res.stars ? ' on' : '')} style={{ animationDelay: i * 0.12 + 's' }}>
                  <window.Star filled={i < res.stars} size={44} />
                </span>
              ))}
            </div>
            <p className="res-sub">
              {win ? 'Clean diagnosis. The cluster is stable again.'
                   : 'That was not the root cause. Regroup and try another angle.'}
            </p>
          </div>

          <div className="res-cols">
            <div className="card pad">
              <div className="eyebrow">Score breakdown</div>
              {win ? (
                <>
                  <div className="bd-row"><span>Base score ({room.diff})</span><b>+{(window.SCORE_CONFIG.base || {})[room.diff] || 0}</b></div>
                  {res.wrongAnswers > 0 && (
                    <div className="bd-row"><span>Wrong attempts (×{res.wrongAnswers})</span><b className="neg">−{((window.SCORE_CONFIG.wrongPenalty || {})[room.diff] || 0) * res.wrongAnswers}</b></div>
                  )}
                  {res.hintsUsed > 0 && (
                    <div className="bd-row"><span>Hints used (×{res.hintsUsed})</span><b className="neg">−{(window.SCORE_CONFIG.hintPenalty || []).slice(0, Math.min(res.hintsUsed, 3)).reduce((a, b) => a + b, 0)}</b></div>
                  )}
                  <div className="bd-row total"><span>Room score</span><b>{res.roomScore}</b></div>
                </>
              ) : (
                <>
                  <div className="bd-row"><span>Base score ({room.diff})</span><b>+{(window.SCORE_CONFIG.base || {})[room.diff] || 0}</b></div>
                  <div className="bd-row"><span>Wrong answers (×{res.wrongAnswers})</span><b className="neg">−{((window.SCORE_CONFIG.wrongPenalty || {})[room.diff] || 0) * res.wrongAnswers}</b></div>
                  {res.hintsUsed > 0 && (
                    <div className="bd-row"><span>Hints used (×{res.hintsUsed})</span><b className="neg">−{(window.SCORE_CONFIG.hintPenalty || []).slice(0, Math.min(res.hintsUsed, 3)).reduce((a, b) => a + b, 0)}</b></div>
                  )}
                  <div className="bd-row total"><span>Score if completed now</span><b>{Math.max(0, ((window.SCORE_CONFIG.base || {})[room.diff] || 0) - ((window.SCORE_CONFIG.wrongPenalty || {})[room.diff] || 0) * res.wrongAnswers - (window.SCORE_CONFIG.hintPenalty || []).slice(0, Math.min(res.hintsUsed || 0, 3)).reduce((a, b) => a + b, 0))}</b></div>
                </>
              )}
            </div>
            <div className="card pad">
              <div className="eyebrow">Squad debrief</div>
              <div className="debrief">
                {room.chars.map((c) => (
                  <div className="db-row" key={c}><window.AvatarChip cid={c} size={30} /><span>{c}</span><b>+{perHead} XP</b></div>
                ))}
              </div>
            </div>
          </div>

          {win && next && (
            <div className="next-card" style={{ '--bc': B[next.biome].top }}>
              <div>
                <div className="eyebrow">Now unlocked</div>
                <h3>{next.title}</h3>
                <p><window.BiomeChip biome={next.biome} /> {next.domain}</p>
              </div>
              <button className="btn-gold lg" onClick={() => openRoom(next)}>Sail there ▶</button>
            </div>
          )}

          <div className="res-actions">
            {!win && <button className="btn-gold lg" onClick={() => openRoom(room)}>↺ Try again</button>}
            <button className="btn-line lg" onClick={() => navigate('map')}>Back to map</button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ResultsView = ResultsView;
