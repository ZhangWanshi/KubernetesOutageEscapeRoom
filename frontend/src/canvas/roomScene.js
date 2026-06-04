/* roomScene.js — per-biome room backdrop renderer (window.RoomScene). */
(function () {
function mixHex(hex, to, t) {
    const a = hex.replace('#', ''), bb = to.replace('#', '');
    const ar = parseInt(a.slice(0, 2), 16), ag = parseInt(a.slice(2, 4), 16), ab = parseInt(a.slice(4, 6), 16);
    const br = parseInt(bb.slice(0, 2), 16), bg = parseInt(bb.slice(2, 4), 16), bl = parseInt(bb.slice(4, 6), 16);
    return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bl - ab) * t)})`;
  }
  // Unified per-biome room backdrop. Each biome is drawn with the same
  // low-poly vocabulary + exact biome palette as the island map, so every
  // room reads as standing inside its own island.
  function paintRoomScene(cv, b, biome) {
    if (!cv) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // ---- shared helpers ----
      const sky = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([p, c]) => g.addColorStop(p, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      const sun = (cx, cy, col, mid) => { const g = ctx.createRadialGradient(cx, cy, 16, cx, cy, Math.max(W, H) * 0.55); g.addColorStop(0, col); g.addColorStop(0.5, mid); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      const hill = (baseY, amp, col, seed = 0) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, baseY);
        for (let x = 0; x <= W; x += 28) { const y = baseY + Math.sin(x * 0.004 + baseY + seed) * amp + Math.sin(x * 0.013 + seed) * amp * 0.4; ctx.lineTo(x, y); } ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
      const floorFade = (y0, mid, end) => { const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, mid); g.addColorStop(1, end); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); };
      const particles = (col, n, w, h, sx, sy) => { ctx.fillStyle = col; for (let i = 0; i < n; i++) { const x = (i * sx) % W, y = (i * sy) % (H * 0.6); ctx.beginPath(); ctx.ellipse(x, y, w, h, i, 0, Math.PI * 2); ctx.fill(); } };
      const TR = '#5A3620';
      const pine = (x, y, s, c1, c2, a, cap) => {
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = mixHex(TR, '#10100A', (1 - a) * 0.5); ctx.fillRect(x - s * 0.07, y - s * 0.05, s * 0.14, s * 0.30);
        ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x, y - s * 0.60); ctx.lineTo(x - s * 0.56, y); ctx.lineTo(x + s * 0.56, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = mixHex(c1, c2, 0.45); ctx.beginPath(); ctx.moveTo(x, y - s * 0.92); ctx.lineTo(x - s * 0.45, y - s * 0.32); ctx.lineTo(x + s * 0.45, y - s * 0.32); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, y - s * 1.20); ctx.lineTo(x - s * 0.33, y - s * 0.66); ctx.lineTo(x + s * 0.33, y - s * 0.66); ctx.closePath(); ctx.fill();
        if (cap) { ctx.fillStyle = cap; // snow caps on each tier
          ctx.beginPath(); ctx.moveTo(x, y - s * 1.20); ctx.lineTo(x - s * 0.16, y - s * 0.92); ctx.lineTo(x + s * 0.16, y - s * 0.92); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x, y - s * 0.92); ctx.lineTo(x - s * 0.22, y - s * 0.60); ctx.lineTo(x + s * 0.22, y - s * 0.60); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      };
      const pineBand = (baseY, jit, size, count, c1, c2, a, cap) => {
        for (let i = 0; i < count; i++) { const x = (i + 0.5) * (W / count) + Math.sin(i * 12.9) * jit; const y = baseY + Math.sin(i * 3.3) * 14;
          const s = size * (0.8 + 0.4 * Math.abs(Math.sin(i * 7.7))); pine(x, y, s, c1, c2, a, cap); } };
      const TOP = b.top, TOPHI = b.topHi, EDGE = b.edge, RA = b.rockA, RB = b.rockB, RC = b.rockC, DK = b.dark;

      if (biome === 'forest') {
        sky([[0, '#2A6B47'], [0.22, '#205C3B'], [0.5, '#15482E'], [1, '#0B2417']]);
        sun(W * 0.5, H * 0.02, 'rgba(190,240,150,0.55)', 'rgba(140,210,120,0.14)');
        ctx.save(); ctx.globalCompositeOperation = 'soft-light';
        for (let i = -3; i < 4; i++) { const x0 = W * 0.5 + i * W * 0.09; ctx.fillStyle = 'rgba(215,248,185,0.13)';
          ctx.beginPath(); ctx.moveTo(x0, -40); ctx.lineTo(x0 + 30, -40); ctx.lineTo(x0 + 120, H * 0.6); ctx.lineTo(x0 + 70, H * 0.6); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        pineBand(H * 0.20, 24, Math.max(70, W * 0.07), 16, mixHex(TOP, '#2A6B47', 0.5), mixHex(EDGE, '#2A6B47', 0.55), 0.55);
        hill(H * 0.30, 16, mixHex(TOP, '#0B2417', 0.5));
        pineBand(H * 0.30, 38, Math.max(105, W * 0.11), 11, TOPHI, mixHex(EDGE, '#1A3A24', 0.2), 0.96);
        hill(H * 0.45, 22, mixHex(EDGE, '#0B2417', 0.42));
        pineBand(H * 0.45, 50, Math.max(130, W * 0.14), 8, mixHex(TOP, '#0B2417', 0.06), mixHex(EDGE, '#0B2417', 0.3), 1.0);
        floorFade(H * 0.42, '#0E2E1C', '#0A2114');
        particles('rgba(180,230,145,0.22)', 46, 4, 2.4, 137.3, 61.7);

      } else if (biome === 'snow') {
        sky([[0, '#43658A'], [0.24, '#365576'], [0.55, '#243F5A'], [1, '#152838']]);
        sun(W * 0.5, H * 0.03, 'rgba(220,238,255,0.55)', 'rgba(170,205,235,0.14)');
        const SNOW = '#EAF6FF';
        // ---- snow-capped mountain range (the room's defining feature) ----
        const mountain = (cx, baseY, w, peakY, rock, snowCol, snowFrac) => {
          // rock body
          ctx.fillStyle = rock;
          ctx.beginPath(); ctx.moveTo(cx - w, baseY); ctx.lineTo(cx - w * 0.18, peakY + (baseY - peakY) * 0.18);
          ctx.lineTo(cx, peakY); ctx.lineTo(cx + w * 0.22, peakY + (baseY - peakY) * 0.16); ctx.lineTo(cx + w, baseY); ctx.closePath(); ctx.fill();
          // snow cap with a jagged lower edge
          const capY = peakY + (baseY - peakY) * snowFrac;
          ctx.fillStyle = snowCol; ctx.beginPath(); ctx.moveTo(cx, peakY);
          ctx.lineTo(cx - w * 0.18 * snowFrac / 0.5, peakY + (baseY - peakY) * 0.18 * snowFrac / 0.5);
          ctx.lineTo(cx - w * 0.26, capY); ctx.lineTo(cx - w * 0.14, capY - (baseY - peakY) * 0.05);
          ctx.lineTo(cx - w * 0.04, capY + (baseY - peakY) * 0.04); ctx.lineTo(cx + w * 0.06, capY - (baseY - peakY) * 0.03);
          ctx.lineTo(cx + w * 0.18, capY); ctx.lineTo(cx + w * 0.22, peakY + (baseY - peakY) * 0.16); ctx.closePath(); ctx.fill();
          // shaded right face
          ctx.fillStyle = mixHex(rock, '#152838', 0.35); ctx.beginPath(); ctx.moveTo(cx, peakY);
          ctx.lineTo(cx + w * 0.22, peakY + (baseY - peakY) * 0.16); ctx.lineTo(cx + w, baseY); ctx.lineTo(cx + w * 0.30, baseY); ctx.closePath(); ctx.fill();
        };
        // far range, hazy
        mountain(W * 0.26, H * 0.46, W * 0.30, H * 0.12, mixHex(RB, '#365576', 0.45), mixHex(SNOW, '#365576', 0.35), 0.62);
        mountain(W * 0.72, H * 0.46, W * 0.34, H * 0.16, mixHex(RB, '#365576', 0.50), mixHex(SNOW, '#365576', 0.40), 0.60);
        // near range, bold
        mountain(W * 0.46, H * 0.56, W * 0.40, H * 0.06, mixHex(RB, '#243F5A', 0.15), SNOW, 0.55);
        mountain(W * 0.06, H * 0.58, W * 0.30, H * 0.18, mixHex(RA, '#243F5A', 0.2), mixHex(SNOW, '#cfe4f2', 0.0), 0.5);
        // mid snowy pines along the foothills
        hill(H * 0.50, 16, mixHex(SNOW, '#243F5A', 0.4));
        pineBand(H * 0.50, 38, Math.max(86, W * 0.09), 12, '#2F6B52', '#1C4536', 0.95, SNOW);
        // near pines on a snow drift
        hill(H * 0.60, 22, mixHex(SNOW, '#3A567A', 0.18));
        pineBand(H * 0.60, 50, Math.max(112, W * 0.12), 8, '#28614A', '#163A2C', 1.0, SNOW);
        // snow ground
        const g = ctx.createLinearGradient(0, H * 0.58, 0, H); g.addColorStop(0, 'rgba(220,238,252,0)'); g.addColorStop(0.4, '#CFE4F2'); g.addColorStop(1, '#A9CBE0');
        ctx.fillStyle = g; ctx.fillRect(0, H * 0.58, W, H * 0.42);
        particles('rgba(255,255,255,0.85)', 60, 2.4, 2.4, 97.3, 53.7);

      } else if (biome === 'desert') {
        sky([[0, '#F0B25E'], [0.26, '#DA8C46'], [0.58, '#9A5A30'], [1, '#3A2410']]);
        // low sun disc
        const sd = ctx.createRadialGradient(W * 0.5, H * 0.30, 8, W * 0.5, H * 0.30, H * 0.5);
        sd.addColorStop(0, 'rgba(255,238,190,0.9)'); sd.addColorStop(0.18, 'rgba(255,216,140,0.55)'); sd.addColorStop(0.5, 'rgba(230,150,80,0.16)'); sd.addColorStop(1, 'rgba(230,150,80,0)');
        ctx.fillStyle = sd; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,244,210,0.92)'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.30, Math.max(34, W * 0.035), 0, Math.PI * 2); ctx.fill();
        // mesa silhouettes
        const mesa = (x, w, top, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, top + 12); ctx.lineTo(x + w * 0.10, top); ctx.lineTo(x + w * 0.90, top); ctx.lineTo(x + w, top + 12); ctx.lineTo(x + w, H); ctx.closePath(); ctx.fill(); };
        mesa(W * 0.04, W * 0.30, H * 0.40, mixHex(RC, '#9A5A30', 0.5));
        mesa(W * 0.62, W * 0.42, H * 0.42, mixHex(RC, '#9A5A30', 0.55));
        // dunes
        hill(H * 0.52, 18, mixHex(TOP, '#6B4119', 0.30));
        hill(H * 0.62, 24, mixHex(TOP, '#6B4119', 0.12), 2);
        // saguaro cacti
        const saguaro = (x, y, s, col) => { ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.lineWidth = s * 0.22; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s); ctx.stroke();
          ctx.lineWidth = s * 0.15;
          ctx.beginPath(); ctx.moveTo(x, y - s * 0.55); ctx.lineTo(x - s * 0.32, y - s * 0.55); ctx.lineTo(x - s * 0.32, y - s * 0.82); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - s * 0.68); ctx.lineTo(x + s * 0.30, y - s * 0.68); ctx.lineTo(x + s * 0.30, y - s * 0.95); ctx.stroke(); ctx.restore(); };
        const cg = mixHex('#3E7A3A', '#244D22', 0.3), cd = mixHex('#2C5A2A', '#163216', 0.3);
        saguaro(W * 0.18, H * 0.70, Math.max(70, H * 0.16), cd);
        saguaro(W * 0.80, H * 0.74, Math.max(84, H * 0.18), cg);
        saguaro(W * 0.50, H * 0.80, Math.max(96, H * 0.20), cg);
        floorFade(H * 0.55, mixHex(TOP, '#6B4119', 0.2), '#2A1908');
        particles('rgba(255,230,170,0.16)', 30, 3, 1.6, 131.3, 71.7);

      } else if (biome === 'beach') {
        sky([[0, '#86D6DA'], [0.24, '#5BB0BE'], [0.5, '#3C8298'], [1, '#163039']]);
        sun(W * 0.72, H * 0.06, 'rgba(255,248,210,0.55)', 'rgba(180,230,225,0.14)');
        // ocean band
        const oc = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.62); oc.addColorStop(0, '#2E8FA0'); oc.addColorStop(1, '#1C6275');
        ctx.fillStyle = oc; ctx.fillRect(0, H * 0.38, W, H * 0.24);
        // wave glints
        ctx.strokeStyle = 'rgba(220,245,245,0.30)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) { const y = H * 0.40 + i * H * 0.028; ctx.beginPath(); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3); ctx.stroke(); }
        // sand foreground
        const sg = ctx.createLinearGradient(0, H * 0.56, 0, H); sg.addColorStop(0, mixHex(TOP, '#0B262C', 0.05)); sg.addColorStop(0.4, '#E4CE8E'); sg.addColorStop(1, '#C9AE68');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.60);
        for (let x = 0; x <= W; x += 28) ctx.lineTo(x, H * 0.60 + Math.sin(x * 0.005) * 14); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        // palm trees
        const palm = (x, base, s, lean) => { ctx.save(); ctx.translate(x, base); ctx.strokeStyle = '#6E4A2A'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.10;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean * s * 0.3, -s * 0.55, lean * s * 0.5, -s); ctx.stroke();
          const hx = lean * s * 0.5, hy = -s; ctx.fillStyle = mixHex('#3E8E4A', '#1F5A2A', 0.2);
          for (let k = 0; k < 6; k++) { const a = Math.PI + (k / 5) * Math.PI; const ex = hx + Math.cos(a) * s * 0.5, ey = hy + Math.sin(a) * s * 0.32;
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2 + Math.cos(a) * 6, (hy + ey) / 2 - 14, ex, ey); ctx.quadraticCurveTo((hx + ex) / 2, (hy + ey) / 2 - 2, hx, hy); ctx.fill(); }
          ctx.fillStyle = '#5A3A20'; ctx.beginPath(); ctx.arc(hx, hy, s * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
        palm(W * 0.16, H * 0.66, Math.max(150, H * 0.34), -1);
        palm(W * 0.86, H * 0.70, Math.max(168, H * 0.38), 1);
        particles('rgba(255,250,225,0.18)', 22, 3, 1.6, 149.3, 67.7);

      } else if (biome === 'ice') {
        sky([[0, '#5C8FAE'], [0.22, '#43708E'], [0.52, '#2C516C'], [1, '#152838']]);
        sun(W * 0.5, H * 0.04, 'rgba(210,240,255,0.5)', 'rgba(150,200,235,0.14)');
        // faint aurora
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) { const yy = H * (0.10 + i * 0.05); const g = ctx.createLinearGradient(0, yy - 30, 0, yy + 40);
          g.addColorStop(0, 'rgba(120,230,200,0)'); g.addColorStop(0.5, `rgba(120,230,200,${0.10 - i * 0.02})`); g.addColorStop(1, 'rgba(120,230,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yy + Math.sin(x * 0.006 + i) * 18); ctx.lineTo(W, yy + 60); ctx.lineTo(0, yy + 60); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        // ice spires (angular shards)
        const spire = (x, base, w, top, c1, c2) => { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x - w, base); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w * 0.15, top + (base - top) * 0.4); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill(); };
        // distant
        for (let i = 0; i < 7; i++) { const x = (i + 0.5) * (W / 7) + Math.sin(i * 9.1) * 30; spire(x, H * 0.40, Math.max(40, W * 0.045), H * (0.16 + 0.05 * Math.abs(Math.sin(i * 5))), mixHex(TOPHI, '#43708E', 0.4), mixHex(EDGE, '#2C516C', 0.4)); }
        hill(H * 0.42, 14, mixHex(TOPHI, '#2C516C', 0.3));
        // near
        for (let i = 0; i < 4; i++) { const x = (i + 0.5) * (W / 4) + Math.sin(i * 4.2) * 40; spire(x, H * 0.62, Math.max(72, W * 0.08), H * (0.30 + 0.06 * Math.abs(Math.sin(i * 3))), TOPHI, mixHex(EDGE, '#1A2D3D', 0.25)); }
        const g = ctx.createLinearGradient(0, H * 0.50, 0, H); g.addColorStop(0, 'rgba(180,224,244,0)'); g.addColorStop(0.4, '#BFE0F0'); g.addColorStop(1, '#8FBAD6');
        ctx.fillStyle = g; ctx.fillRect(0, H * 0.50, W, H * 0.50);
        particles('rgba(235,250,255,0.7)', 40, 2, 2, 113.3, 59.1);

      } else if (biome === 'volcanic') {
        sky([[0, '#4A1A12'], [0.30, '#331009'], [0.62, '#220A05'], [1, '#120403']]);
        // volcano glow from below
        const vg = ctx.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, H * 0.6);
        vg.addColorStop(0, 'rgba(255,140,40,0.45)'); vg.addColorStop(0.4, 'rgba(220,80,30,0.18)'); vg.addColorStop(1, 'rgba(220,80,30,0)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        // distant ridge
        hill(H * 0.42, 16, mixHex(RC, '#220A05', 0.4));
        // volcano cone
        const cx = W * 0.5, peak = H * 0.20, base = H * 0.70, hw = W * 0.34;
        ctx.fillStyle = mixHex('#2A0E0A', '#120403', 0.2); ctx.beginPath(); ctx.moveTo(cx - hw * 0.18, peak); ctx.lineTo(cx + hw * 0.18, peak); ctx.lineTo(cx + hw, base); ctx.lineTo(cx - hw, base); ctx.closePath(); ctx.fill();
        // crater glow
        const cg2 = ctx.createRadialGradient(cx, peak, 2, cx, peak, hw * 0.5); cg2.addColorStop(0, 'rgba(255,210,120,0.95)'); cg2.addColorStop(0.5, 'rgba(255,110,40,0.5)'); cg2.addColorStop(1, 'rgba(255,110,40,0)');
        ctx.fillStyle = cg2; ctx.beginPath(); ctx.ellipse(cx, peak + 4, hw * 0.22, 12, 0, 0, Math.PI * 2); ctx.fill();
        // lava streaks down the cone
        ctx.strokeStyle = 'rgba(255,120,40,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        [-0.4, 0.1, 0.5].forEach((d, i) => { ctx.beginPath(); ctx.moveTo(cx + d * 20, peak + 8);
          ctx.bezierCurveTo(cx + d * hw * 0.4, (peak + base) / 2, cx + d * hw * 0.8 + (i - 1) * 14, base * 0.85, cx + d * hw, base); ctx.stroke(); });
        // foreground lava field
        const lf = ctx.createLinearGradient(0, H * 0.62, 0, H); lf.addColorStop(0, '#3A140C'); lf.addColorStop(0.5, '#220A05'); lf.addColorStop(1, '#160503');
        ctx.fillStyle = lf; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.66);
        for (let x = 0; x <= W; x += 26) ctx.lineTo(x, H * 0.66 + Math.sin(x * 0.01) * 10); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        // glowing cracks in the lava field
        ctx.strokeStyle = 'rgba(255,130,40,0.8)'; ctx.lineWidth = 2.5;
        for (let i = 0; i < 6; i++) { const y = H * (0.74 + i * 0.04); ctx.beginPath(); for (let x = 0; x <= W; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.02 + i * 2) * 6); ctx.stroke(); }
        // rising embers
        ctx.fillStyle = 'rgba(255,170,70,0.85)';
        for (let i = 0; i < 44; i++) { const x = (i * 121.7) % W, y = H - ((i * 83.3) % (H * 0.75)); const r = 1 + (i % 3) * 0.8; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }

      // legibility scrim toward the bottom (under content cards)
      const vg2 = ctx.createLinearGradient(0, H * 0.55, 0, H);
      vg2.addColorStop(0, 'rgba(0,0,0,0)'); vg2.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = vg2; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    };
    draw();
    cv._drawScene = draw;
    // The view is often still hidden (0×0) when this first runs, so draw() bails.
    // Repaint across the next few frames so the scene appears the instant the
    // view is shown — no blank/dark-base flash where the backdrop looks missing.
    requestAnimationFrame(draw);
    requestAnimationFrame(() => requestAnimationFrame(draw));
    if (cv._sceneRO) cv._sceneRO.disconnect();
    cv._sceneRO = new ResizeObserver(draw);
    cv._sceneRO.observe(cv);
  }
  window.RoomScene = { paint: paintRoomScene, mixHex };
})();