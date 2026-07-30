/* The Ball That Doesn't Know Where the Bottom Is — Fathom No. 10
   Vanilla canvas, no dependencies. A fixed double-well curve; a ball you can
   drop anywhere on it by dragging. Run/Step apply real gradient descent
   (x -> x - learningRate * f'(x)) so the ball only ever knows the slope
   under it, never the shape of the whole curve. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const runBtn = document.getElementById('run');
  const stepBtn = document.getElementById('step');
  const resetBtn = document.getElementById('reset');
  const lrEl = document.getElementById('lr');
  const lrOut = document.getElementById('lrOut');
  const xOut = document.getElementById('xOut');
  const fOut = document.getElementById('fOut');
  const slopeOut = document.getElementById('slopeOut');
  const stepsOut = document.getElementById('stepsOut');
  const statusOut = document.getElementById('statusOut');

  const TAU = Math.PI * 2;
  const XMIN = -2.4, XMAX = 2.4;
  const DIVERGE_LIMIT = 3.6;
  const STEP_MS = 420;

  // a fixed double-well landscape: one shallow local minimum, one deeper
  // global minimum, with a local max (unstable ridge) between them.
  function f(x) { return 0.25 * x * x * x * x - x * x - 0.3 * x + 2; }
  function fp(x) { return x * x * x - 2 * x - 0.3; }

  let x = -2.0;
  let dragStartX = x;
  let lr = lrEl.value / 100;
  let running = false;
  let dragging = false;
  let iter = 0;
  let status = 'idle';      // idle | rolling | settled | diverged
  let trail = [];
  let settleCount = 0;
  let fromX = x, toX = x, stepElapsed = STEP_MS;
  let lastT = null;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      ink:    F.ink   || '#334155',
      muted:  F.muted || '#64748b',
      faint:  F.faint || 'rgba(15,23,42,0.10)',
      axis:   F.axis  || 'rgba(15,23,42,0.30)',
      teal:   F.a     || '#0891b2',
      indigo: F.b     || '#6366f1',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(320, Math.min(440, Math.round(cssW * 0.46)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.plotX0 = 28; g.plotX1 = cssW - 28;
    g.plotY0 = 26; g.plotY1 = cssH - 30;

    let yMin = Infinity, yMax = -Infinity;
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / N;
      const yv = f(xv);
      if (yv < yMin) yMin = yv;
      if (yv > yMax) yMax = yv;
    }
    const range = yMax - yMin;
    g.yMin = yMin - range * 0.10;
    g.yMax = yMax + range * 0.10;
  }

  function sx(xv) { return g.plotX0 + (xv - XMIN) / (XMAX - XMIN) * (g.plotX1 - g.plotX0); }
  function sy(yv) { return g.plotY1 - (yv - g.yMin) / (g.yMax - g.yMin) * (g.plotY1 - g.plotY0); }
  function curvePoint(xv) { return { x: sx(xv), y: sy(f(xv)) }; }

  function displayX() {
    const t = Math.min(1, stepElapsed / STEP_MS);
    const ease = 1 - Math.pow(1 - t, 3);
    return fromX + (toX - fromX) * ease;
  }

  function doStep() {
    if (status === 'diverged' || status === 'settled') return;
    const xOld = x;
    const slope = fp(xOld);
    const xNew = xOld - lr * slope;
    iter++;

    if (!isFinite(xNew) || Math.abs(xNew) > DIVERGE_LIMIT) {
      trail.push(xOld);
      if (trail.length > 40) trail.shift();
      status = 'diverged';
      running = false;
      updateRunBtn();
      fromX = xOld;
      toX = Math.max(-DIVERGE_LIMIT, Math.min(DIVERGE_LIMIT, xNew));
      x = toX;
      stepElapsed = 0;
      return;
    }

    trail.push(xOld);
    if (trail.length > 40) trail.shift();
    fromX = xOld; toX = xNew; stepElapsed = 0;
    x = xNew;

    if (Math.abs(xNew - xOld) < 0.0009) {
      settleCount++;
      if (settleCount >= 2) { status = 'settled'; running = false; updateRunBtn(); }
    } else {
      settleCount = 0;
      status = 'rolling';
    }
  }

  function doReset() {
    running = false;
    x = dragStartX;
    fromX = x; toX = x; stepElapsed = STEP_MS;
    iter = 0; trail = []; settleCount = 0; status = 'idle';
    updateRunBtn();
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);

    // the curve
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / 240;
      const p = curvePoint(xv);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // preview of the pending step: highlight the ground between the current
    // resting x and where one more step (at this learning rate) would land
    const nextX = Math.max(XMIN, Math.min(XMAX, x - lr * fp(x)));
    if (status !== 'diverged' && status !== 'settled') {
      const xa = Math.min(x, nextX), xb = Math.max(x, nextX);
      ctx.strokeStyle = hexA(theme.amber, 0.30);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const xv = xa + (xb - xa) * i / steps;
        const p = curvePoint(xv);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // trail of past resting points, fading
    for (let i = 0; i < trail.length; i++) {
      const p = curvePoint(Math.max(XMIN, Math.min(XMAX, trail[i])));
      const a = 0.08 + 0.5 * (i / Math.max(1, trail.length - 1));
      ctx.fillStyle = hexA(theme.teal, a);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill();
    }

    // the ball
    const dxv = displayX();
    const bp = curvePoint(Math.max(XMIN, Math.min(XMAX, dxv)));
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 3, 0, TAU); ctx.fill();

    // readouts
    xOut.textContent = dxv.toFixed(2);
    fOut.textContent = f(dxv).toFixed(2);
    slopeOut.textContent = fp(dxv).toFixed(2);
    stepsOut.textContent = String(iter);
    statusOut.textContent = status;
  }

  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(50, t - lastT);
    lastT = t;

    if (stepElapsed < STEP_MS) stepElapsed = Math.min(STEP_MS, stepElapsed + dt);
    if (running && stepElapsed >= STEP_MS) doStep();

    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function updateRunBtn() {
    runBtn.textContent = running ? 'Pause' : 'Run';
    runBtn.classList.toggle('primary', running);
  }

  runBtn.addEventListener('click', () => {
    if (status === 'diverged' || status === 'settled') doReset();
    running = !running;
    updateRunBtn();
  });

  stepBtn.addEventListener('click', () => {
    if (status === 'diverged' || status === 'settled') { doReset(); return; }
    if (running) { running = false; updateRunBtn(); }
    doStep();
  });

  resetBtn.addEventListener('click', doReset);

  lrEl.addEventListener('input', () => {
    lr = lrEl.value / 100;
    lrOut.textContent = lr.toFixed(2);
  });

  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function dataXFromPx(px) {
    const t = (px - g.plotX0) / (g.plotX1 - g.plotX0);
    return XMIN + t * (XMAX - XMIN);
  }
  function nearBall(px, py) {
    const bp = curvePoint(Math.max(XMIN, Math.min(XMAX, displayX())));
    return Math.hypot(px - bp.x, py - bp.y) < 28;
  }
  function startDrag(e) {
    const { x: px, y: py } = eventXY(e);
    if (!nearBall(px, py)) return;
    dragging = true;
    running = false;
    status = 'idle';
    iter = 0; trail = []; settleCount = 0;
    const xv = Math.max(XMIN, Math.min(XMAX, dataXFromPx(px)));
    x = xv; fromX = xv; toX = xv; stepElapsed = STEP_MS;
    updateRunBtn();
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x: px } = eventXY(e);
    const xv = Math.max(XMIN, Math.min(XMAX, dataXFromPx(px)));
    x = xv; fromX = xv; toX = xv; stepElapsed = STEP_MS;
    e.preventDefault();
  }
  function endDrag() {
    if (dragging) dragStartX = x;
    dragging = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  // ---- boot ----
  let ro;
  function boot() {
    lrOut.textContent = lr.toFixed(2);
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
