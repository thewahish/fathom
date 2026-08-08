/* The Line That Forgets Which Curve It Came From — Fathom No. 19
   Vanilla canvas, no dependencies. A fixed point P and a draggable amber
   point Q, both on a curve. The secant line through P and Q is computed
   from nothing but rise-over-run; the tangent at P is computed once from
   the real derivative and never touched again. Drag Q toward P and the
   secant's slope stops approximating the tangent and becomes it. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const curveSeg = document.getElementById('curveSeg');
  const pSlider = document.getElementById('pSlider');
  const pOut = document.getElementById('pOut');
  const animateBtn = document.getElementById('animateBtn');
  const hOut = document.getElementById('hOut');
  const secantOut = document.getElementById('secantOut');
  const tangentOut = document.getElementById('tangentOut');

  const TAU = Math.PI * 2;
  const XMIN = -3.2, XMAX = 3.2;
  const EPS = 0.006; // smallest allowed |h| — avoids a literal 0/0, close enough to read as "merged"

  const CURVES = {
    parabola: {
      f:  x => 0.4 * x * x - 1.6,
      fp: x => 0.8 * x
    },
    sine: {
      f:  x => 1.8 * Math.sin(1.1 * x),
      fp: x => 1.98 * Math.cos(1.1 * x)
    },
    cubic: {
      f:  x => 0.09 * x * x * x - 0.5 * x,
      fp: x => 0.27 * x * x - 0.5
    }
  };

  let curveKey = 'parabola';
  let curve = CURVES[curveKey];
  let xP = pSlider.value / 100;
  let xQ = clamp(xP + 1.4);
  let dragging = false;
  let animating = false;
  let animT = 0;
  let lastT = null;

  function clamp(x) { return Math.max(XMIN, Math.min(XMAX, x)); }

  function nearestValidQ(x) {
    x = clamp(x);
    if (Math.abs(x - xP) < EPS) {
      x = x >= xP ? xP + EPS : xP - EPS;
      x = clamp(x);
    }
    return x;
  }

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      ink:    F.ink   || '#334155',
      muted:  F.muted || '#64748b',
      faint:  F.faint || 'rgba(15,23,42,0.10)',
      axis:   F.axis  || 'rgba(15,23,42,0.16)',
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
    g.plotX0 = 30; g.plotX1 = cssW - 30;
    g.plotY0 = 26; g.plotY1 = cssH - 30;

    let yMin = Infinity, yMax = -Infinity;
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / N;
      const yv = curve.f(xv);
      if (yv < yMin) yMin = yv;
      if (yv > yMax) yMax = yv;
    }
    const range = Math.max(0.4, yMax - yMin);
    g.yMin = yMin - range * 0.16;
    g.yMax = yMax + range * 0.16;
  }

  function sx(xv) { return g.plotX0 + (xv - XMIN) / (XMAX - XMIN) * (g.plotX1 - g.plotX0); }
  function sy(yv) { return g.plotY1 - (yv - g.yMin) / (g.yMax - g.yMin) * (g.plotY1 - g.plotY0); }
  function curvePoint(xv) { return { x: sx(xv), y: sy(curve.f(xv)) }; }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // draw an infinite-looking line through a point at a given slope, clipped
  // to the plot box.
  function drawLineThrough(xv, yv, slope, color, dashed, width) {
    // parametrize in data space: y - yv = slope * (x - xv), clipped to [XMIN,XMAX]
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

    // the curve
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 260; i++) {
      const xv = XMIN + (XMAX - XMIN) * i / 260;
      const p = curvePoint(xv);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    const fp = curve.f(xP), fq = curve.f(xQ);
    const secantSlope = (fq - fp) / (xQ - xP);
    const tangentSlope = curve.fp(xP);
    const h = xQ - xP;
    const closeness = Math.max(0, 1 - Math.min(1, Math.abs(h) / 0.28)); // 0..1, 1 = merged

    // tangent at P: dashed, drawn first so the secant can visually land on it
    drawLineThrough(xP, fp, tangentSlope, hexA(theme.ink, 0.55), true, 2);

    // secant through P and Q: indigo, fades toward the tangent's own color
    // as it converges, so the "it becomes the tangent" read is visual too
    const secantColor = closeness > 0.85
      ? theme.ink
      : theme.indigo;
    drawLineThrough(xP, fp, secantSlope, hexA(secantColor, 0.85), false, closeness > 0.85 ? 2 : 3);

    // P: fixed teal point
    const Pp = curvePoint(xP);
    ctx.fillStyle = theme.teal;
    ctx.beginPath(); ctx.arc(Pp.x, Pp.y, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(Pp.x, Pp.y, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.font = `600 13px ${theme.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('P', Pp.x, Pp.y - 14);

    // Q: draggable amber point
    const Qp = curvePoint(xQ);
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(Qp.x, Qp.y, 7.5, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(Qp.x, Qp.y, 2.8, 0, TAU); ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.fillText('Q', Qp.x, Qp.y - (Qp.y < Pp.y ? -20 : -14));

    // readouts
    hOut.textContent = h.toFixed(3);
    secantOut.textContent = secantSlope.toFixed(3);
    tangentOut.textContent = tangentSlope.toFixed(3);
  }

  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(50, t - lastT);
    lastT = t;

    if (animating && !dragging) {
      animT += dt;
      const period = 5200; // ms for one full swing out-and-back
      const phase = (animT % period) / period; // 0..1
      // triangle-ish swing: h goes A -> -A -> A over one period, via a sine
      // for ease-in/out at the turning points (including the near-merge pass)
      const A = 1.7;
      const h = A * Math.sin(phase * TAU);
      xQ = nearestValidQ(xP + h);
    }

    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function setCurve(key) {
    curveKey = key;
    curve = CURVES[key];
    [...curveSeg.querySelectorAll('button')].forEach(b => b.classList.toggle('on', b.dataset.curve === key));
    layout();
  }
  curveSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-curve]');
    if (!btn) return;
    setCurve(btn.dataset.curve);
  });

  pSlider.addEventListener('input', () => {
    xP = clamp(pSlider.value / 100);
    pOut.textContent = xP.toFixed(2);
    xQ = nearestValidQ(xQ);
  });

  function updateAnimateBtn() {
    animateBtn.textContent = animating ? 'Pause' : 'Animate';
    animateBtn.classList.toggle('primary', animating);
  }
  animateBtn.addEventListener('click', () => {
    animating = !animating;
    if (animating) animT = 0;
    updateAnimateBtn();
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
  function nearQ(px, py) {
    const Qp = curvePoint(xQ);
    return Math.hypot(px - Qp.x, py - Qp.y) < 28;
  }
  function startDrag(e) {
    const { x: px, y: py } = eventXY(e);
    if (!nearQ(px, py)) return;
    dragging = true;
    animating = false;
    updateAnimateBtn();
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x: px } = eventXY(e);
    xQ = nearestValidQ(dataXFromPx(px));
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
    pOut.textContent = xP.toFixed(2);
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
