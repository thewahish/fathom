/* The Board That Builds a Bell Curve — Fathom No. 03
   Vanilla canvas, no dependencies. Balls fall through a triangular grid of
   pegs, bouncing left or right at random, and pile up in bins below. Drag
   the amber lever to bias the coin; watch the pile lean but keep its shape. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const resetBtn = document.getElementById('reset');
  const rowsEl = document.getElementById('rows');
  const speedEl = document.getElementById('speed');
  const biasOut = document.getElementById('biasOut');
  const countOut = document.getElementById('countOut');

  const TAU = Math.PI * 2;

  let rows = parseInt(rowsEl.value, 10);
  let p = 0.5;             // probability a bounce goes right
  let playing = true;
  let dragging = false;
  let lastT = null;
  let spawnAcc = 0;

  let counts = new Array(rows + 1).fill(0);
  let totalDropped = 0;
  let balls = [];           // active falling balls

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:      'transparent',
      ink:     F.ink   || '#334155',
      muted:   F.muted || '#64748b',
      faint:   F.faint || 'rgba(15,23,42,0.10)',
      axis:    F.axis  || 'rgba(15,23,42,0.16)',
      teal:    F.a     || '#0891b2',   // bars + falling balls
      indigo:  F.b     || '#6366f1',   // theoretical curve overlay
      fillA:   F.fillA || 'rgba(8,145,178,0.42)',
      amber:   F.handle || '#d97706',  // the lever
      glow:    F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:    F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(340, Math.min(480, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 22;
    g.cx = cssW / 2;

    g.leverY = 30;
    g.trackW = Math.min(220, cssW * 0.42);
    g.trackX0 = g.cx - g.trackW / 2;

    g.pegTop = 62;
    g.pegBottom = Math.round(cssH * 0.58);
    g.binTop = g.pegBottom + 10;
    g.binBottom = cssH - 24;

    g.spacingY = (g.pegBottom - g.pegTop) / Math.max(1, rows - 1 || 1);
    if (rows === 1) g.spacingY = g.pegBottom - g.pegTop;

    const binsWidth = cssW - g.pad * 2;
    g.spacingX = binsWidth / (rows + 1);
  }

  function pegX(row, c) { return g.cx + (c - row / 2) * g.spacingX; }
  function binX(k) { return g.cx + (k - rows / 2) * g.spacingX; }

  function makeBall() {
    const decisions = new Array(rows);
    for (let i = 0; i < rows; i++) decisions[i] = Math.random() < p ? 1 : 0;

    const waypoints = [{ x: g.cx, y: g.pegTop - g.spacingY * 0.85 }];
    let c = 0;
    for (let r = 0; r < rows; r++) {
      waypoints.push({ x: pegX(r, c), y: g.pegTop + r * g.spacingY });
      c += decisions[r];
    }
    waypoints.push({ x: binX(c), y: g.binTop });

    return { waypoints, col: c, elapsed: 0, landed: false };
  }

  function segDuration() {
    const speed = speedEl.value / 100;
    const fallFactor = 0.55 + speed * 2.2;
    return 95 / fallFactor;
  }

  function updateBalls(dtMs) {
    const segMs = segDuration();
    for (const b of balls) b.elapsed += dtMs;
    for (const b of balls) {
      const totalSegs = b.waypoints.length - 1;
      if (b.elapsed >= totalSegs * segMs) {
        b.landed = true;
        counts[b.col]++;
        totalDropped++;
      }
    }
    if (balls.some(b => b.landed)) balls = balls.filter(b => !b.landed);
  }

  function ballPos(b) {
    const segMs = segDuration();
    const totalSegs = b.waypoints.length - 1;
    let idx = Math.floor(b.elapsed / segMs);
    idx = Math.min(idx, totalSegs - 1);
    const t = Math.min(1, (b.elapsed - idx * segMs) / segMs);
    const p0 = b.waypoints[idx], p1 = b.waypoints[idx + 1];
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
  }

  function binomial(n, k) {
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return r;
  }

  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    // center reference (fair-coin line) through the peg field
    ctx.strokeStyle = theme.faint;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.pegTop - 14);
    ctx.lineTo(g.cx, g.binBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // pegs
    ctx.fillStyle = theme.axis;
    for (let r = 0; r < rows; r++) {
      const y = g.pegTop + r * g.spacingY;
      for (let c = 0; c <= r; c++) {
        ctx.beginPath();
        ctx.arc(pegX(r, c), y, 2.6, 0, TAU);
        ctx.fill();
      }
    }

    // bins / histogram bars
    const maxCount = Math.max(1, ...counts);
    const areaH = g.binBottom - g.binTop;
    const barUnit = Math.min(14, areaH / maxCount);
    const barW = Math.max(4, g.spacingX * 0.72);

    for (let k = 0; k <= rows; k++) {
      const x = binX(k);
      const h = counts[k] * barUnit;
      ctx.fillStyle = theme.fillA;
      ctx.fillRect(x - barW / 2, g.binBottom - h, barW, h);
    }

    // theoretical binomial curve, scaled to the same bar units, overlaid
    if (totalDropped > 0) {
      ctx.strokeStyle = theme.indigo;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= rows; k++) {
        const pmf = binomial(rows, k) * Math.pow(p, k) * Math.pow(1 - p, rows - k);
        const expected = pmf * totalDropped * barUnit;
        const x = binX(k), y = g.binBottom - expected;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // bin baseline
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.pad, g.binBottom);
    ctx.lineTo(W - g.pad, g.binBottom);
    ctx.stroke();

    // falling balls
    ctx.fillStyle = theme.teal;
    for (const b of balls) {
      const pos = ballPos(b);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, TAU);
      ctx.fill();
    }

    // the lever
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.trackX0, g.leverY);
    ctx.lineTo(g.trackX0 + g.trackW, g.leverY);
    ctx.stroke();

    const hx = g.trackX0 + p * g.trackW;
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(hx, g.leverY, 8, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.beginPath();
    ctx.arc(hx, g.leverY, 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = theme.muted;
    ctx.font = '12px ' + (theme.mono || 'monospace');
    ctx.textAlign = 'left';
    ctx.fillText('left', g.trackX0 - 26, g.leverY + 4);
    ctx.textAlign = 'right';
    ctx.fillText('right', g.trackX0 + g.trackW + 30, g.leverY + 4);
    ctx.textAlign = 'left';

    biasOut.textContent = Math.round(p * 100) + '% right';
    countOut.textContent = String(totalDropped);
  }

  function tick(t) {
    if (lastT == null) lastT = t;
    const dtMs = Math.min(50, t - lastT);
    lastT = t;

    if (playing && !dragging) {
      const ballsPerSec = 1 + (speedEl.value / 100) * 11;
      spawnAcc += dtMs / 1000 * ballsPerSec;
      while (spawnAcc >= 1) {
        balls.push(makeBall());
        spawnAcc -= 1;
      }
    }
    updateBalls(dtMs);
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

  function resetCounts() {
    counts = new Array(rows + 1).fill(0);
    totalDropped = 0;
    balls = [];
    spawnAcc = 0;
  }
  resetBtn.addEventListener('click', resetCounts);

  rowsEl.addEventListener('input', () => {
    rows = parseInt(rowsEl.value, 10);
    resetCounts();
    layout();
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
  function setBiasFromX(x) {
    const t = (x - g.trackX0) / g.trackW;
    p = Math.min(1, Math.max(0, t));
  }
  function startDrag(e) {
    const x = eventX(e), y = eventY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    setBiasFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setBiasFromX(eventX(e));
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
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
