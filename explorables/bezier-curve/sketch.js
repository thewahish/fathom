/* The Curve Built by Cutting Corners — Fathom No. 16
   Vanilla canvas, no dependencies. A Bezier curve is usually shown as a
   formula (sum of Bernstein polynomials times control points). This
   machine never evaluates that formula. Instead it runs de Casteljau's
   algorithm directly: at parameter t, take the point t of the way along
   each edge of the control-point cage, connect those, take the point t of
   the way along THOSE new edges, and repeat until one point survives.
   That surviving point is exactly the curve point at t — no other math
   involved. Drag the amber control points; the whole cascade, and the
   curve it traces, updates live. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const resetBtn = document.getElementById('reset');
  const degreeSeg = document.getElementById('degree');
  const tSlider = document.getElementById('tSlider');
  const tOut = document.getElementById('tOut');

  const TAU = Math.PI * 2;

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

  // Control points stored in normalized [0,1] space (independent of canvas
  // size), so resize never distorts the cage.
  const DEFAULTS = {
    2: [ { x: 0.10, y: 0.82 }, { x: 0.50, y: 0.08 }, { x: 0.90, y: 0.82 } ],
    3: [ { x: 0.08, y: 0.75 }, { x: 0.30, y: 0.08 }, { x: 0.70, y: 0.94 }, { x: 0.94, y: 0.24 } ]
  };

  let degree = 3;
  let points = DEFAULTS[degree].map(p => ({ ...p }));
  let t = 0;
  let dir = 1;
  let playing = true;
  let dragIdx = -1;

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(340, Math.min(460, Math.round(cssW * 0.56)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.W = cssW; g.H = cssH;
    g.pad = 34;
  }

  function toPx(p) {
    return { x: g.pad + p.x * (g.W - 2 * g.pad), y: g.pad + p.y * (g.H - 2 * g.pad) };
  }
  function toNorm(x, y) {
    return {
      x: (x - g.pad) / (g.W - 2 * g.pad),
      y: (y - g.pad) / (g.H - 2 * g.pad)
    };
  }

  function lerp(a, b, tt) { return { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt }; }

  // Every intermediate level of the de Casteljau cascade, starting with the
  // raw control points and ending with the single point on the curve.
  function cascade(pxPoints, tt) {
    const levels = [pxPoints];
    let cur = pxPoints;
    while (cur.length > 1) {
      const next = [];
      for (let i = 0; i < cur.length - 1; i++) next.push(lerp(cur[i], cur[i + 1], tt));
      levels.push(next);
      cur = next;
    }
    return levels;
  }

  function curvePoint(pxPoints, tt) {
    let cur = pxPoints;
    while (cur.length > 1) {
      const next = [];
      for (let i = 0; i < cur.length - 1; i++) next.push(lerp(cur[i], cur[i + 1], tt));
      cur = next;
    }
    return cur[0];
  }

  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);
    const pxPoints = points.map(toPx);

    // the actual curve, sampled directly from the same cascade function —
    // not a separate closed-form polynomial.
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const N = 140;
    for (let i = 0; i <= N; i++) {
      const p = curvePoint(pxPoints, i / N);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // the control-point cage
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pxPoints.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.setLineDash([]);

    // the live de Casteljau cascade at the current t
    const levels = cascade(pxPoints, t);
    const stageColors = [theme.teal, theme.indigo];
    for (let li = 1; li < levels.length - 1; li++) {
      const lvl = levels[li];
      const color = stageColors[(li - 1) % stageColors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      lvl.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      ctx.globalAlpha = 1;
      lvl.forEach(p => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill();
      });
    }

    // the single surviving point — it sits exactly on the curve
    const fp = levels[levels.length - 1][0];
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(fp.x, fp.y, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(fp.x, fp.y, 2.4, 0, TAU); ctx.fill();

    // amber, draggable control points on top
    pxPoints.forEach((p, i) => {
      const active = dragIdx === i;
      ctx.fillStyle = theme.amber;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = active ? 16 : 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, active ? 9 : 7.5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
    });

    tOut.textContent = t.toFixed(2);
    tSlider.value = Math.round(t * 1000);
  }

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px, y: py };
  }

  function hitTest(p) {
    const pxPoints = points.map(toPx);
    let best = -1, bd = 24;
    pxPoints.forEach((q, i) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function startDrag(e) {
    const p = localXY(e);
    const idx = hitTest(p);
    if (idx < 0) return;
    dragIdx = idx;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function moveDrag(e) {
    if (dragIdx < 0) return;
    const p = localXY(e);
    const n = toNorm(p.x, p.y);
    n.x = Math.min(1, Math.max(0, n.x));
    n.y = Math.min(1, Math.max(0, n.y));
    points[dragIdx] = n;
    e.preventDefault();
  }

  function endDrag() { dragIdx = -1; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
  });

  resetBtn.addEventListener('click', () => {
    points = DEFAULTS[degree].map(p => ({ ...p }));
    t = 0; dir = 1;
  });

  tSlider.addEventListener('input', () => {
    playing = false;
    playBtn.textContent = 'Play';
    t = Number(tSlider.value) / 1000;
  });

  degreeSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-degree]');
    if (!b) return;
    degree = Number(b.dataset.degree);
    points = DEFAULTS[degree].map(p => ({ ...p }));
    for (const btn of degreeSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

  // ---- boot ----
  function tick() {
    if (playing) {
      t += dir * 0.006;
      if (t >= 1) { t = 1; dir = -1; }
      else if (t <= 0) { t = 0; dir = 1; }
    }
    draw();
    requestAnimationFrame(tick);
  }
  let ro;
  function boot() {
    readTheme();
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
