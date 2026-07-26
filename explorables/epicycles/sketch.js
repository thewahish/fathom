/* The Circle That Rides a Circle — Fathom No. 06
   Vanilla canvas, no dependencies. A big circle turns; a small circle rides
   its tip and spins k times per trip of the big one; the pen at the small
   circle's tip traces the combined shape. Drag the amber lever to set k. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const speedEl = document.getElementById('speed');
  const ampEl = document.getElementById('amp');
  const kOut = document.getElementById('kOut');

  const TAU = Math.PI * 2;
  const K_MIN = -6, K_MAX = 6;

  let t0 = 0;              // phase of the big circle (radians)
  let playing = true;
  let dragging = false;
  let lastT = null;
  let k = 3;                // whole-number ratio of small-circle spins per big trip
  let amp = ampEl.value / 100; // R2 / R1

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      ink:    F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      axis:   F.axis   || 'rgba(15,23,42,0.16)',
      teal:   F.a      || '#0891b2',   // big-circle arm + ring
      indigo: F.b      || '#6366f1',   // small-circle arm + ring
      amber:  F.handle || '#d97706',   // the lever
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono   || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  let curve = null; // cached array of {x,y} for the current k + amp, in local (unshifted) coords

  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(380, Math.min(520, Math.round(cssW * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 22;
    g.cx = cssW / 2;

    g.leverY = 30;
    g.trackW = Math.min(280, cssW * 0.5);
    g.trackX0 = g.cx - g.trackW / 2;

    g.fieldTop = 66;
    g.fieldBottom = cssH - g.pad;
    g.ox = cssW / 2;
    g.oy = g.fieldTop + (g.fieldBottom - g.fieldTop) / 2;

    const availR = Math.min((g.fieldBottom - g.fieldTop) / 2, cssW / 2 - g.pad) - 8;
    g.R1 = availR / 2; // sized so R1+R2 fits even when amp maxes at 1

    curve = null; // recompute at new scale
  }

  function pointOnCurve(t, R2) {
    const x = g.R1 * Math.cos(t) + R2 * Math.cos(k * t);
    const y = g.R1 * Math.sin(t) + R2 * Math.sin(k * t);
    return { x, y };
  }

  function buildCurve() {
    const R2 = amp * g.R1;
    const pts = new Array(721);
    for (let i = 0; i <= 720; i++) {
      pts[i] = pointOnCurve((i / 720) * TAU, R2);
    }
    curve = pts;
  }

  function draw() {
    const { W, H, ox, oy, R1 } = g;
    if (!curve) buildCurve();
    const R2 = amp * R1;

    ctx.clearRect(0, 0, W, H);

    // big circle ring
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(ox, oy, R1, 0, TAU); ctx.stroke();

    // the traced shape
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const x = ox + curve[i].x, y = oy - curve[i].y;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // current arms
    const p1x = ox + R1 * Math.cos(t0), p1y = oy - R1 * Math.sin(t0);
    const pen = pointOnCurve(t0, R2);
    const penX = ox + pen.x, penY = oy - pen.y;

    // small circle ring, centered on p1
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(p1x, p1y, R2, 0, TAU); ctx.stroke();

    // big arm (origin -> p1)
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p1x, p1y); ctx.stroke();

    // small arm (p1 -> pen)
    ctx.strokeStyle = theme.indigo;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(penX, penY); ctx.stroke();

    // origin dot
    ctx.fillStyle = theme.ink;
    dot(ox, oy, 3);

    // pen dot (the output point — not draggable, so not amber)
    ctx.fillStyle = theme.indigo;
    ctx.shadowColor = theme.indigo;
    ctx.shadowBlur = 10;
    dot(penX, penY, 5.5);
    ctx.shadowBlur = 0;

    drawLever();

    kOut.textContent = String(k);
  }

  function drawLever() {
    const { trackX0, trackW, leverY } = g;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(trackX0, leverY); ctx.lineTo(trackX0 + trackW, leverY); ctx.stroke();

    // tick marks at every integer step
    const n = K_MAX - K_MIN;
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= n; i++) {
      const x = trackX0 + (i / n) * trackW;
      ctx.beginPath(); ctx.moveTo(x, leverY - 6); ctx.lineTo(x, leverY + 6); ctx.stroke();
    }

    ctx.fillStyle = theme.muted;
    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'center';
    ctx.fillText(String(K_MIN), trackX0, leverY - 14);
    ctx.fillText('0', trackX0 + trackW / 2, leverY - 14);
    ctx.fillText(String(K_MAX), trackX0 + trackW, leverY - 14);

    const hx = trackX0 + ((k - K_MIN) / n) * trackW;
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    dot(hx, leverY, 8);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  // ---- animation loop ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    if (playing) {
      const v = (speedEl.value / 100) * 1.6; // rad/s of the big circle
      t0 = (t0 + v * dt) % TAU;
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

  ampEl.addEventListener('input', () => {
    amp = ampEl.value / 100;
    curve = null;
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
  function setKFromX(x) {
    const n = K_MAX - K_MIN;
    const frac = Math.min(1, Math.max(0, (x - g.trackX0) / g.trackW));
    const next = Math.round(K_MIN + frac * n);
    if (next !== k) { k = next; curve = null; }
  }
  function startDrag(e) {
    const x = eventX(e), y = eventY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    setKFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setKFromX(eventX(e));
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
