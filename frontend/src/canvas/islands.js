/* islands.js — glossy low-poly biome island renderer
   Attaches window.Islands with palettes + draw functions.
   Design space is virtual px; caller sets up DPI transform. */
(function () {
  let STYLE = 'glossy'; // 'glossy' | 'flat' | 'toon'
  const OUTLINE = 'rgba(18,30,44,0.85)';
  // ── Biome palettes ────────────────────────────────────────────────
  // Each island keeps its biome look regardless of the sky theme.
  const BIOMES = {
    forest: {
      label: 'Forest', glow: [124, 222, 110],
      top: '#6CC24A', topHi: '#86D964', edge: '#4C9A30',
      rockA: '#7A4A2B', rockB: '#5C3520', rockC: '#42250F', dark: '#2E1909',
    },
    snow: {
      label: 'Snow Mountains', glow: [180, 232, 255],
      top: '#EAF6FF', topHi: '#FFFFFF', edge: '#BFE0F2',
      rockA: '#6E8FA6', rockB: '#4E6C82', rockC: '#36505F', dark: '#23394A',
    },
    desert: {
      label: 'Desert', glow: [255, 206, 110],
      top: '#E7C36B', topHi: '#F4D886', edge: '#C99B41',
      rockA: '#BE8240', rockB: '#925E29', rockC: '#6B4119', dark: '#48290E',
    },
    beach: {
      label: 'Beach', glow: [120, 226, 220],
      top: '#EBD79A', topHi: '#F6E8B6', edge: '#D6BD6E',
      rockA: '#4E8294', rockB: '#356273', rockC: '#244655', dark: '#163039',
    },
    ice: {
      label: 'Ice', glow: [150, 224, 255],
      top: '#C2E8F4', topHi: '#E6F7FD', edge: '#8FCBE0',
      rockA: '#5C7E96', rockB: '#3E5C72', rockC: '#2A4256', dark: '#1A2D3D',
    },
    volcanic: {
      label: 'Volcanic', glow: [255, 120, 50],
      top: '#5E2A22', topHi: '#7A3A2C', edge: '#3E1A14',
      rockA: '#5A241C', rockB: '#3E1712', rockC: '#2A0E0A', dark: '#180605',
    },
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── Float shadow on the ocean ─────────────────────────────────────
  function drawShadow(ctx, x, y, rx, sink) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y + sink, 4, x, y + sink, rx * 1.5);
    g.addColorStop(0, 'rgba(8,40,70,0.34)');
    g.addColorStop(1, 'rgba(8,40,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + sink, rx * 1.5, rx * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Faceted rock underside ────────────────────────────────────────
  function drawUnderside(ctx, x, y, rx, ry, depth, b) {
    // outline points around the hanging belly
    const P = [
      [x - rx, y],
      [x - rx * 0.74, y + depth * 0.5],
      [x - rx * 0.3, y + depth * 0.92],
      [x + rx * 0.18, y + depth],
      [x + rx * 0.62, y + depth * 0.66],
      [x + rx * 0.95, y + depth * 0.26],
      [x + rx, y],
    ];
    // base body — gradient (glossy) or flat fill
    if (STYLE === 'glossy') {
      const g = ctx.createLinearGradient(0, y, 0, y + depth);
      g.addColorStop(0, b.rockA); g.addColorStop(0.5, b.rockB); g.addColorStop(1, b.dark);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = b.rockB;
    }
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
    // close along the top ellipse
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, true);
    ctx.closePath();
    if (STYLE === 'toon') { ctx.lineJoin = 'round'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fill();

    // left shadow facet
    ctx.fillStyle = b.rockC;
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    ctx.lineTo(P[1][0], P[1][1]);
    ctx.lineTo(P[2][0], P[2][1]);
    ctx.lineTo(x - rx * 0.05, y + depth * 0.4);
    ctx.lineTo(x - rx * 0.5, y + ry * 0.4);
    ctx.closePath();
    ctx.fill();

    // bottom-center deep facet
    ctx.fillStyle = b.dark;
    ctx.beginPath();
    ctx.moveTo(P[2][0], P[2][1]);
    ctx.lineTo(P[3][0], P[3][1]);
    ctx.lineTo(x + rx * 0.05, y + depth * 0.5);
    ctx.lineTo(x - rx * 0.05, y + depth * 0.4);
    ctx.closePath();
    ctx.fill();

    // right light facet
    ctx.fillStyle = b.rockA;
    ctx.beginPath();
    ctx.moveTo(P[6][0], P[6][1]);
    ctx.lineTo(P[5][0], P[5][1]);
    ctx.lineTo(P[4][0], P[4][1]);
    ctx.lineTo(x + rx * 0.05, y + depth * 0.5);
    ctx.lineTo(x + rx * 0.5, y + ry * 0.5);
    ctx.closePath();
    ctx.fill();

    // a couple of small floating rock chips below for the floating feel
    ctx.fillStyle = b.rockB;
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.2, y + depth * 1.18);
    ctx.lineTo(x - rx * 0.05, y + depth * 1.05);
    ctx.lineTo(x + rx * 0.12, y + depth * 1.2);
    ctx.lineTo(x - rx * 0.02, y + depth * 1.34);
    ctx.closePath();
    ctx.fill();
  }

  // ── Top surface (grass/sand/snow cap) ─────────────────────────────
  function drawTop(ctx, x, y, rx, ry, b, biome) {
    // edge rim (the thickness ring just under the cap)
    ctx.fillStyle = b.edge;
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (STYLE === 'toon') { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke(); }
    // cap
    if (STYLE === 'glossy') {
      const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
      g.addColorStop(0, b.topHi); g.addColorStop(0.55, b.top); g.addColorStop(1, b.edge);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = b.top;
    }
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (STYLE === 'toon') { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke(); }
    // soft top sheen (glossy only)
    if (STYLE === 'glossy') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.18, y - ry * 0.35, rx * 0.62, ry * 0.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (biome === 'beach') {
      // turquoise shallow ring
      ctx.strokeStyle = 'rgba(120,226,220,0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(x, y + ry * 0.2, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Biome decorations ─────────────────────────────────────────────
  function tree(ctx, x, y, s, c1, c2) {
    ctx.fillStyle = '#5A3620';
    ctx.fillRect(x - s * 0.08, y - s * 0.1, s * 0.16, s * 0.4);
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.55, y - s * 0.1); ctx.lineTo(x + s * 0.55, y - s * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.15); ctx.lineTo(x - s * 0.42, y - s * 0.45); ctx.lineTo(x + s * 0.42, y - s * 0.45);
    ctx.closePath(); ctx.fill();
  }

  function drawDecor(ctx, x, y, rx, ry, biome, t) {
    ctx.save();
    if (biome === 'forest') {
      tree(ctx, x - rx * 0.55, y - ry * 0.2, 26, '#6CC24A', '#3F8C2C');
      tree(ctx, x - rx * 0.3, y + ry * 0.1, 20, '#7BD158', '#4C9A30');
      tree(ctx, x + rx * 0.6, y - ry * 0.1, 23, '#6CC24A', '#3F8C2C');
      // bushes
      ctx.fillStyle = '#4C9A30';
      [[x + rx * 0.3, y + ry * 0.35, 9], [x - rx * 0.05, y + ry * 0.5, 7]].forEach(([bx, by, br]) => {
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      });
    } else if (biome === 'snow') {
      ctx.fillStyle = '#FFFFFF';
      [[x - rx * 0.5, y, 16], [x + rx * 0.45, y - ry * 0.1, 13], [x + rx * 0.1, y + ry * 0.3, 10]].forEach(([mx, my, mr]) => {
        ctx.beginPath(); ctx.arc(mx, my, mr, Math.PI, 0); ctx.fill();
      });
      // pines with snow
      ctx.fillStyle = '#2E5E3C';
      [[x - rx * 0.2, y - ry * 0.15, 18], [x + rx * 0.55, y + ry * 0.05, 14]].forEach(([px, py, ps]) => {
        ctx.beginPath(); ctx.moveTo(px, py - ps); ctx.lineTo(px - ps * 0.45, py); ctx.lineTo(px + ps * 0.45, py); ctx.closePath(); ctx.fill();
      });
    } else if (biome === 'desert') {
      // cacti
      ctx.fillStyle = '#3F8C4C';
      const cactus = (cx, cy, h) => {
        ctx.fillRect(cx - 4, cy - h, 8, h);
        ctx.fillRect(cx - 12, cy - h * 0.7, 8, 4);
        ctx.fillRect(cx - 12, cy - h * 0.7, 4, h * 0.4);
        ctx.fillRect(cx + 4, cy - h * 0.55, 8, 4);
        ctx.fillRect(cx + 8, cy - h * 0.55, 4, h * 0.32);
      };
      cactus(x - rx * 0.5, y + ry * 0.2, 30);
      cactus(x + rx * 0.55, y, 22);
      // dunes
      ctx.strokeStyle = 'rgba(120,73,31,0.28)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * 6 - 6, y + ry * 0.3, rx * 0.4 - i * 6, ry * 0.25, 0, 0, Math.PI); ctx.stroke(); }
    } else if (biome === 'beach') {
      // palm
      const px = x - rx * 0.45, py = y + ry * 0.05;
      ctx.strokeStyle = '#9A6B3A'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 22, px + 16, py - 34); ctx.stroke();
      ctx.fillStyle = '#3FA86A';
      for (let a = 0; a < 5; a++) {
        const ang = -Math.PI / 2 + (a - 2) * 0.6;
        ctx.beginPath(); ctx.moveTo(px + 16, py - 34);
        ctx.quadraticCurveTo(px + 16 + Math.cos(ang) * 16, py - 34 + Math.sin(ang) * 16, px + 16 + Math.cos(ang) * 30, py - 30 + Math.sin(ang) * 22);
        ctx.lineWidth = 7; ctx.strokeStyle = '#3FA86A'; ctx.stroke();
      }
      // umbrella
      ctx.fillStyle = '#FF6B5E';
      ctx.beginPath(); ctx.arc(x + rx * 0.4, y + ry * 0.1, 16, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#7A4A2B'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + rx * 0.4, y + ry * 0.1); ctx.lineTo(x + rx * 0.4, y + ry * 0.5); ctx.stroke();
    } else if (biome === 'ice') {
      // crystals
      const cryst = (cx, cy, h, w) => {
        ctx.fillStyle = 'rgba(180,232,255,0.85)';
        ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx - w, cy - h * 0.3); ctx.lineTo(cx - w * 0.5, cy); ctx.lineTo(cx + w * 0.5, cy); ctx.lineTo(cx + w, cy - h * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx - w, cy - h * 0.3); ctx.lineTo(cx - w * 0.5, cy); ctx.closePath(); ctx.fill();
      };
      cryst(x - rx * 0.45, y + ry * 0.1, 34, 12);
      cryst(x + rx * 0.5, y, 24, 9);
      cryst(x + rx * 0.05, y + ry * 0.35, 18, 7);
    } else if (biome === 'volcanic') {
      // volcano cone
      ctx.fillStyle = '#3E1A14';
      ctx.beginPath(); ctx.moveTo(x - 26, y + ry * 0.2); ctx.lineTo(x - 9, y - 34); ctx.lineTo(x + 9, y - 34); ctx.lineTo(x + 26, y + ry * 0.2); ctx.closePath(); ctx.fill();
      // crater glow
      const cg = ctx.createRadialGradient(x, y - 34, 1, x, y - 34, 14);
      cg.addColorStop(0, 'rgba(255,200,60,0.95)'); cg.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, y - 34, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      // lava cracks on top
      ctx.strokeStyle = '#FF5A2A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.6, y + ry * 0.1); ctx.lineTo(x - rx * 0.2, y - ry * 0.1); ctx.lineTo(x + rx * 0.3, y + ry * 0.2); ctx.lineTo(x + rx * 0.7, y - ry * 0.05);
      ctx.stroke();
      // embers
      for (let i = 0; i < 4; i++) {
        const ex = x - 20 + i * 14, ph = i * 1.7;
        const ea = 0.4 + 0.4 * Math.sin(t * 3 + ph);
        ctx.fillStyle = `rgba(255,150,40,${ea})`;
        ctx.beginPath(); ctx.arc(ex, y - 40 - (Math.sin(t * 2 + ph) * 8 + 8), 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Center structure (challenge portal) ───────────────────────────
  function drawPortal(ctx, x, y, ry, status, idx, t, accents) {
    const cx = x, cy = y - ry * 0.4;
    // pedestal
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 6, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E9EEF5';
    rr(ctx, cx - 18, cy - 4, 36, 12, 5); ctx.fill();
    ctx.fillStyle = '#C6D2DF';
    rr(ctx, cx - 18, cy + 4, 36, 5, 3); ctx.fill();

    // orb color by status
    const col = {
      available: accents.gold, attempted: accents.coral,
      completed: '#5FD08A', failed: '#E2554A', locked: '#8FA0B2',
    }[status] || accents.gold;

    if (status === 'available' || status === 'attempted') {
      const pa = 0.5 + 0.5 * Math.sin(t * 2.4 + idx);
      const gg = ctx.createRadialGradient(cx, cy - 22, 2, cx, cy - 22, 34);
      gg.addColorStop(0, `rgba(255,255,255,${0.35 * pa})`);
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy - 22, 34, 0, Math.PI * 2); ctx.fill();
    }
    // orb
    // soft dark contrast halo (keeps the orb legible on snow/ice)
    ctx.fillStyle = 'rgba(16,28,42,0.16)';
    ctx.beginPath(); ctx.arc(cx, cy - 21, 18, 0, Math.PI * 2); ctx.fill();
    const og = ctx.createRadialGradient(cx - 4, cy - 26, 2, cx, cy - 22, 18);
    og.addColorStop(0, '#FFFFFF');
    og.addColorStop(0.4, col);
    og.addColorStop(1, shade(col, -0.25));
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(cx, cy - 22, 15, 0, Math.PI * 2); ctx.fill();
    // ring
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy - 22, 15, 0, Math.PI * 2); ctx.stroke();

    if (status === 'locked') {
      ctx.fillStyle = 'rgba(20,38,58,0.55)';
      ctx.beginPath(); ctx.arc(cx, cy - 22, 15, 0, Math.PI * 2); ctx.fill();
      // padlock
      ctx.fillStyle = '#E9EEF5';
      rr(ctx, cx - 6, cy - 24, 12, 10, 2); ctx.fill();
      ctx.strokeStyle = '#E9EEF5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy - 24, 4, Math.PI, 0); ctx.stroke();
    } else {
      ctx.fillStyle = '#16263A';
      ctx.font = '700 14px Fredoka, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(idx, cx, cy - 21);
    }
  }

  function shade(hex, amt) {
    const c = hex.replace('#', '');
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    r = Math.max(0, Math.min(255, Math.round(r + r * amt)));
    g = Math.max(0, Math.min(255, Math.round(g + g * amt)));
    b = Math.max(0, Math.min(255, Math.round(b + b * amt)));
    return `rgb(${r},${g},${b})`;
  }

  window.Islands = { BIOMES, rr, shade, drawShadow, drawUnderside, drawTop, drawDecor, drawPortal, setStyle: (s) => { STYLE = s; }, getStyle: () => STYLE };
})();