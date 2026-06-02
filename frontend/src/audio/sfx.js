/* sfx.js — toggleable UI sound effects (offline-rendered WAV → <audio>). */
const Sfx = (function () {
    let enabled = localStorage.getItem('k8s_sound') !== 'off';
    // IMPORTANT: the raw WebAudio "oscillator → AudioContext.destination" path is
    // silent on some setups (the context reports "running" and the graph carries
    // signal, but nothing reaches the output device). The room ambience works
    // because it plays through an <audio> element instead. So we do the same here:
    // render each effect OFFLINE into a tiny WAV (pure computation — always works,
    // no gesture or live context needed) and play it back through an <audio>
    // element, the path proven to be audible in this environment.

    const SR = 44100;
    // Original sound design (timbre/pattern) — restored. Only the playback path
    // changed (offline-rendered WAV → <audio> element) so it's actually audible.
    const PATTERNS = {
      // [freq, startSec, durSec, vol, type]
      nav: [[720, 0.00, 0.07, 0.156, 'sine'], [1080, 0.05, 0.09, 0.12, 'sine']],
      enter: [[440, 0.00, 0.10, 0.06, 'triangle'], [660, 0.07, 0.12, 0.05, 'triangle']],
      win: [[659, 0.00, 0.18, 0.05, 'triangle'], [784, 0.10, 0.18, 0.05, 'triangle'], [1047, 0.20, 0.18, 0.05, 'triangle']],
      lose: [[330, 0.00, 0.18, 0.06, 'sawtooth'], [247, 0.12, 0.22, 0.05, 'sawtooth']],
      click: [[520, 0.00, 0.08, 0.05, 'triangle']],
    };

    // ---- offline render of a pattern into an AudioBuffer ----
    function renderBuffer(pattern) {
      let end = 0;
      pattern.forEach(([, s, d]) => { end = Math.max(end, s + d); });
      const len = Math.ceil((end + 0.05) * SR);
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const off = new OAC(1, len, SR);
      const out = off.createGain(); out.gain.value = 0.9; out.connect(off.destination);
      pattern.forEach(([f, start, dur, vol, type]) => {
        const o = off.createOscillator(), g = off.createGain();
        o.type = type || 'triangle'; o.frequency.setValueAtTime(f, start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g).connect(out); o.start(start); o.stop(start + dur + 0.02);
      });
      return off.startRendering();
    }

    // ---- AudioBuffer (mono float) → 16-bit PCM WAV Blob ----
    function bufferToWavBlob(buf) {
      const ch = buf.getChannelData(0), n = ch.length;
      const ab = new ArrayBuffer(44 + n * 2), dv = new DataView(ab);
      const ws = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
      ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE');
      ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
      ws(36, 'data'); dv.setUint32(40, n * 2, true);
      let off = 44;
      for (let i = 0; i < n; i++) { let v = Math.max(-1, Math.min(1, ch[i])); dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true); off += 2; }
      return new Blob([ab], { type: 'audio/wav' });
    }

    // ---- pre-rendered object URLs + a small <audio> pool per kind ----
    const urls = {}, pools = {};
    function prepare() {
      Object.keys(PATTERNS).forEach((kind) => {
        if (urls[kind]) return;
        try {
          renderBuffer(PATTERNS[kind]).then((buf) => {
            urls[kind] = URL.createObjectURL(bufferToWavBlob(buf));
            const pool = []; for (let i = 0; i < 4; i++) { const a = new Audio(urls[kind]); a.preload = 'auto'; pool.push(a); }
            pools[kind] = { pool, i: 0 };
          }).catch(() => {});
        } catch (e) { /* OfflineAudioContext unavailable */ }
      });
    }
    prepare();

    function play(kind) {
      if (!enabled) return;
      kind = PATTERNS[kind] ? kind : 'click';
      const p = pools[kind];
      if (p) {
        const el = p.pool[p.i = (p.i + 1) % p.pool.length];
        try { el.currentTime = 0; el.volume = 1; const r = el.play(); if (r && r.catch) r.catch(() => {}); return; } catch (e) {}
      }
      // fallback: a fresh element straight from the URL
      if (urls[kind]) { try { const a = new Audio(urls[kind]); a.play().catch(() => {}); } catch (e) {} }
    }

    return {
      play,
      isOn: () => enabled,
      set(v) {
        enabled = v; localStorage.setItem('k8s_sound', v ? 'on' : 'off');
        if (window.Ambience) Ambience.setEnabled(v);
        if (v) play('click');
      },
      _debug: () => ({ ready: Object.keys(urls), pooled: Object.keys(pools) }),
    };
  })();
window.Sfx = Sfx;