/* scenes.jsx — the per-biome canvas backdrop + the inline styles that tint each
   view's screen, mirroring the original applyBiomeBackdrop()/renderRoom() logic. */

const TOP_SCRIM = 'linear-gradient(180deg, rgba(4,12,7,.55) 0%, rgba(4,12,7,.34) 110px, rgba(4,12,7,.10) 280px, rgba(4,12,7,0) 420px)';

// A canvas that paints its biome scene (forest pines, snow peaks, lava, …).
function BiomeScene({ biome }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    const th = window.QuestData.ROOM_THEME[biome];
    const b = window.Islands.BIOMES[biome];
    if (cv && th && b) window.RoomScene.paint(cv, b, th.scene);
    return () => { if (cv && cv._sceneRO) { cv._sceneRO.disconnect(); cv._sceneRO = null; } };
  }, [biome]);
  return <canvas className="room-scene" ref={ref} />;
}

// View-root background (the dark biome base behind everything).
function biomeViewStyle(biome) {
  const th = window.QuestData.ROOM_THEME[biome];
  return { background: (th && th.base) || '' };
}

// .screen background. Rooms paint their own header over the terminal, so they
// skip the top scrim; hub/results screens add it so white headers stay legible.
function biomeScreenStyle(biome, { scrim = true } = {}) {
  const th = window.QuestData.ROOM_THEME[biome];
  if (!th) return {};
  return {
    background: (scrim ? TOP_SCRIM + ', ' : '') + th.bg,
    '--rs-accent': th.accent,
    '--bd': th.base,
  };
}

Object.assign(window, { BiomeScene, biomeViewStyle, biomeScreenStyle });
