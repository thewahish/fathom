/* The Window That Only Ever Sees Nine Pixels — Fathom No. 24
   Vanilla canvas, no dependencies. A fixed 16x16 pixel-value grid (a small
   house, drawn from numbers, not an image asset) sits on the left. An
   amber-bordered 3x3 window is the one draggable handle: wherever you drop
   it, the machine multiplies its nine weights against the nine pixels
   underneath, sums them, and writes that single number into the matching
   cell of a 14x14 output map on the right — real convolution ("valid"
   mode), computed live, never precomputed. The output only ever paints
   where the window has actually visited, so the feature map fills in
   exactly as fast as you drag. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const presetEl = document.getElementById('preset');
  const sweepBtn = document.getElementById('sweep');
  const posOut = document.getElementById('posOut');
  const valOut = document.getElementById('valOut');
  const coverOut = document.getElementById('coverOut');

  const SIZE = 16;      // input grid: SIZE x SIZE
  const OUT = SIZE - 2; // output grid: OUT x OUT ("valid" 3x3 convolution)

  // ---- the picture: a small house, built from geometry, not an asset ----
  // Every value is a brightness from 0 (dark) to 1 (bright).
  function pixelAt(x, y) {
    let v = 0.10; // background
    if (y >= 3 && y <= 8) {
      const half = y - 3;                 // 0 at the apex, widening downward
      const left = 7 - half, right = 8 + half;
      if (x >= left && x <= right) v = 0.55; // roof
    }
    if (y >= 9 && y <= 14 && x >= 4 && x <= 11) v = 0.80; // walls
    if (y >= 11 && y <= 14 && x >= 7 && x <= 8) v = 0.12; // door
    return v;
  }
  const IMG = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) row.push(pixelAt(x, y));
    IMG.push(row);
  }

  // ---- kernels ----
  const KERNELS = {
    identity: { label: 'identity', zeroSum: false, w: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
    blur:     { label: 'blur',     zeroSum: false, w: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]] },
    sharpen:  { label: 'sharpen',  zeroSum: false, w: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
    edgesV:   { label: 'vertical edges',   zeroSum: true, w: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
    edgesH:   { label: 'horizontal edges', zeroSum: true, w: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] }
  };
  const DEFAULT_K = 'edgesV';
  let kernelKey = DEFAULT_K;

  const DEFAULT_OX = 3, DEFAULT_OY = 9; // window top-left, in output-space coords — straddles the wall's left edge, a real vertical edge
  let ox = DEFAULT_OX, oy = DEFAULT_OY;

  // output[oy][ox] = { raw, painted }
  function freshOutput() {
    const out = [];
    for (let y = 0; y < OUT; y++) {
      const row = [];
      for (let x = 0; x < OUT; x++) row.push({ raw: 0, painted: false });
      out.push(row);
    }
    return out;
  }
  let output = freshOutput();
  let paintedCount = 0;

  let dragging = false;
  let sweeping = false;
  let sweepIndex = 0;
  let lastSweepT = 0;
  const SWEEP_STEP_MS = 14;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
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
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- the math ----
  function convAt(cx, cy, kernel) {
    let sum = 0;
    for (let ky = 0; ky < 3; ky++)
      for (let kx = 0; kx < 3; kx++)
        sum += kernel.w[ky][kx] * IMG[cy + ky][cx + kx];
    return sum;
  }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function displayValue(raw, kernel) {
    return kernel.zeroSum ? clamp01(raw / 3 + 0.5) : clamp01(raw);
  }

  function paintAt(cx, cy) {
    const kernel = KERNELS[kernelKey];
    const raw = convAt(cx, cy, kernel);
    const cell = output[cy][cx];
    if (!cell.painted) paintedCount++;
    cell.raw = raw;
    cell.painted = true;
  }

  // ---- geometry ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    const pad = Math.max(12, Math.min(20, cssW * 0.03));
    const gap = Math.max(16, Math.min(32, cssW * 0.04));
    const labelH = 20;
    const cellByW = Math.floor((cssW - 2 * pad - gap) / (SIZE + OUT));
    const cssHTarget = Math.max(340, Math.min(520, Math.round(cssW * 0.46)));
    const cellByH = Math.floor((cssHTarget - labelH - 2 * pad) / SIZE);
    const cell = Math.max(8, Math.min(30, Math.min(cellByW, cellByH)));
    const cssH = labelH + SIZE * cell + 2 * pad;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH; g.cell = cell; g.pad = pad; g.labelH = labelH;
    g.inX0 = pad; g.inY0 = pad + labelH;
    g.outX0 = pad + SIZE * cell + gap; g.outY0 = pad + labelH;
  }

  function inputCellRect(x, y) {
    return { x: g.inX0 + x * g.cell, y: g.inY0 + y * g.cell, s: g.cell };
  }
  function outputCellRect(x, y) {
    return { x: g.outX0 + x * g.cell, y: g.outY0 + y * g.cell, s: g.cell };
  }

  // ---- drawing ----
  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);

    // labels
    ctx.font = '11px ' + theme.mono;
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'left';
    ctx.fillText('input', g.inX0, g.pad + 13);
    ctx.fillText('output', g.outX0, g.pad + 13);

    // ---- input grid ----
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const r = inputCellRect(x, y);
        ctx.fillStyle = hexA(theme.ink, 0.06 + IMG[y][x] * 0.88);
        ctx.fillRect(r.x, r.y, r.s, r.s);
      }
    }
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.inX0 + 0.5, g.inY0 + 0.5, SIZE * g.cell - 1, SIZE * g.cell - 1);

    // ---- output grid ----
    for (let y = 0; y < OUT; y++) {
      for (let x = 0; x < OUT; x++) {
        const r = outputCellRect(x, y);
        const cell = output[y][x];
        if (cell.painted) {
          const kernel = KERNELS[kernelKey];
          const dv = displayValue(cell.raw, kernel);
          if (dv >= 0.5) {
            ctx.fillStyle = hexA(theme.teal, 0.10 + (dv - 0.5) * 1.7);
          } else {
            ctx.fillStyle = hexA(theme.indigo, 0.10 + (0.5 - dv) * 1.7);
          }
          ctx.fillRect(r.x, r.y, r.s, r.s);
        } else {
          ctx.strokeStyle = theme.faint;
          ctx.lineWidth = 1;
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.s - 1, r.s - 1);
        }
      }
    }
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.outX0 + 0.5, g.outY0 + 0.5, OUT * g.cell - 1, OUT * g.cell - 1);

    // ---- the window itself: amber border on input, matching cell on output ----
    const kernel = KERNELS[kernelKey];
    const winIn = inputCellRect(ox, oy);
    ctx.save();
    ctx.strokeStyle = theme.amber;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 10;
    ctx.strokeRect(winIn.x + 1, winIn.y + 1, 3 * g.cell - 2, 3 * g.cell - 2);
    ctx.restore();

    const winOut = outputCellRect(ox, oy);
    ctx.strokeStyle = theme.amber;
    ctx.lineWidth = 2;
    ctx.strokeRect(winOut.x + 1, winOut.y + 1, g.cell - 2, g.cell - 2);

    // weight numbers printed over the nine cells the window covers
    if (g.cell >= 14) {
      ctx.font = Math.max(9, Math.floor(g.cell * 0.34)) + 'px ' + theme.mono;
      ctx.textAlign = 'center';
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const wv = kernel.w[ky][kx];
          const label = Number.isInteger(wv) ? String(wv) : wv.toFixed(2);
          const cx = winIn.x + (kx + 0.5) * g.cell;
          const cy = winIn.y + (ky + 0.5) * g.cell;
          ctx.fillStyle = wv > 0 ? theme.teal : wv < 0 ? theme.indigo : theme.muted;
          ctx.fillText(label, cx, cy + 4);
        }
      }
      ctx.textAlign = 'left';
    }

    // ---- readouts ----
    posOut.textContent = `(${oy + 1}, ${ox + 1})`;
    valOut.textContent = output[oy][ox].painted ? output[oy][ox].raw.toFixed(2) : convAt(ox, oy, kernel).toFixed(2);
    coverOut.textContent = Math.round((paintedCount / (OUT * OUT)) * 100) + '%';
  }

  function tick(now) {
    if (sweeping) {
      if (now - lastSweepT >= SWEEP_STEP_MS) {
        lastSweepT = now;
        const sy = Math.floor(sweepIndex / OUT), sx = sweepIndex % OUT;
        ox = sx; oy = sy;
        paintAt(ox, oy);
        sweepIndex++;
        if (sweepIndex >= OUT * OUT) stopSweep();
      }
    }
    draw();
    requestAnimationFrame(tick);
  }

  function startSweep() {
    sweeping = true;
    sweepIndex = 0;
    lastSweepT = 0;
    sweepBtn.textContent = 'Stop';
  }
  function stopSweep() {
    sweeping = false;
    sweepBtn.textContent = 'Sweep';
  }

  // ---- interaction ----
  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  }
  function withinInput(x, y) {
    return x >= g.inX0 && x < g.inX0 + SIZE * g.cell && y >= g.inY0 && y < g.inY0 + SIZE * g.cell;
  }
  function moveWindowTo(px, py) {
    const gx = Math.floor((px - g.inX0) / g.cell);
    const gy = Math.floor((py - g.inY0) / g.cell);
    const nx = Math.min(OUT - 1, Math.max(0, gx - 1));
    const ny = Math.min(OUT - 1, Math.max(0, gy - 1));
    ox = nx; oy = ny;
    paintAt(ox, oy);
  }

  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!withinInput(x, y)) return;
    if (sweeping) stopSweep();
    dragging = true;
    moveWindowTo(x, y);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x, y } = eventXY(e);
    moveWindowTo(x, y);
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

  presetEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    for (const b of presetEl.children) b.classList.toggle('on', b === btn);
    kernelKey = btn.dataset.k;
    if (sweeping) stopSweep();
    output = freshOutput();
    paintedCount = 0;
    paintAt(ox, oy); // keep the window's own cell live so it's never blank
  });

  sweepBtn.addEventListener('click', () => {
    if (sweeping) { stopSweep(); return; }
    output = freshOutput();
    paintedCount = 0;
    startSweep();
  });

  resetBtn.addEventListener('click', () => {
    if (sweeping) stopSweep();
    kernelKey = DEFAULT_K;
    for (const b of presetEl.children) b.classList.toggle('on', b.dataset.k === DEFAULT_K);
    ox = DEFAULT_OX; oy = DEFAULT_OY;
    output = freshOutput();
    paintedCount = 0;
    paintAt(ox, oy);
  });

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    paintAt(ox, oy);
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
