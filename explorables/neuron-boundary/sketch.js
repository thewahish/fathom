/* The Neuron That Can Only Draw Straight Lines — Fathom No. 25
   Vanilla canvas, no dependencies. A single artificial neuron over 2D
   points: z = w1*x + w2*y + b, class = sign(z). The one amber handle IS
   the weight vector w, dragged from the origin like a dot-product arrow —
   its direction sets which way the boundary line runs, its length sets
   how sharply the neuron commits (steepness of the background heatmap).
   A perpendicular boundary line, plus a live sigmoid-tinted background,
   makes "a neuron is a line" literal. A perceptron-rule Step/Run trains
   the same two numbers by hand-verified update: on a linearly separable
   cluster pair it locks onto a perfect split in 1-2 epochs and stops; on
   an XOR-style four-corner layout no line can ever separate it (capped
   at 75% no matter what), so training keeps changing the line forever —
   the historical reason single neurons needed to become networks. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const stepBtn = document.getElementById('step');
  const runBtn = document.getElementById('run');
  const biasSlider = document.getElementById('bias');
  const biasOut = document.getElementById('biasOut');
  const weightsOut = document.getElementById('weightsOut');
  const accOut = document.getElementById('accOut');
  const epochOut = document.getElementById('epochOut');
  const setSeg = document.getElementById('dataset');

  const TAU = Math.PI * 2;
  const UNIT_DEFAULT = 70; // px per 1 data-unit, recomputed on layout to fit the stage
  const R = 2.7;           // half-range of the plotted data square, in data-units
  const MIN_LEN = 0.15;    // clamp on |w|, in data-units
  const MAX_LEN = 3.0;
  const RUN_PAUSE_MS = 420;
  const DEFAULT_W = { x: 0.4, y: -0.9 };
  const DEFAULT_B = 0.3;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      axis:   F.axis   || 'rgba(15,23,42,0.30)',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      ink:    F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      a:      F.a      || '#0891b2',   // class 1 (teal)
      b:      F.b      || '#6366f1',   // class 0 (indigo)
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)'
    };
  }
  readTheme();

  function hexToRgb(hex) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return { r: 100, g: 100, b: 100 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  // ---- fixed, per-point randomness drawn once at boot (like Simpson's paradox) ----
  function gaussianPair() {
    let u1 = 0;
    while (u1 === 0) u1 = Math.random();
    const u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1));
    return [r * Math.cos(TAU * u2), r * Math.sin(TAU * u2)];
  }
  function makePoint(cx, cy, std, label) {
    const [gx, gy] = gaussianPair();
    return { x: cx + gx * std, y: cy + gy * std, label };
  }
  function buildClusters() {
    const pts = [];
    for (let i = 0; i < 13; i++) pts.push(makePoint(-1.3, -0.9, 0.55, 0));
    for (let i = 0; i < 13; i++) pts.push(makePoint(1.3, 0.9, 0.55, 1));
    return pts;
  }
  function buildXor() {
    const pts = [];
    for (let i = 0; i < 7; i++) pts.push(makePoint(-1.3, -1.3, 0.4, 0));
    for (let i = 0; i < 7; i++) pts.push(makePoint(1.3, 1.3, 0.4, 0));
    for (let i = 0; i < 7; i++) pts.push(makePoint(-1.3, 1.3, 0.4, 1));
    for (let i = 0; i < 7; i++) pts.push(makePoint(1.3, -1.3, 0.4, 1));
    return pts;
  }
  const DATA = { clusters: buildClusters(), xor: buildXor() };
  let dataset = 'clusters';

  // weight vector, stored as a pixel offset from the origin (y-up), like No. 04's arrows
  let A = { x: DEFAULT_W.x * UNIT_DEFAULT, y: DEFAULT_W.y * UNIT_DEFAULT };
  let bias = DEFAULT_B;
  let dragging = false;
  let epoch = 0;
  let running = false;

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(360, Math.min(480, Math.round(cssW * 0.72)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 24;
    g.ox = cssW / 2;
    g.oy = cssH / 2;
    g.scale = (Math.min(cssW, cssH) / 2 - g.pad) / R; // px per data-unit
    g.minLenPx = MIN_LEN * g.scale;
    g.maxLenPx = MAX_LEN * g.scale;
    clampVec(A);
  }

  function clampVec(v) {
    const len = Math.hypot(v.x, v.y);
    if (len > g.maxLenPx) { v.x *= g.maxLenPx / len; v.y *= g.maxLenPx / len; }
    else if (len < g.minLenPx) { const s = g.minLenPx / (len || 1); v.x *= s; v.y *= s; }
  }

  function currentW() { return { x: A.x / g.scale, y: A.y / g.scale }; }
  function toScreen(dx, dy) { return { x: g.ox + dx * g.scale, y: g.oy - dy * g.scale }; }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function classify(pts, w, b) {
    let correct = 0;
    for (const p of pts) {
      const z = w.x * p.x + w.y * p.y + b;
      p._pred = z >= 0 ? 1 : 0;
      if (p._pred === p.label) correct++;
    }
    return correct;
  }

  function draw() {
    const { W, H, ox, oy } = g;
    ctx.clearRect(0, 0, W, H);
    const w = currentW();
    const pts = DATA[dataset];
    const correct = classify(pts, w, bias);

    // ---- background: sigmoid confidence field, tinted teal/indigo ----
    const cell = 14;
    const rgbA = hexToRgb(theme.a), rgbB = hexToRgb(theme.b);
    for (let sy = 0; sy < H; sy += cell) {
      for (let sx = 0; sx < W; sx += cell) {
        const dx = (sx + cell / 2 - ox) / g.scale;
        const dy = (oy - (sy + cell / 2)) / g.scale;
        const z = w.x * dx + w.y * dy + bias;
        const p = sigmoid(z);
        const t = Math.abs(p - 0.5) * 2; // 0 at the boundary, 1 far from it
        const alpha = t * 0.30;
        const rgb = p >= 0.5 ? rgbA : rgbB;
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(3)})`;
        ctx.fillRect(sx, sy, cell, cell);
      }
    }

    // ---- axes + unit grid ----
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    for (let k = -Math.floor(R); k <= Math.floor(R); k++) {
      if (k === 0) continue;
      ctx.beginPath();
      ctx.moveTo(ox + k * g.scale, g.pad); ctx.lineTo(ox + k * g.scale, H - g.pad);
      ctx.moveTo(g.pad, oy - k * g.scale); ctx.lineTo(W - g.pad, oy - k * g.scale);
      ctx.stroke();
    }
    ctx.strokeStyle = theme.axis;
    ctx.beginPath();
    ctx.moveTo(g.pad, oy); ctx.lineTo(W - g.pad, oy);
    ctx.moveTo(ox, g.pad); ctx.lineTo(ox, H - g.pad);
    ctx.stroke();

    // ---- decision boundary: the line w.x*X + w.y*Y + b = 0 ----
    const wLen2 = w.x * w.x + w.y * w.y;
    if (wLen2 > 1e-9) {
      const foot = { x: -bias * w.x / wLen2, y: -bias * w.y / wLen2 }; // closest point on line to origin
      const dirLen = Math.sqrt(wLen2);
      const d = { x: -w.y / dirLen, y: w.x / dirLen }; // along the line
      const span = (Math.max(W, H) / g.scale) * 1.2;
      const p0 = toScreen(foot.x - d.x * span, foot.y - d.y * span);
      const p1 = toScreen(foot.x + d.x * span, foot.y + d.y * span);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- data points ----
    for (const p of pts) {
      const s = toScreen(p.x, p.y);
      const col = p.label === 1 ? theme.a : theme.b;
      ctx.beginPath(); ctx.arc(s.x, s.y, 5.5, 0, TAU);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
      if (p._pred !== p.label) {
        ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU);
        ctx.setLineDash([2.5, 3]);
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ---- the weight vector arrow (the one amber handle) ----
    const tip = toScreen(w.x, w.y);
    drawArrow(ox, oy, tip.x, tip.y, theme.amber, 3);
    handle(tip.x, tip.y);

    // ---- readouts ----
    biasOut.textContent = bias.toFixed(2);
    weightsOut.textContent = `(${w.x.toFixed(2)}, ${w.y.toFixed(2)})`;
    const pct = Math.round((correct / pts.length) * 100);
    accOut.textContent = `${correct}/${pts.length} (${pct}%)`;
    epochOut.textContent = String(epoch);

    const settled = correct === pts.length;
    stepBtn.disabled = settled;
    runBtn.disabled = settled;
    if (settled && running) { running = false; updateRunBtn(); }
  }

  function drawArrow(x0, y0, x1, y1, color, w) {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const head = 11;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(ang - 0.42), y1 - head * Math.sin(ang - 0.42));
    ctx.lineTo(x1 - head * Math.cos(ang + 0.42), y1 - head * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  }

  function handle(x, y) {
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdfdfc';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  }

  // ---- perceptron-rule training: one full epoch over the current dataset ----
  function trainEpoch() {
    const pts = DATA[dataset];
    let w = currentW();
    let b = bias;
    const lr = 0.3;
    let updates = 0;
    for (const p of pts) {
      const z = w.x * p.x + w.y * p.y + b;
      const pred = z >= 0 ? 1 : 0;
      if (pred !== p.label) {
        const sign = p.label === 1 ? 1 : -1;
        w = { x: w.x + lr * sign * p.x, y: w.y + lr * sign * p.y };
        b += lr * sign;
        updates++;
      }
    }
    A = { x: w.x * g.scale, y: w.y * g.scale };
    clampVec(A);
    bias = b;
    epoch++;
    return updates;
  }

  function doStep() {
    const updates = trainEpoch();
    if (updates === 0) { running = false; updateRunBtn(); }
    else if (running) {
      setTimeout(() => { if (running) doStep(); }, RUN_PAUSE_MS);
    }
  }

  function updateRunBtn() {
    runBtn.textContent = running ? 'Pause' : 'Run';
    runBtn.classList.toggle('primary', running);
  }

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px - g.ox, y: -(py - g.oy) };
  }
  function startDrag(e) {
    const p = localXY(e);
    if (Math.hypot(p.x - A.x, p.y - A.y) > 34) return;
    dragging = true;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const p = localXY(e);
    A = { x: p.x, y: p.y };
    clampVec(A);
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  function resetState() {
    A = { x: DEFAULT_W.x * g.scale, y: DEFAULT_W.y * g.scale };
    bias = DEFAULT_B;
    epoch = 0;
    running = false;
    updateRunBtn();
    biasSlider.value = String(DEFAULT_B);
  }

  resetBtn.addEventListener('click', resetState);
  stepBtn.addEventListener('click', () => { if (!stepBtn.disabled) doStep(); });
  runBtn.addEventListener('click', () => {
    if (runBtn.disabled) return;
    running = !running;
    updateRunBtn();
    if (running) doStep();
  });
  biasSlider.addEventListener('input', () => { bias = parseFloat(biasSlider.value); });
  setSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-set]');
    if (!btn) return;
    dataset = btn.dataset.set;
    [...setSeg.querySelectorAll('button')].forEach(b => b.classList.toggle('on', b === btn));
    resetState();
  });

  // ---- boot ----
  function tick() { draw(); requestAnimationFrame(tick); }
  function boot() {
    layout();
    resetState();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => layout()).observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
