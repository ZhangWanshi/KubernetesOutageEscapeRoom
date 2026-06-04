/* state.jsx — the shared game context. App provides the value; every component
   reads it via useGame(). Defined before the components so window.GameCtx exists
   when they render. */
window.GameCtx = React.createContext(null);
window.useGame = function useGame() { return React.useContext(window.GameCtx); };
