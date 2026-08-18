/* How Many Circles Does It Take to Draw a Star? — Fathom No. 27
   Vanilla canvas, no dependencies. A chain of nested rotating circles (an
   epicycle chain, the direct sequel to No. 06 and No. 12) whose combined pen
   tip traces a real Fourier-series reconstruction of a target outline
   (star or square), computed live via a direct discrete Fourier transform —
   no hand-tuned coefficients. Drag the amber lever to change how many
   circles (frequency terms) are included; more circles means a closer match. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const resetBtn = document.getElementById('reset');
  const presetEl = document.getElementById('preset');
  const speedEl = document.getElementById('speed');
  const mOut = document.getElementById('mOut');
  const matchOut = document.getElementById('matchOut');

  const TAU = Math.PI * 2;
  const N_SAMPLES = 180;   // points sampled uniformly by arc length along the target outline
  const KMAX = 20;         // frequencies -20..20 => 41 candidate circles total
  const M_MIN = 1, M_MAX = 2 * KMAX + 1;
  const M_TICKS = [1, 2, 4, 6, 10, 20, 41];

  const DEFAULT_M = 3;

  let M = DEFAULT_M;
  let activePreset = 'star';
  let tParam = 0;           // phase of the chain, 0..1 = one full lap
  let playing = true;
  let lastT = null;
  let dragging = false;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      ink:    F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      axis:   F.axis   || 'rgba(15,23,42,0.16)',
      teal:   F.a      || '#0891b2',
      indigo: F.b      || '#6366f1',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono   || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  // ---- target shapes (closed polygons, unit-ish radius) ----
  function starVertices() {
    const Ro = 1, Ri = 0.42, pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * (TAU / 10);
      const r = (i % 2 === 0) ? Ro : Ri;
      pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
    }
    return pts;
  }
  function squareVertices() {
    const s = 1 / Math.SQRT2;
    return [[s, s], [-s, s], [-s, -s], [s, -s]];
  }

  // sample a closed polygon at N points evenly spaced by arc length, so the
  // DFT sees a roughly constant-speed traversal instead of bunching near
  // short edges.
  function sampleByArcLength(vertices, N) {
    const verts = vertices.concat([vertices[0]]);
    const segLens = [];
    let total = 0;
    for (let i = 0; i < verts.length - 1; i++) {
      const L = Math.hypot(verts[i + 1][0] - verts[i][0], verts[i + 1][1] - verts[i][1]);
      segLens.push(L);
      total += L;
    }
    const pts = new Array(N);
    for (let n = 0; n < N; n++) {
      let target = (n / N) * total;
      let i = 0;
      while (i < segLens.length - 1 && target > segLens[i]) { target -= segLens[i]; i++; }
      const t = segLens[i] > 0 ? target / segLens[i] : 0;
      pts[n] = [
        verts[i][0] + (verts[i + 1][0] - verts[i][0]) * t,
        verts[i][1] + (verts[i + 1][1] - verts[i][1]) * t
      ];
    }
    return pts;
  }

  // direct DFT: c_k = (1/N) * sum_n f(n) * exp(-i*2*pi*k*n/N), k = -KMAX..KMAX
  function dft(samples) {
    const N = samples.length;
    const coeffs = [];
    for (let k = -KMAX; k <= KMAX; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const ang = -TAU * k * n / N;
        const c = Math.cos(ang), s = Math.sin(ang);
        re += samples[n][0] * c - samples[n][1] * s;
        im += samples[n][0] * s + samples[n][1] * c;
      }
      coeffs.push({ k, re: re / N, im: im / N, mag: Math.hypot(re / N, im / N) });
    }
    return coeffs;
  }

  function reconstructAt(subset, t) {
    let x = 0, y = 0;
    for (let i = 0; i < subset.length; i++) {
      const c = subset[i];
      const ang = TAU * c.k * t;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      x += c.re * cs - c.im * sn;
      y += c.re * sn + c.im * cs;
    }
    return [x, y];
  }

  // per-preset cached data
  const shapes = {};
  function buildShape(name) {
    const verts = name === 'square' ? squareVertices() : starVertices();
    const samples = sampleByArcLength(verts, N_SAMPLES);
    const coeffs = dft(samples);
    const sorted = coeffs.slice().sort((a, b) => b.mag - a.mag);
    shapes[name] = { samples, sorted };
  }
  buildShape('star');
  buildShape('square');

  let curvePts = null;   // cached reconstructed curve (N_SAMPLES pts) for current preset+M
  let matchPct = null;

  function rebuildCurve() {
    const shape = shapes[activePreset];
    const subset = shape.sorted.slice(0, M);
    const pts = new Array(N_SAMPLES);
    let errAcc = 0, refAcc = 0;
    for (let n = 0; n < N_SAMPLES; n++) {
      const t = n / N_SAMPLES;
      const p = reconstructAt(subset, t);
      pts[n] = p;
      const dx = p[0] - shape.samples[n][0], dy = p[1] - shape.samples[n][1];
      errAcc += dx * dx + dy * dy;
      refAcc += shape.samples[n][0] ** 2 + shape.samples[n][1] ** 2;
    }
    curvePts = pts;
    const rms = Math.sqrt(errAcc / N_SAMPLES);
    const refRms = Math.sqrt(refAcc / N_SAMPLES) || 1;
    matchPct = Math.max(0, Math.min(100, 100 * (1 - rms / refRms)));
  }
  rebuildCurve();

  // ---- geometry / layout ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(440, Math.min(600, Math.round(cssW * 0.66)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 22;
    g.cx = cssW / 2;

    g.leverY = 30;
    g.trackW = Math.min(320, cssW * 0.6);
    g.trackX0 = g.cx - g.trackW / 2;

    g.fieldTop = 68;
    g.fieldBottom = cssH - g.pad;
    g.ox = cssW / 2;
    g.oy = g.fieldTop + (g.fieldBottom - g.fieldTop) / 2;

    const availR = Math.min((g.fieldBottom - g.fieldTop) / 2, cssW / 2 - g.pad) - 6;
    g.scale = availR / 1.12; // shapes have radius <=1 and chain reach <1.05; small margin
  }

  function toPx(p) { return [g.ox + p[0] * g.scale, g.oy - p[1] * g.scale]; }

  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    // dashed target outline
    const shape = shapes[activePreset];
    ctx.strokeStyle = theme.indigo;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let n = 0; n <= N_SAMPLES; n++) {
      const p = toPx(shape.samples[n % N_SAMPLES]);
      if (n === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // solid reconstructed curve for the current M
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let n = 0; n <= N_SAMPLES; n++) {
      const p = toPx(curvePts[n % N_SAMPLES]);
      if (n === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.stroke();

    // live epicycle chain at the current phase
    const subset = shape.sorted.slice(0, M);
    let cx = g.ox, cy = g.oy;
    let ux = 0, uy = 0; // unit-space accumulator, for the pen-tip readback
    for (let i = 0; i < subset.length; i++) {
      const c = subset[i];
      const ang = TAU * c.k * tParam;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const dx = c.re * cs - c.im * sn;
      const dy = c.re * sn + c.im * cs;
      const nux = ux + dx, nuy = uy + dy;
      const nx = g.ox + nux * g.scale, ny = g.oy - nuy * g.scale;

      // guide circle
      const r = c.mag * g.scale;
      if (r > 0.6) {
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      // arm
      ctx.strokeStyle = (i % 2 === 0) ? theme.teal : theme.indigo;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.globalAlpha = 1;

      cx = nx; cy = ny; ux = nux; uy = nuy;
    }

    // origin
    ctx.fillStyle = theme.ink;
    dot(g.ox, g.oy, 3);

    // pen tip
    ctx.fillStyle = theme.indigo;
    ctx.shadowColor = theme.indigo;
    ctx.shadowBlur = 12;
    dot(cx, cy, 5.5);
    ctx.shadowBlur = 0;

    drawLever();

    mOut.textContent = String(M);
    matchOut.textContent = Math.round(matchPct) + '%';
  }

  function drawLever() {
    const { trackX0, trackW, leverY } = g;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(trackX0, leverY); ctx.lineTo(trackX0 + trackW, leverY); ctx.stroke();

    ctx.font = '11px ' + theme.mono;
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.muted;
    for (const tv of M_TICKS) {
      const x = trackX0 + ((tv - M_MIN) / (M_MAX - M_MIN)) * trackW;
      ctx.strokeStyle = theme.faint;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, leverY - 6); ctx.lineTo(x, leverY + 6); ctx.stroke();
      ctx.fillText(String(tv), x, leverY - 13);
    }

    const hx = trackX0 + ((M - M_MIN) / (M_MAX - M_MIN)) * trackW;
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    dot(hx, leverY, 8);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  // ---- animation ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    if (playing) {
      const v = 0.05 + (speedEl.value / 100) * 0.35; // laps/sec
      tParam = (tParam + v * dt) % 1;
    }
    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.classList.toggle('primary', on);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));

  resetBtn.addEventListener('click', () => {
    M = DEFAULT_M;
    activePreset = 'star';
    tParam = 0;
    setPlaying(true);
    for (const btn of presetEl.children) btn.classList.toggle('on', btn.dataset.preset === 'star');
    rebuildCurve();
  });

  presetEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-preset]');
    if (!btn) return;
    activePreset = btn.dataset.preset;
    for (const b of presetEl.children) b.classList.toggle('on', b === btn);
    rebuildCurve();
  });

  function eventX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  }
  function eventY(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  }
  function nearLever(x, y) {
    return Math.abs(y - g.leverY) < 22 && x > g.trackX0 - 24 && x < g.trackX0 + g.trackW + 24;
  }
  function setMFromX(x) {
    const frac = Math.min(1, Math.max(0, (x - g.trackX0) / g.trackW));
    const next = Math.round(M_MIN + frac * (M_MAX - M_MIN));
    if (next !== M) { M = next; rebuildCurve(); }
  }
  function startDrag(e) {
    const x = eventX(e), y = eventY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    setMFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setMFromX(eventX(e));
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => { layout(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
