/* mapScene.js — the island-map hub scene (canvas renderer).
   React owns game state; this module only DRAWS it.
     MapScene.init(canvas, { onEnter, getRooms, getTweaks }) -> teardown fn
   getRooms()  -> current rooms array (from React state)
   getTweaks() -> { sky, count, layout, avatar }
   Exposes seed data + palettes for React to consume. */
(function () {
  const I = window.Islands;
  let W = 1120, H = 660;

  const AVPAL = {
    Dana: { bg: '#2E86DE', i: 'D' }, Sam: { bg: '#2BB673', i: 'S' },
    Nina: { bg: '#9B59B6', i: 'N' }, Carl: { bg: '#E67E22', i: 'C' },
    Omar: { bg: '#16A39A', i: 'O' }, Dev: { bg: '#E2554A', i: 'V' },
  };
  window.AVPAL = AVPAL;

  const ACCENTS = { gold: '#FFCE3A', coral: '#FF6B5E', navy: '#16263A' };

  const SKIES = {
    tropical: { a: '#56D6F2', b: '#2FB8DE', c: '#1690C0', wave: 'rgba(255,255,255,0.12)', deep: 'rgba(10,70,110,0.30)' },
    dusk: { a: '#4A4E9C', b: '#6E5AA8', c: '#9A5E98', wave: 'rgba(255,214,184,0.09)', deep: 'rgba(20,18,50,0.40)' },
    night: { a: '#1B3048', b: '#1E3A52', c: '#0E1C2C', wave: 'rgba(150,200,255,0.07)', deep: 'rgba(5,12,22,0.50)' },
    sunset: { a: '#3FC0C8', b: '#4A86B4', c: '#6A5EA0', wave: 'rgba(255,222,180,0.08)', deep: 'rgba(20,30,70,0.36)' },
  };

  const ROOMS_INIT = [
    { id: 'r1', title: 'The Crashing Pod',    domain: 'Containers',       diff: 'Easy',   biome: 'forest',   status: 'available', score: 0, chars: [] },
    { id: 'r2', title: 'The Silent Service',   domain: 'Microservices',    diff: 'Easy',   biome: 'snow',     status: 'locked',    score: 0, chars: [] },
    { id: 'r3', title: 'The Vanishing Secret', domain: 'Config & Secrets', diff: 'Medium', biome: 'desert',   status: 'locked',    score: 0, chars: [] },
    { id: 'r4', title: 'The Broken Rollout',   domain: 'Deployments',      diff: 'Medium', biome: 'beach',    status: 'locked',    score: 0, chars: [] },
    { id: 'r5', title: 'The Starving Pod',     domain: 'Resource Limits',  diff: 'Hard',   biome: 'ice',      status: 'locked',    score: 0, chars: [] },
    { id: 'r6', title: 'The Lava Boss', domain: 'Observability', diff: 'Hard', biome: 'volcanic', status: 'locked', score: 0, chars: [] },
  ];

  // React supplies these via init(); these are safe defaults.
  let getRooms = () => ROOMS_INIT;
  let getTweaks = () => ({ sky: 'tropical', count: 6, layout: 'winding', avatar: 'circle' });
  const TW = () => getTweaks();

  let canvas, ctx, onEnter, hovId = null, t = 0, dpr = 1, rafId = null;
  const listeners = [];

  // ── Layout generators ─────────────────────────────────────────────
  function layoutPos(i, n) {
    const m = W * 0.155;
    const x = m + (n === 1 ? (W - 2 * m) / 2 : i * (W - 2 * m) / (n - 1));
    if (TW().layout === 'arc') {
      const y = H * 0.74 - H * 0.40 * Math.sin((n === 1 ? 0.5 : i / (n - 1)) * Math.PI);
      return { x, y };
    }
    // winding wave
    const y = H * 0.50 + H * 0.26 * Math.sin(i * 1.05 + 0.5);
    return { x, y };
  }
  function activeRooms() { return getRooms().slice(0, TW().count); }

  // ── Ocean ─────────────────────────────────────────────────────────
  function drawOcean() {
    const s = SKIES[TW().sky] || SKIES.tropical;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, s.a); g.addColorStop(0.55, s.b); g.addColorStop(1, s.c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // depth wash lower
    const dg = ctx.createLinearGradient(0, H * 0.5, 0, H);
    dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, s.deep);
    ctx.fillStyle = dg; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    // chevron wave texture (reference look)
    ctx.strokeStyle = s.wave; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const drift = (t * 8) % 56;
    for (let ry = 70, row = 0; ry < H; ry += 46, row++) {
      const off = (row % 2 ? 28 : 0) + drift;
      for (let rx = -56; rx < W + 56; rx += 56) {
        const cx = rx + off;
        ctx.beginPath();
        ctx.moveTo(cx, ry);
        ctx.quadraticCurveTo(cx + 7, ry - 5, cx + 14, ry);
        ctx.quadraticCurveTo(cx + 21, ry + 5, cx + 28, ry);
        ctx.stroke();
      }
    }
  }

  // ── Path between islands ──────────────────────────────────────────
  function drawPath(p0, p1, locked) {
    const cx = (p0.x + p1.x) / 2, cy = (p0.y + p1.y) / 2 + 46;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y + 18);
    ctx.quadraticCurveTo(cx, cy, p1.x, p1.y + 18);
    if (!locked) {
      ctx.setLineDash([2, 14]); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = ACCENTS.gold; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.setLineDash([2, 14]); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }

  // ── Avatars ───────────────────────────────────────────────────────
  function drawAvatar(x, y, cid) {
    const av = AVPAL[cid]; if (!av) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(x, y + 13, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (TW().avatar === 'pin') {
      ctx.fillStyle = av.bg;
      ctx.beginPath();
      ctx.arc(x, y - 4, 11, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.lineTo(x, y + 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = av.bg; ctx.font = '700 8px Fredoka, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(av.i, x, y - 4);
    } else if (TW().avatar === 'squircle') {
      ctx.fillStyle = av.bg; I.rr(ctx, x - 12, y - 12, 24, 24, 8); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; I.rr(ctx, x - 12, y - 12, 24, 24, 8); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 11px Fredoka, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(av.i, x, y);
    } else {
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = av.bg; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 11px Fredoka, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(av.i, x, y);
    }
    ctx.restore();
  }

  function drawAvatars(x, y, chars) {
    const vis = chars.slice(0, 3), extra = chars.length - 3;
    const startX = x - (vis.length - 1) * 24 / 2;
    vis.forEach((cid, i) => drawAvatar(startX + i * 24, y, cid));
    if (extra > 0) {
      const bx = startX + vis.length * 24;
      ctx.fillStyle = '#3A4A5C'; ctx.beginPath(); ctx.arc(bx, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 9px Fredoka, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+' + extra, bx, y);
    }
  }

  // ── Island node ───────────────────────────────────────────────────
  function drawNode(room, pos, idx, hov) {
    const b = I.BIOMES[room.biome] || I.BIOMES.forest;
    const { x, y } = pos;
    const rx = 64, ry = 17, depth = 74;
    const bob = Math.sin(t * 1.1 + idx * 0.9) * 4;
    const yy = y + bob;
    const dim = room.status === 'locked';

    I.drawShadow(ctx, x, y, rx, depth + 30 - bob);
    ctx.save();
    if (dim) ctx.globalAlpha = 0.62;
    I.drawUnderside(ctx, x, yy, rx, ry, depth, b);
    I.drawTop(ctx, x, yy, rx, ry, b, room.biome);
    I.drawDecor(ctx, x, yy, rx, ry, room.biome, t);
    I.drawPortal(ctx, x, yy, ry, room.status, idx + 1, t, ACCENTS);
    ctx.restore();

    if (!dim) drawAvatars(x, yy - ry - 30, room.chars);

    // stars for completed
    if (room.status === 'completed') {
      ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < room.score ? ACCENTS.gold : 'rgba(255,255,255,0.35)';
        star(x - 16 + i * 16, yy + depth + 16, 7, i < room.score);
      }
    }
    return yy;
  }

  function star(cx, cy, r, filled) {
    ctx.save(); ctx.translate(cx, cy); ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? ACCENTS.gold : 'rgba(255,255,255,0.32)';
    ctx.fill();
    if (filled) { ctx.strokeStyle = '#E0A91F'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }

  // ── Hover nameplate ───────────────────────────────────────────────
  function drawPlate(room, pos, topY) {
    const { x } = pos;
    const NH = 62;
    const dc = { Easy: '#3FB36B', Medium: '#E8A904', Hard: '#E23B2E' }[room.diff] || '#8FA0B2';
    const pc = { available: ACCENTS.gold, attempted: ACCENTS.coral, completed: '#5FD08A', failed: '#E2554A' }[room.status] || '#8FA0B2';
    const pt = { available: 'Available', attempted: 'In progress', completed: 'Completed', failed: 'Failed' }[room.status] || room.status;

    // measure to size the plate so nothing overlaps
    ctx.font = '600 15px Fredoka, sans-serif';
    const titleW = ctx.measureText(room.title).width;
    ctx.font = '600 11px Nunito, sans-serif';
    const domW = ctx.measureText(room.domain.toUpperCase()).width;
    ctx.font = '800 10px Nunito, sans-serif';
    const statusW = ctx.measureText(pt).width + 16;
    const diffW = ctx.measureText(room.diff.toUpperCase()).width + 16;
    const pillsW = statusW + 8 + diffW;
    const NW = Math.max(196, 18 + Math.max(titleW, domW, pillsW) + 18);

    let ty = topY - 92; if (ty < 8) ty = topY + 60;
    const tx = Math.max(8, Math.min(W - NW - 8, x - NW / 2));
    ctx.save();
    ctx.shadowColor = 'rgba(8,30,55,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF'; I.rr(ctx, tx, ty, NW, NH, 14); ctx.fill();
    ctx.shadowColor = 'transparent';
    // accent top strip
    const b = I.BIOMES[room.biome];
    ctx.fillStyle = b.top; I.rr(ctx, tx, ty, 6, NH, 14); ctx.fill();
    ctx.fillStyle = b.top; ctx.fillRect(tx + 3, ty, 4, NH);

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = ACCENTS.navy; ctx.font = '600 15px Fredoka, sans-serif';
    ctx.fillText(room.title, tx + 18, ty + 10);
    ctx.fillStyle = '#6B7C8F'; ctx.font = '600 11px Nunito, sans-serif';
    ctx.fillText(room.domain.toUpperCase(), tx + 18, ty + 31);

    // status + difficulty pills on one row
    ctx.font = '800 10px Nunito, sans-serif';
    ctx.fillStyle = pc; I.rr(ctx, tx + 18, ty + 45, statusW, 14, 7); ctx.fill();
    ctx.fillStyle = room.status === 'available' ? ACCENTS.navy : '#fff';
    ctx.textBaseline = 'middle'; ctx.fillText(pt, tx + 26, ty + 52.5);
    // difficulty chip (tinted) right after the status pill
    const dx = tx + 18 + statusW + 8;
    ctx.fillStyle = dc; I.rr(ctx, dx, ty + 45, diffW, 14, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(room.diff.toUpperCase(), dx + 8, ty + 52.5);
    ctx.restore();
  }

  // ── Render ────────────────────────────────────────────────────────
  function render() {
    resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawOcean();
    const rms = activeRooms();
    const positions = rms.map((_, i) => layoutPos(i, rms.length));
    // paths
    for (let i = 0; i < rms.length - 1; i++) {
      const locked = rms[i + 1].status === 'locked';
      drawPath(positions[i], positions[i + 1], locked);
    }
    // nodes back-to-front by y
    const order = rms.map((r, i) => i).sort((a, b) => positions[a].y - positions[b].y);
    const topYs = {};
    order.forEach((i) => { topYs[i] = drawNode(rms[i], positions[i], i, hovId === rms[i].id); });
    // hovered plate on top
    const hi = rms.findIndex((r) => r.id === hovId);
    if (hi >= 0 && rms[hi].status !== 'locked') drawPlate(rms[hi], positions[hi], topYs[hi]);
  }

  // ── Interaction ───────────────────────────────────────────────────
  function toLocal(e) {
    const rc = canvas.getBoundingClientRect();
    return { mx: (e.clientX - rc.left) * (W / rc.width), my: (e.clientY - rc.top) * (H / rc.height) };
  }
  function hitRoom(mx, my) {
    const rms = activeRooms();
    const positions = rms.map((_, i) => layoutPos(i, rms.length));
    for (let i = rms.length - 1; i >= 0; i--) {
      const { x, y } = positions[i];
      const dx = mx - x, dy = my - (y + 8);
      if ((dx * dx) / (70 * 70) + (dy * dy) / (56 * 56) <= 1) return rms[i];
    }
    return null;
  }

  function on(target, type, fn) { target.addEventListener(type, fn); listeners.push([target, type, fn]); }

  function init(cv, opts) {
    canvas = cv; ctx = cv.getContext('2d'); onEnter = opts.onEnter;
    if (opts.getRooms) getRooms = opts.getRooms;
    if (opts.getTweaks) getTweaks = opts.getTweaks;
    resize();
    on(window, 'resize', resize);
    on(canvas, 'mousemove', (e) => {
      const { mx, my } = toLocal(e); const r = hitRoom(mx, my);
      hovId = r ? r.id : null;
      canvas.style.cursor = r ? (r.status === 'locked' ? 'not-allowed' : 'pointer') : 'default';
    });
    on(canvas, 'mouseleave', () => { hovId = null; });
    on(canvas, 'click', (e) => {
      const { mx, my } = toLocal(e); const r = hitRoom(mx, my);
      if (r && r.status !== 'locked' && onEnter) onEnter(r);
    });
    let last = 0;
    function loop(ts) { const dt = Math.min((ts - last) / 1000, 0.05); last = ts; t += dt; if (canvas.offsetParent !== null) render(); rafId = requestAnimationFrame(loop); }
    rafId = requestAnimationFrame((ts) => { last = ts; rafId = requestAnimationFrame(loop); });
    return stop;
  }

  function stop() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
    listeners.length = 0;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const host = canvas.parentElement || canvas;
    const cw = host.clientWidth, ch = host.clientHeight;
    if (!cw || !ch) return; // hidden — keep last good size
    W = cw; H = ch;
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  }

  window.MapScene = { init, stop, ACCENTS, AVPAL, SKIES, ROOMS_INIT };
})();
