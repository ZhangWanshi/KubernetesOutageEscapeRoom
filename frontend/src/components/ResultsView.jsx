/* ResultsView.jsx — post-challenge debrief. Port of renderResults(). Room
   completion is applied in App.openResults() before this renders, so `next`
   reflects the newly-unlocked island. */
function ResultsView() {
  const { activeRoom: room, result: res, rooms, navigate, openRoom } = window.useGame();
  const B = window.Islands.BIOMES;
  const win = res.correct;
  const next = rooms.find((r) => r.status === 'available');
  const perHead = Math.round(res.xp / room.chars.length);

  return (
    <div className="view" id="view-results" style={window.biomeViewStyle(room.biome)}>
      <window.BiomeScene biome={room.biome} />
      <div className="screen" style={window.biomeScreenStyle(room.biome)}>
        <div className="screen-inner narrow">
          <div className={'result-hero ' + (win ? 'win' : 'lose')}>
            <div className="rh-burst" />
            <div className="res-eyebrow">{win ? 'Island cleared' : 'Not quite'}</div>
            <h1>{win ? room.title.replace(/^The /, '') + ' solved!' : 'The bug got away'}</h1>
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
              <div className="bd-row"><span>Root cause</span><b className={res.causeCorrect ? 'pos' : 'neg'}>{res.causeCorrect ? 'correct +130' : 'missed'}</b></div>
              <div className="bd-row"><span>Remediation</span><b className={res.fixCorrect ? 'pos' : 'neg'}>{res.fixCorrect ? 'correct +250' : 'wrong +0'}</b></div>
              <div className="bd-row"><span>Hint used</span><b className={res.hintUsed ? 'neg' : 'mut'}>{res.hintUsed ? '−1★' : 'none'}</b></div>
              <div className="bd-row total"><span>XP earned</span><b>+{res.xp}</b></div>
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
