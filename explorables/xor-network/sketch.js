/* Two Neurons Draw the Line One Couldn't — Fathom No. 26
   Vanilla canvas, no dependencies. Direct sequel to No. 25's single neuron:
   two hidden neurons, each z_i = w_i . x + b_i, each with its own amber
   weight-vector arrow (teal shaft for neuron 1, indigo shaft for neuron 2)
   dragged from the origin exactly like No. 25's one arrow. A THIRD neuron
   is fixed, not draggable: output = sigmoid(h1 - h2 - 0.5), wired as
   "neuron 1 fires AND neuron 2 doesn't" — the classic two-line construction
   that solves XOR. Background tints by that combined output, not either
   hidden neuron alone; two dashed boundary lines (one per hidden neuron,
   color-matched to its arrow) show each neuron still only ever draws one
   straight line on its own. "Solve it" snaps to a hand-verified, noise-
   robust solution (see scratchpad verification: 10,000 simulated XOR
   layouts, 0 fell at or below the single-neuron's proven 75% ceiling). */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const solveBtn = document.getElementById('solve');
  const bias1Slider = document.getElementById('bias1');
  const bias2Slider = document.getElementById('bias2');
  const n1Out = document.getElementById('n1Out');
  const n2Out = document.getElementById('n2Out');
  const accOut = document.getElementById('accOut');

  const TAU = Math.PI * 2;
  const UNIT_DEFAULT = 70; // px per 1 data-unit, recomputed on layout to fit the stage
  const R = 2.7;           // half-range of the plotted data square, in data-units
  const MIN_LEN = 0.15;    // clamp on |w|, in data-units
  const MAX_LEN = 3.6;

  const DEFAULT_W1 = { x: 0.7, y: 0.1 };
  const DEFAULT_B1 = -0.3;
  const DEFAULT_W2 = { x: 0.1, y: -0.6 };
  const DEFAULT_B2 = 0.3;

  // hand-verified solution (see repo scratchpad): two parallel lines, same
  // direction (1,1), biases at the exact midpoint of each one's valid range
  // (1.3*k) for the best worst-case margin. Different lengths so the two
  // arrows stay visually distinct even though they point the same way.
  const SOLVE_W1 = { x: 2.4, y: 2.4 };
  const SOLVE_B1 = 1.3 * 2.4;
  const SOLVE_W2 = { x: 1.8, y: 1.8 };
  const SOLVE_B2 = -1.3 * 1.8;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      axis:   F.axis   || 'rgba(15,23,42,0.30)',
      faint:  F.faint  || 'rgba(15,23,42,0.10)',
      ink:    F.ink    || '#334155',
      muted:  F.muted  || '#64748b',
      a:      F.a      || '#0891b2',   // class 1 (teal) / neuron 1
      b:      F.b      || '#6366f1',   // class 0 (indigo) / neuron 2
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

  // ---- fixed, per-point randomness drawn once at boot (like No. 25) ----
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
  function buildXor() {
    const pts = [];
    for (let i = 0; i < 7; i++) pts.push(makePoint(-1.3, -1.3, 0.4, 0));
    for (let i = 0; i < 7; i++) pts.push(makePoint(1.3, 1.3, 0.4, 0));
    for (let i = 0; i < 7; i++) pts.push(makePoint(-1.3, 1.3, 0.4, 1));
    for (let i = 0; i < 7; i++) pts.push(makePoint(1.3, -1.3, 0.4, 1));
    return pts;
  }
  const DATA = buildXor();

  // two weight vectors, stored as pixel offsets from the origin (y-up),
  // exactly like No. 25's single arrow
  let A1 = { x: DEFAULT_W1.x * UNIT_DEFAULT, y: DEFAULT_W1.y * UNIT_DEFAULT };
  let A2 = { x: DEFAULT_W2.x * UNIT_DEFAULT, y: DEFAULT_W2.y * UNIT_DEFAULT };
  let bias1 = DEFAULT_B1;
  let bias2 = DEFAULT_B2;
  let dragTarget = null; // 'A1' | 'A2' | null

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
    clampVec(A1);
    clampVec(A2);
  }

  function clampVec(v) {
    const len = Math.hypot(v.x, v.y);
    if (len > g.maxLenPx) { v.x *= g.maxLenPx / len; v.y *= g.maxLenPx / len; }
    else if (len < g.minLenPx) { const s = g.minLenPx / (len || 1); v.x *= s; v.y *= s; }
  }

  function currentW1() { return { x: A1.x / g.scale, y: A1.y / g.scale }; }
  function currentW2() { return { x: A2.x / g.scale, y: A2.y / g.scale }; }
  function toScreen(dx, dy) { return { x: g.ox + dx * g.scale, y: g.oy - dy * g.scale }; }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  // ---- the network: two hidden neurons feeding one FIXED output neuron ----
  function forward(w1, b1, w2, b2, x, y) {
    const z1 = w1.x * x + w1.y * y + b1;
    const z2 = w2.x * x + w2.y * y + b2;
    const h1 = sigmoid(z1), h2 = sigmoid(z2);
    const zout = h1 - h2 - 0.5; // "neuron 1 fires AND neuron 2 doesn't"
    return { z1, z2, h1, h2, zout };
  }

  function classify(pts, w1, b1, w2, b2) {
    let correct = 0;
    for (const p of pts) {
      const { zout } = forward(w1, b1, w2, b2, p.x, p.y);
      p._pred = zout >= 0 ? 1 : 0;
      if (p._pred === p.label) correct++;
    }
    return correct;
  }

  // perpendicular-foot construction for the line w.x*X + w.y*Y + b = 0,
  // identical to No. 25's single boundary line, called once per neuron
  function boundaryEndpoints(w, b) {
    const wLen2 = w.x * w.x + w.y * w.y;
    if (wLen2 < 1e-9) return null;
    const foot = { x: -b * w.x / wLen2, y: -b * w.y / wLen2 };
    const dirLen = Math.sqrt(wLen2);
    const d = { x: -w.y / dirLen, y: w.x / dirLen };
    const span = (Math.max(g.W, g.H) / g.scale) * 1.2;
    return [
      toScreen(foot.x - d.x * span, foot.y - d.y * span),
      toScreen(foot.x + d.x * span, foot.y + d.y * span)
    ];
  }

  function draw() {
    const { W, H, ox, oy } = g;
    ctx.clearRect(0, 0, W, H);
    const w1 = currentW1(), w2 = currentW2();
    const correct = classify(DATA, w1, bias1, w2, bias2);

    // ---- background: combined-output sigmoid field, tinted teal/indigo ----
    const cell = 14;
    const rgbA = hexToRgb(theme.a), rgbB = hexToRgb(theme.b);
    for (let sy = 0; sy < H; sy += cell) {
      for (let sx = 0; sx < W; sx += cell) {
        const dx = (sx + cell / 2 - ox) / g.scale;
        const dy = (oy - (sy + cell / 2)) / g.scale;
        const { zout } = forward(w1, bias1, w2, bias2, dx, dy);
        const p = sigmoid(zout * 3); // sharpen a bit; zout's own scale is small
        const t = Math.abs(p - 0.5) * 2;
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

    // ---- the two decision boundary lines, color-matched to their arrows ----
    [[w1, bias1, theme.a], [w2, bias2, theme.b]].forEach(([w, b, color]) => {
      const ends = boundaryEndpoints(w, b);
      if (!ends) return;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ends[0].x, ends[0].y); ctx.lineTo(ends[1].x, ends[1].y); ctx.stroke();
      ctx.setLineDash([]);
    });

    // ---- data points ----
    for (const p of DATA) {
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

    // ---- the two weight-vector arrows ----
    const tip1 = toScreen(w1.x, w1.y);
    const tip2 = toScreen(w2.x, w2.y);
    drawArrow(ox, oy, tip1.x, tip1.y, theme.a, 3);
    drawArrow(ox, oy, tip2.x, tip2.y, theme.b, 3);
    handle(tip1.x, tip1.y);
    handle(tip2.x, tip2.y);

    // ---- readouts ----
    n1Out.textContent = `(${w1.x.toFixed(2)}, ${w1.y.toFixed(2)}), ${bias1.toFixed(2)}`;
    n2Out.textContent = `(${w2.x.toFixed(2)}, ${w2.y.toFixed(2)}), ${bias2.toFixed(2)}`;
    const pct = Math.round((correct / DATA.length) * 100);
    accOut.textContent = `${correct}/${DATA.length} (${pct}%)`;
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

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px - g.ox, y: -(py - g.oy) };
  }
  function startDrag(e) {
    const p = localXY(e);
    const d1 = Math.hypot(p.x - A1.x, p.y - A1.y);
    const d2 = Math.hypot(p.x - A2.x, p.y - A2.y);
    const nearest = d1 <= d2 ? 'A1' : 'A2';
    const nearestDist = d1 <= d2 ? d1 : d2;
    if (nearestDist > 34) return;
    dragTarget = nearest;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragTarget) return;
    const p = localXY(e);
    if (dragTarget === 'A1') { A1 = { x: p.x, y: p.y }; clampVec(A1); }
    else { A2 = { x: p.x, y: p.y }; clampVec(A2); }
    e.preventDefault();
  }
  function endDrag() { dragTarget = null; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  function resetState() {
    A1 = { x: DEFAULT_W1.x * g.scale, y: DEFAULT_W1.y * g.scale };
    A2 = { x: DEFAULT_W2.x * g.scale, y: DEFAULT_W2.y * g.scale };
    bias1 = DEFAULT_B1;
    bias2 = DEFAULT_B2;
    bias1Slider.value = String(DEFAULT_B1);
    bias2Slider.value = String(DEFAULT_B2);
  }

  function solveState() {
    A1 = { x: SOLVE_W1.x * g.scale, y: SOLVE_W1.y * g.scale };
    A2 = { x: SOLVE_W2.x * g.scale, y: SOLVE_W2.y * g.scale };
    bias1 = SOLVE_B1;
    bias2 = SOLVE_B2;
    bias1Slider.value = String(SOLVE_B1);
    bias2Slider.value = String(SOLVE_B2);
  }

  resetBtn.addEventListener('click', resetState);
  solveBtn.addEventListener('click', solveState);
  bias1Slider.addEventListener('input', () => { bias1 = parseFloat(bias1Slider.value); });
  bias2Slider.addEventListener('input', () => { bias2 = parseFloat(bias2Slider.value); });

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
