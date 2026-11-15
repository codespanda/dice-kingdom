// Shared helpers for the Silly Arcade games: canvas sizing, sound, popups, storage.
const Silly = (() => {
  const c = document.getElementById('c');
  const ctx = c.getContext('2d');
  const S = { W: 0, H: 0, ctx, c };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    c.width = S.W * dpr; c.height = S.H * dpr;
    c.style.width = S.W + 'px'; c.style.height = S.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Sound (tiny synth, no files) ----
  let AC = null;
  function ac() {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    return AC;
  }
  S.beep = (freq, dur = 0.12, type = 'square', vol = 0.08, slideTo = 0) => {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  S.noise = (dur = 0.3, vol = 0.2, freq = 1800) => {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  };
  S.unlockAudio = () => { const a = ac(); if (a && a.state === 'suspended') a.resume(); };

  // ---- Floating text popups ----
  S.pops = [];
  S.pop = (text, x, y, color = '#fff', size = 22) => S.pops.push({ text, x, y, color, size, life: 1 });
  S.drawPops = (dt, offX = 0, offY = 0) => {
    for (const p of S.pops) {
      p.life -= dt * 0.012; p.y -= dt * 0.8;
      ctx.globalAlpha = Math.max(0, p.life);
      S.text(p.text, p.x - offX, p.y - offY, p.size, p.color, true);
    }
    ctx.globalAlpha = 1;
    S.pops = S.pops.filter(p => p.life > 0);
  };

  // ---- Drawing helpers ----
  S.text = (str, x, y, size = 24, color = '#fff', outline = true, align = 'center') => {
    ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  };
  S.emoji = (e, x, y, size, rot = 0, flip = false) => {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, 0, 0);
    ctx.restore();
  };
  S.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  S.rand = (a, b) => a + Math.random() * (b - a);

  // ---- Best score (best effort; may be unavailable) ----
  S.getBest = key => { try { return +(localStorage.getItem(key) || 0); } catch (e) { return 0; } };
  S.setBest = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };

  // ---- Input: unified pointer down/up ----
  S.onDown = fn => c.addEventListener('pointerdown', e => { e.preventDefault(); S.unlockAudio(); fn(e.clientX, e.clientY); });
  S.onUp = fn => { const h = e => { e.preventDefault(); fn(e.clientX, e.clientY); }; c.addEventListener('pointerup', h); c.addEventListener('pointercancel', h); };

  // ---- Main loop with frame-rate independent dt (1 = one 60fps frame) ----
  S.loop = fn => {
    let last = performance.now();
    function f(now) {
      const dt = Math.min(3, (now - last) / 16.667); last = now;
      fn(dt, now / 1000);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  };
  return S;
})();
