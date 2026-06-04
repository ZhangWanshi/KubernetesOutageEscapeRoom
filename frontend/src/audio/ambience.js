/* ambience.js — generative/looped room soundscapes (window.Ambience). */
const Ambience = (function () {
    const MAP = { r1: 'forest' };
    let actx = null, master = null, echo = null, voices = [], timers = [], current = null, noiseBuf = null, audioEl = null, fadeRAF = null;
    const getCtx = () => { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } return actx; };
    const at = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    function noiseSrc(a) {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
    }

    // a cricket: bandpassed noise pulsed fast by an LFO (the trill)
    function cricketVoice(a, freq, q, rate, vol) {
      const src = noiseSrc(a);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const trem = a.createGain(); trem.gain.value = 0.5;
      const lfo = a.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = rate;
      const lfoAmt = a.createGain(); lfoAmt.gain.value = 0.5;
      lfo.connect(lfoAmt).connect(trem.gain);
      const out = a.createGain(); out.gain.value = vol;
      src.connect(bp).connect(trem).connect(out).connect(master);
      src.start(); lfo.start();
      return () => { try { src.stop(); lfo.stop(); } catch (e) {} };
    }

    // low wind bed: lowpassed noise that slowly gusts (the dark forest air)
    function windBed(a) {
      const src = noiseSrc(a);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.5;
      const g = a.createGain(); g.gain.value = 0.11;
      const lfo = a.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
      const lfoAmt = a.createGain(); lfoAmt.gain.value = 0.07;
      lfo.connect(lfoAmt).connect(g.gain);
      src.connect(lp).connect(g).connect(master);
      src.start(); lfo.start();
      return () => { try { src.stop(); lfo.stop(); } catch (e) {} };
    }

    // ominous detuned low drone — the dread underneath everything
    function droneVoice(a, freq) {
      const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const g = a.createGain(); g.gain.value = 0.05;
      const lfo = a.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.06 + Math.random() * 0.05;
      const lfoAmt = a.createGain(); lfoAmt.gain.value = 0.025;
      lfo.connect(lfoAmt).connect(g.gain);
      o.connect(g).connect(master);
      o.start(); lfo.start();
      return () => { try { o.stop(); lfo.stop(); } catch (e) {} };
    }

    // high dissonant shimmer — the "something doesn't feel right" unease
    function shimmer(a, freq, vol) {
      const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const g = a.createGain(); g.gain.value = 0;
      const lfo = a.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.04 + Math.random() * 0.05;
      const lfoAmt = a.createGain(); lfoAmt.gain.value = vol;
      lfo.connect(lfoAmt).connect(g.gain);
      o.connect(g).connect(master);
      o.start(); lfo.start();
      return () => { try { o.stop(); lfo.stop(); } catch (e) {} };
    }

    // a distant owl hoot — a low "hoo… hoo" (echoed)
    function owl(a, when) {
      [0, 0.55 + Math.random() * 0.2].forEach((off) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine';
        const base = 300 + Math.random() * 70, t0 = when + off;
        o.frequency.setValueAtTime(base * 1.18, t0);
        o.frequency.exponentialRampToValueAtTime(base, t0 + 0.12);
        o.frequency.exponentialRampToValueAtTime(base * 0.92, t0 + 0.45);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.06);
        g.gain.setValueAtTime(0.05, t0 + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.5);
        o.connect(g); g.connect(master); if (echo) g.connect(echo);
        o.start(t0); o.stop(t0 + 0.6);
      });
    }

    // a lonely wolf-like howl that rises, holds, falls — with vibrato + echo
    function howl(a, when) {
      const o = a.createOscillator(); o.type = 'sawtooth';
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850;
      const g = a.createGain();
      const dur = 1.8 + Math.random() * 1.1, f0 = 150 + Math.random() * 45;
      o.frequency.setValueAtTime(f0, when);
      o.frequency.exponentialRampToValueAtTime(f0 * 2, when + dur * 0.35);
      o.frequency.setValueAtTime(f0 * 2, when + dur * 0.6);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.85, when + dur);
      const vib = a.createOscillator(); vib.type = 'sine'; vib.frequency.value = 5.5;
      const vibAmt = a.createGain(); vibAmt.gain.value = 7;
      vib.connect(vibAmt).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.07, when + 0.4);
      g.gain.setValueAtTime(0.07, when + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0006, when + dur);
      o.connect(lp).connect(g); g.connect(master); if (echo) g.connect(echo);
      o.start(when); o.stop(when + dur + 0.1);
      vib.start(when); vib.stop(when + dur + 0.1);
    }

    // a low creature hum that swells out of the dark and fades
    function hum(a, when) {
      const dur = 2.4 + Math.random() * 2;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.05, when + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      g.connect(lp).connect(master);
      [88, 91.5].forEach((f) => { const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f + Math.random() * 4; o.connect(g); o.start(when); o.stop(when + dur + 0.1); });
    }

    // a single crunch underfoot
    function crunch(a, when, vol) {
      const src = noiseSrc(a);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850 + Math.random() * 600; bp.Q.value = 1.1;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0004, when + 0.16);
      src.connect(bp).connect(g).connect(master);
      src.start(when); src.stop(when + 0.2);
    }

    // the earth turns spongy and swallows a boot — a wet downward squelch
    function squelch(a, when) {
      const src = noiseSrc(a);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1200, when);
      lp.frequency.exponentialRampToValueAtTime(170, when + 0.38);
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.07, when + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0004, when + 0.42);
      src.connect(lp).connect(g).connect(master);
      src.start(when); src.stop(when + 0.46);
    }

    // a winged insect flutters past your ear — buzzes and pans across the field
    function insectFlyby(a, when) {
      const dur = 1.5 + Math.random() * 0.9, baseF = 125 + Math.random() * 60;
      const o = a.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(baseF * 0.9, when);
      o.frequency.linearRampToValueAtTime(baseF * 1.15, when + dur * 0.5);
      o.frequency.linearRampToValueAtTime(baseF * 0.9, when + dur);
      const am = a.createGain(); am.gain.value = 0.5;
      const amLfo = a.createOscillator(); amLfo.type = 'square'; amLfo.frequency.value = 42 + Math.random() * 18;
      const amAmt = a.createGain(); amAmt.gain.value = 0.5;
      amLfo.connect(amAmt).connect(am.gain);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = baseF * 3; bp.Q.value = 2;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.05, when + dur * 0.5); // loudest as it passes the ear
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      o.connect(bp).connect(am).connect(g);
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (a.createStereoPanner) { const pan = a.createStereoPanner(); pan.pan.setValueAtTime(-dir, when); pan.pan.linearRampToValueAtTime(dir, when + dur); g.connect(pan).connect(master); }
      else g.connect(master);
      o.start(when); o.stop(when + dur + 0.05);
      amLfo.start(when); amLfo.stop(when + dur + 0.05);
    }

    // the forest knows you're here — a high airy presence that swells, echoes, fades
    function presence(a, when) {
      const src = noiseSrc(a);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5;
      bp.frequency.setValueAtTime(2100, when);
      bp.frequency.linearRampToValueAtTime(3200, when + 3);
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.03, when + 1.6);
      g.gain.linearRampToValueAtTime(0.0001, when + 3.4);
      src.connect(bp).connect(g);
      if (echo) g.connect(echo);
      const dry = a.createGain(); dry.gain.value = 0.5; g.connect(dry).connect(master);
      src.start(when); src.stop(when + 3.5);
    }

    // a brief eerie wind-whistle threading through the trees
    function windWhistle(a, when) {
      const src = noiseSrc(a);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 8;
      bp.frequency.setValueAtTime(700, when);
      bp.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 800, when + 1.2);
      bp.frequency.exponentialRampToValueAtTime(600, when + 2.6);
      const g = a.createGain(); g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.04, when + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, when + 2.6);
      src.connect(bp).connect(g).connect(master);
      src.start(when); src.stop(when + 2.7);
    }

    // hesitant footsteps over crunchy ground; sometimes the earth swallows a boot
    function scheduleSteps() {      if (!master) return;
      const a = actx, n = a.currentTime;
      crunch(a, n + 0.05, 0.07 + Math.random() * 0.03);
      if (Math.random() < 0.5) crunch(a, n + 0.28 + Math.random() * 0.12, 0.05); // the trailing foot
      if (Math.random() < 0.16) squelch(a, n + 0.5 + Math.random() * 0.3);        // spongy ground
      at(scheduleSteps, 1700 + Math.random() * 2600);
    }

    // creatures & atmosphere, sparse and unpredictable
    function scheduleCreatures() {
      if (!master) return;
      const a = actx, n = a.currentTime + 0.1, r = Math.random();
      if (r < 0.26) howl(a, n);
      else if (r < 0.46) hum(a, n);
      else if (r < 0.64) owl(a, n);
      else if (r < 0.80) insectFlyby(a, n);
      else if (r < 0.92) presence(a, n);
      else windWhistle(a, n);
      at(scheduleCreatures, 3800 + Math.random() * 5200);
    }

    // smoothly ramp an <audio> element's volume
    function fadeAudio(el, to, ms, done) {
      if (fadeRAF) cancelAnimationFrame(fadeRAF);
      const from = el.volume, t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, (now - t0) / ms);
        el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) fadeRAF = requestAnimationFrame(step);
        else { fadeRAF = null; if (done) done(); }
      })(t0);
    }

    function play(kind) {
      if (kind === 'forest') {
        // real recorded night-forest ambience, looped
        audioEl = new Audio(window.FOREST_AUDIO_SRC || 'audio/forest-night.mp3');
        audioEl.loop = true;
        audioEl.volume = 0;
        const start = () => { audioEl.play().then(() => fadeAudio(audioEl, 0.90, 1600)).catch(() => {}); };
        start();
        return;
      }
      // (synth beds for other rooms, if ever enabled)
      const a = getCtx(); if (!a) return;
      if (a.state === 'suspended') a.resume();
      master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
      master.gain.setTargetAtTime(0.6, a.currentTime, 1.6);
    }

    function teardown() {
      timers.forEach((id) => clearTimeout(id)); timers = [];
      echo = null;
      if (audioEl) {
        const el = audioEl; audioEl = null;
        fadeAudio(el, 0, 600, () => { try { el.pause(); el.src = ''; } catch (e) {} });
      }
      const fns = voices; voices = [];
      const m = master; master = null;
      if (m && actx) {
        m.gain.setTargetAtTime(0.0001, actx.currentTime, 0.4); // fade-out
        setTimeout(() => { fns.forEach((f) => f()); try { m.disconnect(); } catch (e) {} }, 900);
      } else { fns.forEach((f) => f()); }
    }

    function forRoom(roomId) {
      const kind = MAP[roomId] || null;
      const active = master || audioEl;
      if (kind === current && (kind === null || active)) return;
      if (active) teardown();
      current = kind;
      if (kind && (!window.Sfx || Sfx.isOn())) play(kind);
    }
    function stop() { if (master || audioEl) teardown(); current = null; }
    function setEnabled(on) {
      if (!on) { if (master || audioEl) teardown(); } // silence but remember the room
      else if (current && !master && !audioEl) play(current); // resume the current bed
    }
    return { forRoom, stop, setEnabled };
  })();
window.Ambience = Ambience;