/* icons.jsx — shared visual primitives (stars, avatar/biome/difficulty chips,
   terminal lines). Mirrors the original ICONS/avChip/biomeChip/diffPill helpers
   as real components. Exported to window for the other component files. */

function Star({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill={filled ? '#FFCE3A' : 'none'}
         stroke={filled ? '#E0A91F' : 'rgba(255,255,255,.4)'} strokeWidth="1.6">
      <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.4 21l1.4-7L1.6 9.3l7-.8z" />
    </svg>
  );
}

function AvatarChip({ cid, size = 30 }) {
  const a = (window.AVPAL || {})[cid];
  if (!a) return null;
  return (
    <span className="avc" title={cid}
          style={{ width: size, height: size, background: a.bg, fontSize: size * 0.42 }}>
      {a.i}
    </span>
  );
}

function BiomeChip({ biome }) {
  const b = window.Islands.BIOMES[biome];
  return (
    <span className="biome-chip"
          style={{ background: 'rgba(10,20,14,.66)', color: '#fff',
                   boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)' }}>
      <i style={{ background: b.top }} />{b.label}
    </span>
  );
}

const DIFF_COLOR = { Easy: '#3FB36B', Medium: '#E8A904', Hard: '#E23B2E' };
function DiffPill({ d }) {
  const c = DIFF_COLOR[d] || '#8FA0B2';
  return (
    <span className="pill"
          style={{ background: c, color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)' }}>
      {d}
    </span>
  );
}

// terminal line → coloured span (matches the original termLine classifier)
function termClass(l) {
  if (l.startsWith('$')) return 't-cmd';
  if (/error|fail|missing|none|timed out|required|CrashLoop|Pending|unknown/i.test(l)) return 't-err';
  return 't-out';
}
function TermLines({ lines }) {
  return (
    <pre>{lines.map((l, i) => (
      <span key={i} className={termClass(l)}>{l}{i < lines.length - 1 ? '\n' : ''}</span>
    ))}</pre>
  );
}

// the room the player is mid-way through — used for hub backdrops
function inProgressRoom(rooms) {
  return rooms.find((r) => r.status === 'attempted')
    || rooms.find((r) => r.status === 'available')
    || [...rooms].reverse().find((r) => r.status === 'completed')
    || rooms[0];
}

Object.assign(window, { Star, AvatarChip, BiomeChip, DiffPill, TermLines, termClass, inProgressRoom });
