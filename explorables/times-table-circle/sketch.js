/* The Times Table That Draws Itself — Fathom No. 07
   Vanilla canvas, no dependencies. n points evenly spaced around a circle;
   point i connects by a straight line to point (i * m) mod n. Drag the
   amber dot (log-scale) to sweep m continuously and watch spokes fold into
   a cardioid, a nephroid, and denser mandalas. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const speedEl = document.getElementById('speed');
  const nEl = document.getElementById('n');
  const mOut = document.getElementById('mOut');
  const curveNameEl = document.getElementById('curveName');

  const TAU = Math.PI * 2;
  const M_MIN = 1;
  const TICKS = [1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 300];
  const LABELED = [1, 2, 3, 5, 10, 50];
  const CURVE_NAMES = { 2: 'cardioid', 3: 'nephroid', 4: 'quatrefoil' };

  let n = parseInt(nEl.value, 10);
  let m = 2;
  let dir = 1;             // sweep direction for autoplay
  let playing = true;
  let dragging = false;
  let lastT = null;

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

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(380, Math.min(560, Math.round(cssW * 0.66)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    const pad = 22;
    g.cx = cssW / 2;

    g.leverY = 30;
    g.trackW = Math.min(340, cssW * 0.66);
    g.trackX0 = g.cx - g.trackW / 2;

    g.fieldTop = 64;
    g.fieldBottom = cssH - pad;
    g.ox = cssW / 2;
    g.oy = g.fieldTop + (g.fieldBottom - g.fieldTop) / 2;
    g.R = Math.min((g.fieldBottom - g.fieldTop) / 2, cssW / 2 - pad) - 6;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function logMMax() { return Math.log(Math.max(n, M_MIN + 1)); }
  function xForM(mv) {
    const f = Math.log(clamp(mv, M_MIN, n)) / logMMax();
    return g.trackX0 + f * g.trackW;
  }
  function mForX(x) {
    const f = clamp((x - g.trackX0) / g.trackW, 0, 1);
    return clamp(Math.exp(f * logMMax()), M_MIN, n);
  }

  function angle(idx) { return -Math.PI / 2 + (idx / n) * TAU; }
  function pointAt(idx) {
    const a = angle(idx);
    return { x: g.ox + g.R * Math.cos(a), y: g.oy - g.R * Math.sin(a) };
  }

  function draw() {
    const { W, H, ox, oy, R } = g;
    ctx.clearRect(0, 0, W, H);

    // the clock face
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.stroke();

    // the lines: point i -> point (i*m) mod n
    ctx.strokeStyle = theme.teal;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const target = ((i * m) % n + n) % n;
      const p0 = pointAt(i), p1 = pointAt(target);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // the points themselves
    ctx.fillStyle = theme.muted;
    for (let i = 0; i < n; i++) {
      const p = pointAt(i);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, TAU); ctx.fill();
    }

    drawLever();

    mOut.textContent = m.toFixed(2);
    const rounded = Math.round(m);
    if (Math.abs(m - rounded) < 0.01 && rounded >= 2) {
      const name = CURVE_NAMES[rounded] || (rounded + '-cusped curve');
      curveNameEl.textContent = '= ' + name;
    } else if (Math.abs(m - 1) < 0.01) {
      curveNameEl.textContent = '= just spokes';
    } else {
      curveNameEl.textContent = '';
    }
  }

  function drawLever() {
    const { trackX0, trackW, leverY } = g;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(trackX0, leverY); ctx.lineTo(trackX0 + trackW, leverY); ctx.stroke();

    ctx.font = '11px ' + theme.mono;
    ctx.textAlign = 'center';
    for (const tv of TICKS) {
      if (tv > n) continue;
      const x = xForM(tv);
      ctx.strokeStyle = theme.faint;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, leverY - 6); ctx.lineTo(x, leverY + 6); ctx.stroke();
      if (LABELED.includes(tv)) {
        ctx.fillStyle = theme.muted;
        ctx.fillText(String(tv), x, leverY - 13);
      }
    }
    // right-hand label for the current n, if not already covered by ticks
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'right';
    ctx.fillText('n=' + n, trackX0 + trackW, leverY + 22);
    ctx.textAlign = 'left';

    const hx = xForM(m);
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(hx, leverY, 8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---- animation loop ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    if (playing && !dragging) {
      const rate = (speedEl.value / 100) * Math.max(3, n / 25);
      m += rate * dir * dt;
      if (m >= n) { m = n; dir = -1; }
      if (m <= M_MIN) { m = M_MIN; dir = 1; }
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

  nEl.addEventListener('input', () => {
    n = parseInt(nEl.value, 10);
    m = clamp(m, M_MIN, n);
  });

  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  function nearLever(x, y) {
    return Math.abs(y - g.leverY) < 22 && x > g.trackX0 - 24 && x < g.trackX0 + g.trackW + 24;
  }
  function setMFromX(x) {
    let mv = mForX(x);
    const rounded = Math.round(mv);
    if (Math.abs(mv - rounded) < 0.15 && rounded >= M_MIN) mv = rounded; // magnet toward named curves
    m = clamp(mv, M_MIN, n);
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    setMFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setMFromX(eventXY(e).x);
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
