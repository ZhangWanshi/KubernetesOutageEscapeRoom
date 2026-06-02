/* App.jsx — root component. Owns all game state, routing between views, sound &
   ambience wiring, and the Tweaks panel. Provides everything to the tree via
   window.GameCtx (consumed with useGame()). */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "artStyle": "glossy",
  "sky": "tropical",
  "islandCount": 6,
  "layout": "winding",
  "avatar": "circle"
}/*EDITMODE-END*/;

const clone = (o) => JSON.parse(JSON.stringify(o));
const sfx = (k) => { if (window.Sfx) window.Sfx.play(k); };

// Colour palette for auto-assigning avatar colours to players not in the original AVPAL
const _AUTO_COLORS = ['#2E86DE','#2BB673','#9B59B6','#E67E22','#16A39A','#E2554A','#E84393','#F4B73C','#3498DB','#8E44AD'];
function _nameColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return _AUTO_COLORS[h % _AUTO_COLORS.length];
}
function registerAvpal(name, color) {
  if (!name) return;
  if (window.AVPAL && !window.AVPAL[name]) {
    window.AVPAL[name] = { bg: color || _nameColor(name), i: name.charAt(0).toUpperCase() };
  }
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [rooms, setRooms] = React.useState(() => clone(window.MapScene.ROOMS_INIT));
  const [view, setView] = React.useState('join');
  const [player, setPlayer] = React.useState(null);
  const [sessionCode, setSessionCode] = React.useState(null);
  const [activeRoom, setActiveRoom] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [lobbyTarget, setLobbyTarget] = React.useState(null);
  const [util, setUtil] = React.useState(null);
  const [claims, setClaims] = React.useState(0);
  const [soundOn, setSoundOnState] = React.useState(() => !window.Sfx || window.Sfx.isOn());
  const [sessionStats, setSessionStats] = React.useState(null);

  // Keep session stats in sync with the backend; register any new players in AVPAL
  React.useEffect(() => {
    if (!sessionCode) return;
    const poll = () => {
      window.Api.getState(sessionCode)
        .then((s) => {
          setSessionStats(s);
          if (s && s.players) s.players.forEach((p) => registerAvpal(p.name));
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [sessionCode]);

  // Sync frontend room states from backend on every sessionStats poll.
  // Runs for any active session status so all clients stay consistent.
  React.useEffect(() => {
    if (!sessionStats || !sessionStats.currentRoomId) return;
    const { currentRoomId } = sessionStats;
    setRooms((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const rNum = parseInt(r.id.replace('r', ''), 10);
        if (rNum > 3) return r;
        if (rNum < currentRoomId && r.status !== 'completed') {
          changed = true;
          return { ...r, status: 'completed', score: r.score || 1 };
        }
        if (rNum === currentRoomId && r.status === 'locked') {
          changed = true;
          return { ...r, status: 'available' };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [sessionStats]);

  // Ambience follows the room: only the room view plays its biome bed.
  React.useEffect(() => {
    if (view !== 'room' && window.Ambience) window.Ambience.stop();
  }, [view]);

  const completeRoom = React.useCallback((id, score) => {
    setRooms((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, status: 'completed', score } : r);
      for (let i = 0; i < next.length - 1; i++) {
        if (['completed', 'attempted'].includes(next[i].status) && next[i + 1].status === 'locked') {
          next[i + 1] = { ...next[i + 1], status: 'available' };
        }
      }
      return next;
    });
  }, []);

  const navigate = (v) => {
    sfx('nav');
    if (v === 'lobby') setLobbyTarget(null);
    setView(v);
  };
  const openRoom = (room) => {
    sfx('enter');
    setActiveRoom(room);
    setRooms((prev) => prev.map((r) => r.id === room.id && r.status === 'available' ? { ...r, status: 'attempted' } : r));
    setView('room');
    if (window.Ambience) window.Ambience.forRoom(room.id);
  };
  const openResults = (room, res) => {
    if (res.correct) completeRoom(room.id, res.stars);
    setActiveRoom(room);
    setResult(res);
    setView('results');
    sfx(res.correct ? 'win' : 'lose');
  };
  const simulateWin = () => {
    const r = rooms.find((x) => x.status === 'available') || rooms.find((x) => x.status === 'attempted');
    if (r) completeRoom(r.id, 3);
  };
  const reset = () => setRooms(clone(window.MapScene.ROOMS_INIT));

  const finishJoin = (profile) => {
    setPlayer(profile);
    if (profile.code) setSessionCode(profile.code);
    registerAvpal(profile.name, profile.color);
    try { localStorage.setItem('k8sq.player', JSON.stringify(profile)); } catch (e) {}
    sfx('enter');
    if (profile.currentRoomId) {
      // Late joiner: game already running — sync room states and enter the current room directly
      const rNum = profile.currentRoomId;
      const roomId = 'r' + rNum;
      setRooms((prev) => prev.map((r) => {
        const n = parseInt(r.id.replace('r', ''), 10);
        if (n < rNum) return { ...r, status: 'completed', score: r.score || 1 };
        if (n === rNum) return { ...r, status: 'attempted' };
        return r;
      }));
      const room = window.MapScene.ROOMS_INIT.find((r) => r.id === roomId) || window.MapScene.ROOMS_INIT[0];
      setActiveRoom({ ...room, status: 'attempted' });
      setView('room');
    } else {
      setView('lobby');
    }
  };

  const openUtil = (key) => { sfx('nav'); setUtil(key); };
  const closeUtil = () => setUtil(null);
  const setSoundOn = (v) => { if (window.Sfx) window.Sfx.set(v); setSoundOnState(v); };
  const claimReward = () => setClaims((n) => n + 1);

  // map renderer reads this shape
  const mapTweaks = {
    artStyle: t.artStyle, sky: t.sky, count: t.islandCount, layout: t.layout, avatar: t.avatar,
  };

  // Populate each room's chars with real session players so the map draws their avatars.
  // Use backend currentRoomId as the single source of truth so all clients agree on
  // which island shows the team markers, regardless of local room state differences.
  const playerNames = sessionStats && sessionStats.players && sessionStats.players.length > 0
    ? sessionStats.players.map((p) => p.name)
    : (player ? [player.name] : []);

  const activeRoomId = sessionStats && sessionStats.currentRoomId
    ? 'r' + sessionStats.currentRoomId
    : (rooms.find((r) => r.status === 'attempted') || rooms.find((r) => r.status === 'available') || rooms[0]).id;

  const roomsWithChars = rooms.map((r) => ({
    ...r,
    chars: r.id === activeRoomId ? playerNames : [],
  }));

  const ctx = {
    rooms: roomsWithChars, view, activeRoom, result, lobbyTarget, util, soundOn, player,
    rewardsClaimed: claims >= 2,
    sessionCode, sessionStats,
    tweaks: mapTweaks,
    navigate, openRoom, openResults, simulateWin, reset, finishJoin,
    completeRoom, openUtil, closeUtil, setSoundOn, claimReward,
    playSfx: sfx,
  };

  // The join screen is its own full-bleed layout — render it without app chrome.
  if (view === 'join') {
    return (
      <window.GameCtx.Provider value={ctx}>
        <window.JoinView />
      </window.GameCtx.Provider>
    );
  }

  return (
    <window.GameCtx.Provider value={ctx}>
      <div id="app">
        <window.TopBar />
        <div className="appbody">
          <window.NavRail />
          <div className="viewwrap">
            {view === 'map' && <window.MapView />}
            {view === 'room' && activeRoom && <window.RoomView />}
            {view === 'results' && activeRoom && result && <window.ResultsView />}
            {view === 'lobby' && <window.LobbyView />}
            {view === 'dashboard' && <window.DashboardView />}
          </div>
          <window.UtilRail />
        </div>
        <window.UtilPopover />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Art direction" />
        <TweakRadio label="Style" value={t.artStyle}
          options={[{ value: 'glossy', label: 'Glossy' }, { value: 'flat', label: 'Flat' }, { value: 'toon', label: 'Toon' }]}
          onChange={(v) => setTweak('artStyle', v)} />
        <TweakSelect label="Sky / ocean" value={t.sky}
          options={[{ value: 'tropical', label: 'Tropical cyan' }, { value: 'sunset', label: 'Sunset teal' }, { value: 'dusk', label: 'Violet dusk' }, { value: 'night', label: 'Deep night' }]}
          onChange={(v) => setTweak('sky', v)} />

        <TweakSection label="Islands" />
        <TweakSlider label="Island count" value={t.islandCount} min={3} max={6} unit="" onChange={(v) => setTweak('islandCount', v)} />
        <TweakRadio label="Layout" value={t.layout}
          options={[{ value: 'winding', label: 'Winding' }, { value: 'arc', label: 'Arc' }]}
          onChange={(v) => setTweak('layout', v)} />

        <TweakSection label="Avatars" />
        <TweakRadio label="Marker" value={t.avatar}
          options={[{ value: 'circle', label: 'Circle' }, { value: 'squircle', label: 'Squircle' }, { value: 'pin', label: 'Pin' }]}
          onChange={(v) => setTweak('avatar', v)} />
      </TweaksPanel>
    </window.GameCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
