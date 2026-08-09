/* The Guess That Decides Which Root You Find — Fathom No. 20
   Vanilla canvas, no dependencies. Newton's method on f(x) = x^3 - x, a
   cubic with three real roots (-1, 0, 1). Each step is drawn as exactly
   what it is: the tangent line at the current guess, read at the point
   where THAT straight line crosses zero, then dropped back onto the curve
   to read the next slope. A precomputed strip beneath the axis shows,
   for every possible starting point, which root it eventually reaches —
   three calm bands with a genuinely chaotic seam between them. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const stepBtn = document.getElementById('stepBtn');
  const runBtn = document.getElementById('runBtn');
  const resetBtn = document.getElementById('resetBtn');
  const xOut = document.getElementById('xOut');
  const fxOut = document.getElementById('fxOut');
  const stepOut = document.getElementById('stepOut');
  const statusOut = document.getElementById('statusOut');

  const TAU = Math.PI * 2;
  const XMIN = -1.7, XMAX = 1.7;
  const CRIT = 1 / Math.sqrt(3);   // ~0.5774, f'(x) = 0 here — Newton has no slope to use
  const CYCLE = 1 / Math.sqrt(5);  // ~0.4472, the exact point that 2-cycles forever
  const MAGNET = 0.018;            // drag snap radius, in data units, onto those two special points
  const BASIN_N = 1600;
  const MAX_AUTO_STEPS = 60;

  function f(x) { return x * x * x - x; }
  function fp(x) { return 3 * x * x - 1; }

  // Run real Newton iteration to completion, off-screen, to classify a
  // starting point by which root (if any) it settles on. Used once at boot
  // to paint the whole "answer key" strip — the live on-screen stepping
  // below uses the exact same update rule, one step visualized at a time.
  function classifyPoint(x0) {
    let x = x0;
    for (let i = 0; i < 80; i++) {
      const d = fp(x);
      if (Math.abs(d) < 1e-9) return null;               // stuck: flat tangent
      const xn = x - f(x) / d;
      if (!isFinite(xn) || Math.abs(xn) > 1e6) return null; // ran off to infinity
      if (Math.abs(xn - x) < 1e-9) {
        if (Math.abs(xn - 1) < 1e-5) return 1;
        if (Math.abs(xn + 1) < 1e-5) return -1;
        if (Math.abs(xn) < 1e-5) return 0;
        return null;
      }
      x = xn;
    }
    return null; // didn't settle within the cap — the chaotic/cycling seam
  }

  const basin = new Array(BASIN_N);
  for (let i = 0; i < BASIN_N; i++) {
    const xv = XMIN + (XMAX - XMIN) * i / (BASIN_N - 1);
    basin[i] = classifyPoint(xv);
  }

  function clamp(x) { return Math.max(XMIN, Math.min(XMAX, x)); }

  function magnetize(x) {
    if (Math.abs(x - CRIT) < MAGNET) return CRIT;
    if (Math.abs(x + CRIT) < MAGNET) return -CRIT;
    if (Math.abs(x - CYCLE) < MAGNET) return CYCLE;
    if (Math.abs(x + CYCLE) < MAGNET) return -CYCLE;
    return x;
  }

  // ---- iteration state ----
  let curX = 1.55;
  let trail = [];          // past landed x-values, oldest first
  let stepCount = 0;
  let status = 'ready';    // ready | stuck | converged | diverged | unresolved
  let convergedRoot = null;
  let running = false;
  let dragging = false;
  let anim = null;         // {phase, x0,y0, x1,y1c, t0}

  function liveXY() {
    if (!anim) return { x: curX, y: f(curX) };
    return { x: anim.drawX, y: anim.drawY };
  }

  function statusText() {
    switch (status) {
      case 'ready': return running ? 'stepping…' : 'ready';
      case 'converged': return `settled on root ${convergedRoot}`;
      case 'stuck': return 'stuck — slope is 0 here';
      case 'diverged': return 'ran off to infinity';
      case 'unresolved': return `hasn't settled (${MAX_AUTO_STEPS} steps)`;
      default: return status;
    }
  }

  function updateReadouts() {
    const p = liveXY();
    xOut.textContent = p.x.toFixed(4);
    fxOut.textContent = p.y.toFixed(4);
    stepOut.textContent = String(stepCount);
    statusOut.textContent = statusText();
  }

  function updateRunBtn() {
    runBtn.textContent = running ? 'Pause' : 'Run';
    runBtn.classList.toggle('primary', running);
  }

  function resetIteration(keepX) {
    anim = null;
    running = false;
    trail = [];
    stepCount = 0;
    status = 'ready';
    convergedRoot = null;
    if (!keepX) curX = 1.55;
    updateRunBtn();
    updateReadouts();
  }

  function finalizeAfterLanding() {
    const fv = f(curX);
    if (Math.abs(fv) < 1e-7) {
      status = 'converged';
      convergedRoot = Math.round(curX);
    } else if (Math.abs(curX) > 50) {
      status = 'diverged';
    } else if (trail.length >= 2 && Math.abs(curX + trail[trail.length - 1]) < 1e-4 && Math.abs(curX) > 1e-3) {
      status = 'unresolved'; // caught the exact 2-cycle mid-swing
    } else if (stepCount >= MAX_AUTO_STEPS) {
      status = 'unresolved';
    } else {
      status = 'ready';
    }
    updateReadouts();
    if (running) {
      if (status === 'ready') {
        setTimeout(() => { if (running) doStep(); }, 260);
      } else {
        running = false;
        updateRunBtn();
      }
    }
  }

  function doStep() {
    if (anim) return;
    if (status === 'converged' || status === 'stuck' || status === 'diverged' || status === 'unresolved') return;
    const x0 = curX, y0 = f(x0);
    const d = fp(x0);
    if (Math.abs(d) < 1e-6) {
      status = 'stuck';
      running = false;
      updateRunBtn();
      updateReadouts();
      return;
    }
    const x1 = x0 - y0 / d;
    if (!isFinite(x1) || Math.abs(x1) > 50) {
      status = 'diverged';
      running = false;
      updateRunBtn();
      updateReadouts();
      return;
    }
    anim = { phase: 1, x0, y0, x1, y1c: f(x1), t0: null, drawX: x0, drawY: y0 };
  }

  stepBtn.addEventListener('click', () => { running = false; updateRunBtn(); doStep(); });
  runBtn.addEventListener('click', () => {
    if (running) { running = false; updateRunBtn(); updateReadouts(); return; }
    if (status === 'converged' || status === 'stuck' || status === 'diverged' || status === 'unresolved') return;
    running = true;
    updateRunBtn();
    if (!anim) doStep();
  });
  resetBtn.addEventListener('click', () => resetIteration(true));

  // ---- theme ----
  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg: 'transparent',
      ink: F.ink || '#334155',
      muted: F.muted || '#64748b',
      faint: F.faint || 'rgba(15,23,42,0.10)',
      axis: F.axis || 'rgba(15,23,42,0.16)',
      teal: F.a || '#0891b2',
      indigo: F.b || '#6366f1',
      amber: F.handle || '#d97706',
      glow: F.handleGlow || 'rgba(217,119,6,0.40)',
      mono: F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  function hexA(hex, a) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // root value -> its fixed color. null (unresolved/stuck/cycling) -> muted gray.
  function rootColor(v) {
    if (v === -1) return theme.teal;
    if (v === 0) return theme.indigo;
    if (v === 1) return theme.ink;
    return theme.muted;
  }

  // ---- layout ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(380, Math.min(500, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.plotX0 = 34; g.plotX1 = cssW - 22;

    const bottomBlock = 66; // strip + gap + root labels
    g.plotY0 = 24;
    g.plotY1 = cssH - bottomBlock;
    g.stripY0 = g.plotY1 + 16;
    g.stripY1 = g.stripY0 + 16;
    g.labelY = g.stripY1 + 22;

    let yMin = Infinity, yMax = -Infinity;
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / N;
      const yv = f(xv);
      if (yv < yMin) yMin = yv;
      if (yv > yMax) yMax = yv;
    }
    const range = Math.max(0.4, yMax - yMin);
    g.yMin = yMin - range * 0.14;
    g.yMax = yMax + range * 0.14;
  }

  function sx(xv) { return g.plotX0 + (xv - XMIN) / (XMAX - XMIN) * (g.plotX1 - g.plotX0); }
  function sy(yv) { return g.plotY1 - (yv - g.yMin) / (g.yMax - g.yMin) * (g.plotY1 - g.plotY0); }
  function curvePoint(xv) { return { x: sx(xv), y: sy(f(xv)) }; }

  function drawLineThrough(xv, yv, slope, color, dashed, width) {
    const x0 = XMIN, x1 = XMAX;
    const y0 = yv + slope * (x0 - xv);
    const y1 = yv + slope * (x1 - xv);
    const p0 = { x: sx(x0), y: sy(y0) };
    const p1 = { x: sx(x1), y: sy(y1) };
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.plotX0, g.plotY0, g.plotX1 - g.plotX0, g.plotY1 - g.plotY0);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([7, 6]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);

    // x-axis (y = 0) — the target line every tangent step is aimed at
    const axisY = sy(0);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.plotX0, axisY);
    ctx.lineTo(g.plotX1, axisY);
    ctx.stroke();

    // tangent line + vertical drop, while a step is in flight
    if (anim) {
      drawLineThrough(anim.x0, anim.y0, fp(anim.x0), hexA(theme.ink, 0.55), true, 2);
      const ax = sx(anim.x1);
      ctx.save();
      ctx.strokeStyle = hexA(theme.ink, 0.35);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(ax, axisY);
      ctx.lineTo(ax, sy(anim.y1c));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (status === 'stuck') {
      // the tangent here is exactly flat — draw it to show it never reaches zero
      drawLineThrough(curX, f(curX), 0, hexA(theme.ink, 0.55), true, 2);
    }

    // the curve
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 260; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / 260;
      const p = curvePoint(xv);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // the three roots, marked on the axis in their basin colors
    [-1, 0, 1].forEach(r => {
      const rx = sx(r);
      ctx.fillStyle = rootColor(r);
      ctx.beginPath(); ctx.arc(rx, axisY, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = theme.ink;
      ctx.font = `600 12px ${theme.mono}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(r), rx, g.labelY);
    });

    // trail of past landed guesses, fading with age
    trail.forEach((xv, i) => {
      const age = trail.length - i; // 1 = most recent
      const a = Math.max(0.06, 0.32 - age * 0.045);
      const p = curvePoint(xv);
      ctx.fillStyle = hexA(theme.amber, a);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill();
    });

    // the current guess: amber, always
    const live = liveXY();
    const lp = { x: sx(live.x), y: sy(live.y) };
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 7.5, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 2.8, 0, TAU); ctx.fill();

    // basin strip: the precomputed answer for every possible starting point
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.plotX0, g.stripY0, g.plotX1 - g.plotX0, g.stripY1 - g.stripY0);
    ctx.clip();
    const px0 = Math.floor(g.plotX0), px1 = Math.ceil(g.plotX1);
    for (let px = px0; px <= px1; px++) {
      const xv = XMIN + (px - g.plotX0) / (g.plotX1 - g.plotX0) * (XMAX - XMIN);
      let idx = Math.round((xv - XMIN) / (XMAX - XMIN) * (BASIN_N - 1));
      idx = Math.max(0, Math.min(BASIN_N - 1, idx));
      const val = basin[idx];
      ctx.fillStyle = hexA(rootColor(val), val === null ? 0.30 : 0.55);
      ctx.fillRect(px, g.stripY0, 1.4, g.stripY1 - g.stripY0);
    }
    ctx.restore();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.plotX0 + 0.5, g.stripY0 + 0.5, g.plotX1 - g.plotX0 - 1, g.stripY1 - g.stripY0 - 1);

    // marker on the strip showing exactly where the current guess sits
    const mx = sx(live.x);
    ctx.fillStyle = theme.amber;
    ctx.beginPath();
    ctx.moveTo(mx - 5, g.stripY0 - 7);
    ctx.lineTo(mx + 5, g.stripY0 - 7);
    ctx.lineTo(mx, g.stripY0 - 1);
    ctx.closePath();
    ctx.fill();
  }

  function tick(t) {
    if (anim) {
      if (anim.t0 == null) anim.t0 = t;
      const elapsed = t - anim.t0;
      if (anim.phase === 1) {
        const dur = 420;
        const p = Math.min(1, elapsed / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        anim.drawX = anim.x0 + (anim.x1 - anim.x0) * ease;
        anim.drawY = anim.y0 + (0 - anim.y0) * ease;
        if (p >= 1) { anim.phase = 2; anim.t0 = t; }
      } else {
        const dur = 260;
        const p = Math.min(1, elapsed / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        anim.drawX = anim.x1;
        anim.drawY = 0 + (anim.y1c - 0) * ease;
        if (p >= 1) {
          trail.push(anim.x0);
          if (trail.length > 40) trail.shift();
          curX = anim.x1;
          stepCount++;
          anim = null;
          finalizeAfterLanding();
        }
      }
    }
    updateReadouts();
    draw();
    requestAnimationFrame(tick);
  }

  // ---- drag interaction ----
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
  function nearHandle(px, py) {
    const live = liveXY();
    const p = { x: sx(live.x), y: sy(live.y) };
    return Math.hypot(px - p.x, py - p.y) < 28;
  }
  function startDrag(e) {
    const { x: px, y: py } = eventXY(e);
    if (!nearHandle(px, py)) return;
    dragging = true;
    resetIteration(true);
    curX = clamp(dataXFromPx(px));
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x: px } = eventXY(e);
    curX = magnetize(clamp(dataXFromPx(px)));
    e.preventDefault();
  }
  function endDrag() {
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
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    updateReadouts();
    requestAnimationFrame(tick);
  }
  boot();
})();
