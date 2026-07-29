/* The Trend That Flips When You Zoom Out — Fathom No. 09
   Vanilla canvas, no dependencies. Two point groups, each with a fixed
   negative within-group trend. Drag the amber lever and the groups slide
   apart along a diagonal that runs the other way; past a threshold the
   combined regression line (fit on all points, blind to group) flips
   from falling to rising. Simpson's paradox, made draggable. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const slopeAOut = document.getElementById('slopeAOut');
  const slopeBOut = document.getElementById('slopeBOut');
  const slopeCOut = document.getElementById('slopeCOut');
  const verdictOut = document.getElementById('verdictOut');

  const TAU = Math.PI * 2;

  // ---- the mechanism's fixed constants ----
  const N = 32;               // points per group
  const M_WITHIN = -0.55;     // every group's own trend: fixed, negative
  const NOISE_AMP = 0.4;      // scatter around each group's own line
  const DIR = { x: 1, y: 0.85 }; // the direction groups slide apart in — the other way
  const MAX_SEP = 3.3;        // how far "lever all the way right" pushes the groups

  let sepT = 0;        // 0..1, the one draggable quantity
  let dragging = false;

  // fixed per-point randomness, drawn once — dragging the lever moves the
  // whole group, never reshuffles a point relative to its own group
  function makeGroup() {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = (Math.random() * 2 - 1);
      const n = (Math.random() * 2 - 1) * NOISE_AMP;
      pts.push({ t, n });
    }
    return pts;
  }
  const rawA = makeGroup();
  const rawB = makeGroup();

  function groupCenter(sign, S) {
    return { x: sign * S * DIR.x, y: sign * S * DIR.y };
  }
  function groupPoints(raw, center) {
    return raw.map(p => ({ x: center.x + p.t, y: center.y + M_WITHIN * p.t + p.n }));
  }
  function pointsAt(t) {
    const S = t * MAX_SEP;
    const ptsA = groupPoints(rawA, groupCenter(-1, S));
    const ptsB = groupPoints(rawB, groupCenter(1, S));
    return { ptsA, ptsB };
  }

  function linreg(pts) {
    const n = pts.length;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (const p of pts) { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sy / n };
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    return { slope, intercept };
  }

  function combinedSlopeAt(t) {
    const { ptsA, ptsB } = pointsAt(t);
    return linreg(ptsA.concat(ptsB)).slope;
  }

  // find where the combined slope crosses zero, once, at boot — for the tick mark
  function findFlip() {
    let lo = 0, hi = 1;
    const sLo = combinedSlopeAt(lo), sHi = combinedSlopeAt(hi);
    if (!(sLo < 0 && sHi > 0)) return null;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (combinedSlopeAt(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  const flipT = findFlip();

  // fixed plot domain, sized to fit the widest spread (lever all the way right)
  // so the frame never rescales while dragging — only the clouds move in it
  const domain = (function () {
    const { ptsA, ptsB } = pointsAt(1);
    const all = ptsA.concat(ptsB);
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const p of all) {
      xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x);
      ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y);
    }
    const mx = (xmax - xmin) * 0.14, my = (ymax - ymin) * 0.14;
    return { xmin: xmin - mx, xmax: xmax + mx, ymin: ymin - my, ymax: ymax + my };
  })();

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:     'transparent',
      ink:    F.ink   || '#334155',
      muted:  F.muted || '#64748b',
      faint:  F.faint || 'rgba(15,23,42,0.10)',
      axis:   F.axis  || 'rgba(15,23,42,0.16)',
      a:      F.a     || '#0891b2',
      b:      F.b     || '#6366f1',
      fillA:  F.fillA || 'rgba(8,145,178,0.42)',
      fillB:  F.fillB || 'rgba(99,102,241,0.20)',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(360, Math.min(500, Math.round(cssW * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.cx = cssW / 2;
    g.leverY = 28;
    g.trackW = Math.min(240, cssW * 0.46);
    g.trackX0 = g.cx - g.trackW / 2;

    g.plotTop = 62;
    g.plotBottom = cssH - 40;
    g.plotLeft = 46;
    g.plotRight = cssW - 18;

    const plotW = g.plotRight - g.plotLeft;
    const plotH = g.plotBottom - g.plotTop;
    const scaleX = plotW / (domain.xmax - domain.xmin);
    const scaleY = plotH / (domain.ymax - domain.ymin);
    g.scale = Math.min(scaleX, scaleY);
    g.dcx = (domain.xmin + domain.xmax) / 2;
    g.dcy = (domain.ymin + domain.ymax) / 2;
    g.pcx = (g.plotLeft + g.plotRight) / 2;
    g.pcy = (g.plotTop + g.plotBottom) / 2;
  }

  function toPx(x, y) {
    return { x: g.pcx + (x - g.dcx) * g.scale, y: g.pcy - (y - g.dcy) * g.scale };
  }

  function drawLine(slope, intercept, x0, x1) {
    const p0 = toPx(x0, slope * x0 + intercept);
    const p1 = toPx(x1, slope * x1 + intercept);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    // axes through data zero
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    const originPx = toPx(0, 0);
    ctx.beginPath();
    ctx.moveTo(g.plotLeft, originPx.y);
    ctx.lineTo(g.plotRight, originPx.y);
    ctx.moveTo(originPx.x, g.plotTop);
    ctx.lineTo(originPx.x, g.plotBottom);
    ctx.stroke();
    ctx.fillStyle = theme.muted;
    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'right';
    ctx.fillText('x', g.plotRight, originPx.y - 6);
    ctx.textAlign = 'left';
    ctx.fillText('y', originPx.x + 6, g.plotTop + 10);

    const { ptsA, ptsB } = pointsAt(sepT);
    const regA = linreg(ptsA);
    const regB = linreg(ptsB);
    const regC = linreg(ptsA.concat(ptsB));

    function xRange(pts) {
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
      return [lo, hi];
    }

    // the combined trend line, solid, spanning the whole domain — the one that flips
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    drawLine(regC.slope, regC.intercept, domain.xmin, domain.xmax);

    // point clouds
    for (const p of ptsA) {
      const s = toPx(p.x, p.y);
      ctx.fillStyle = theme.fillA;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, TAU); ctx.fill();
    }
    for (const p of ptsB) {
      const s = toPx(p.x, p.y);
      ctx.fillStyle = theme.fillB;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, TAU); ctx.fill();
    }

    // within-group dashed trend lines, on top of the dots, spanning only each
    // group's own x-range — so they read as "the local trend," not the global one
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.a;
    { const [lo, hi] = xRange(ptsA); drawLine(regA.slope, regA.intercept, lo, hi); }
    ctx.strokeStyle = theme.b;
    { const [lo, hi] = xRange(ptsB); drawLine(regB.slope, regB.intercept, lo, hi); }
    ctx.setLineDash([]);

    // the lever
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.trackX0, g.leverY);
    ctx.lineTo(g.trackX0 + g.trackW, g.leverY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // flip-point tick, if this configuration actually crosses zero
    if (flipT != null) {
      const fx = g.trackX0 + flipT * g.trackW;
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx, g.leverY - 9); ctx.lineTo(fx, g.leverY + 9); ctx.stroke();
    }

    const hx = g.trackX0 + sepT * g.trackW;
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(hx, g.leverY, 8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(hx, g.leverY, 3, 0, TAU); ctx.fill();

    ctx.fillStyle = theme.muted;
    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'left';
    ctx.fillText('together', g.trackX0 - 8, g.leverY - 16);
    ctx.textAlign = 'right';
    ctx.fillText('apart', g.trackX0 + g.trackW + 8, g.leverY - 16);
    ctx.textAlign = 'left';

    // readouts
    slopeAOut.textContent = (regA.slope >= 0 ? ' ' : '') + regA.slope.toFixed(2);
    slopeBOut.textContent = (regB.slope >= 0 ? ' ' : '') + regB.slope.toFixed(2);
    slopeCOut.textContent = (regC.slope >= 0 ? ' ' : '') + regC.slope.toFixed(2);
    verdictOut.textContent = regC.slope >= 0 ? 'flipped — rising' : 'falling';
  }

  // ---- interaction ----
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
  function setSepFromX(x) {
    const t = (x - g.trackX0) / g.trackW;
    sepT = Math.min(1, Math.max(0, t));
  }
  function startDrag(e) {
    const x = eventX(e), y = eventY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    setSepFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setSepFromX(eventX(e));
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  resetBtn.addEventListener('click', () => { sepT = 0; });

  // ---- boot ----
  function tick() { draw(); requestAnimationFrame(tick); }
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
