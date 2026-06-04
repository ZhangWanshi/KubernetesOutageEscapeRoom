/* MapView.jsx — the island-map hub. Hosts the MapScene canvas renderer and the
   on-map control bar. The renderer reads live game state through ref-backed
   getters so React stays the single source of truth. */
function MapView() {
  const { rooms, tweaks, openRoom, navigate, simulateWin, reset } = window.useGame();
  const canvasRef = React.useRef(null);
  const roomsRef = React.useRef(rooms);
  const tweaksRef = React.useRef(tweaks);
  const openRoomRef = React.useRef(openRoom);
  roomsRef.current = rooms;
  tweaksRef.current = tweaks;
  openRoomRef.current = openRoom;

  React.useEffect(() => {
    window.Islands.setStyle((tweaksRef.current && tweaksRef.current.artStyle) || 'glossy');
    const stop = window.MapScene.init(canvasRef.current, {
      onEnter: (r) => openRoomRef.current(r),
      getRooms: () => roomsRef.current,
      getTweaks: () => tweaksRef.current,
    });
    return stop;
  }, []);

  React.useEffect(() => {
    window.Islands.setStyle(tweaks.artStyle || 'glossy');
  }, [tweaks.artStyle]);

  return (
    <div className="view" id="view-map">
      <div id="mapStage">
        <canvas id="mapCanvas" ref={canvasRef} width="1120" height="660" />
      </div>
      <div className="map-help">
        <span>Pick an island to enter a challenge</span>
        <button className="btn-gold" onClick={() => navigate('lobby')}>Squad up</button>
        <button className="btn-ghost" onClick={simulateWin}>Simulate win ▶</button>
        <button className="btn-ghost" onClick={reset}>↺ Reset</button>
      </div>
    </div>
  );
}
window.MapView = MapView;
