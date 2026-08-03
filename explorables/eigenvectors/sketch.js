/* The Directions a Matrix Doesn't Turn — Fathom No. 14
   Vanilla canvas, no dependencies. A matrix sends every vector somewhere
   new. Drag an amber-tipped arrow v all the way around a circle; a second
   arrow shows Av, the same vector run through the current matrix. For
   almost every angle the two point in different directions. At one or two
   exact angles — the real eigenvectors, when the matrix has any — Av lands
   back on v's own line, only longer or shorter. Those angles are computed
   from the matrix's actual characteristic equation, never hard-coded, and
   the drag snaps onto them like a magnet. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const resetBtn = document.getElementById('reset');
  const thetaOut = document.getElementById('thetaOut');
  const diffOut = document.getElementById('diffOut');
  const ratioOut = document.getElementById('ratioOut');
  const statusOut = document.getElementById('statusOut');

  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;
  const RAD = Math.PI / 180;
  const DEFAULT_DEG = 25;
  const SNAP_DEG = 4; // magnet radius around an eigen-direction, while dragging

  function eigenInfo(M) {
    const { a, b, c, d } = M;
    const tr = a + d, det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    if (disc < -1e-7) return { real: false };
    const sq = Math.sqrt(Math.max(0, disc));
    const l1 = (tr + sq) / 2;
    const l2 = (tr - sq) / 2;
    const repeated = Math.abs(l1 - l2) < 1e-6;

    function dirFor(l) {
      let vx, vy;
      if (Math.abs(b) > 1e-9) { vx = b; vy = l - a; }
      else if (Math.abs(c) > 1e-9) { vx = l - d; vy = c; }
      else { // diagonal matrix — eigenvector is whichever axis this eigenvalue belongs to
        if (Math.abs(a - l) < Math.abs(d - l)) { vx = 1; vy = 0; } else { vx = 0; vy = 1; }
      }
      const len = Math.hypot(vx, vy) || 1;
      return { x: vx / len, y: vy / len, angle: Math.atan2(vy, vx) };
    }

    if (repeated) return { real: true, repeated: true, dirs: [{ ...dirFor(l1), l: l1 }] };
    return { real: true, repeated: false, dirs: [{ ...dirFor(l1), l: l1 }, { ...dirFor(l2), l: l2 }] };
  }

  function computeMaxNorm(M) {
    let m = 0.0001;
    for (let i = 0; i < 144; i++) {
      const t = i * Math.PI / 72;
      const x = Math.cos(t), y = Math.sin(t);
      const ax = M.a * x + M.b * y, ay = M.c * x + M.d * y;
      const L = Math.hypot(ax, ay);
      if (L > m) m = L;
    }
    return m;
  }

  const R50 = 50 * RAD, R40 = 40 * RAD;
  const PRESETS = {
    stretch:   { a: 1.8, b: 0,   c: 0,   d: 0.6 },
    shear:     { a: 1,   b: 0.8, c: 0,   d: 1   },
    symmetric: { a: 2,   b: 1,   c: 1,   d: 2   },
    rotation:  { a: Math.cos(R50), b: -Math.sin(R50), c: Math.sin(R50), d: Math.cos(R50) },
    spiral:    { a: 0.85 * Math.cos(R40), b: -0.85 * Math.sin(R40), c: 0.85 * Math.sin(R40), d: 0.85 * Math.cos(R40) }
  };
  for (const key in PRESETS) {
    const M = PRESETS[key];
    M.eig = eigenInfo(M);
    M.maxNorm = computeMaxNorm(M);
  }

  let presetKey = 'stretch';
  let theta = DEFAULT_DEG * RAD;
  let dragging = false;

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
      guide:  'rgba(217,119,6,0.32)',
      mono:   F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(360, Math.min(480, Math.round(cssW * 0.56)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 34;
    g.ox = cssW / 2;
    g.oy = cssH / 2;
    g.availR = Math.min(cssW, cssH) / 2 - g.pad;
    if (!g.inited) {
      g.Rv = g.availR / (PRESETS[presetKey].maxNorm * 1.15);
      g.inited = true;
    }
  }

  function toScreen(x, y) { return { x: g.ox + x, y: g.oy - y }; }

  function angDist(a1, a2) {
    let d = Math.abs(a1 - a2) % TAU;
    if (d > Math.PI) d = TAU - d;
    return d;
  }

  function draw() {
    const M = PRESETS[presetKey];
    const targetRv = g.availR / (M.maxNorm * 1.15);
    g.Rv += (targetRv - g.Rv) * 0.12;
    const Rv = g.Rv;

    const v = { x: Math.cos(theta), y: Math.sin(theta) };
    const Av = { x: M.a * v.x + M.b * v.y, y: M.c * v.x + M.d * v.y };
    const lenAv = Math.hypot(Av.x, Av.y);
    const dot = v.x * Av.x + v.y * Av.y;
    const cosPhi = lenAv > 1e-6 ? Math.max(-1, Math.min(1, dot / lenAv)) : 1;
    const diffDeg = Math.acos(cosPhi) * DEG;
    const aligned = M.eig.real && (diffDeg < 3 || diffDeg > 177);

    ctx.clearRect(0, 0, g.W, g.H);

    // grid: unit circle + axes
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(g.ox, g.oy, Rv, 0, TAU); ctx.stroke();
    ctx.strokeStyle = theme.axis;
    ctx.beginPath();
    ctx.moveTo(g.pad * 0.4, g.oy); ctx.lineTo(g.W - g.pad * 0.4, g.oy);
    ctx.moveTo(g.ox, g.pad * 0.4); ctx.lineTo(g.ox, g.H - g.pad * 0.4);
    ctx.stroke();

    // eigen-direction dashed guide lines, if real
    if (M.eig.real) {
      const span = Math.max(g.W, g.H) * 1.3;
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = theme.guide;
      ctx.lineWidth = 1.6;
      for (const dr of M.eig.dirs) {
        const p0 = toScreen(dr.x * span, dr.y * span);
        const p1 = toScreen(-dr.x * span, -dr.y * span);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = '11.5px ' + theme.mono;
      ctx.fillStyle = theme.muted;
      for (const dr of M.eig.dirs) {
        const along = Math.abs(dr.l) * Rv + 16;
        const lp = toScreen(dr.x * along, dr.y * along);
        ctx.textAlign = dr.x >= 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const txt = 'λ=' + dr.l.toFixed(2) + (M.eig.repeated ? ' (double)' : '');
        ctx.fillText(txt, lp.x, lp.y);
      }
    }

    // small arc showing the turn between v and Av
    {
      const angAv = Math.atan2(Av.y, Av.x);
      let sdiff = angAv - theta;
      while (sdiff > Math.PI) sdiff -= TAU;
      while (sdiff < -Math.PI) sdiff += TAU;
      const steps = 20;
      const rArc = 30;
      ctx.strokeStyle = aligned ? theme.amber : theme.muted;
      ctx.globalAlpha = aligned ? 0.9 : 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const tt = theta + sdiff * (i / steps);
        const p = toScreen(Math.cos(tt) * rArc, Math.sin(tt) * rArc);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Av arrow (indigo)
    const AvScr = toScreen(Av.x * Rv, Av.y * Rv);
    drawArrow(g.ox, g.oy, AvScr.x, AvScr.y, theme.indigo, aligned ? 4 : 3);

    // v arrow (teal)
    const vScr = toScreen(v.x * Rv, v.y * Rv);
    drawArrow(g.ox, g.oy, vScr.x, vScr.y, theme.teal, aligned ? 4 : 3);

    // aligned halo
    if (aligned) {
      ctx.strokeStyle = theme.glow;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(g.ox, g.oy); ctx.lineTo(AvScr.x, AvScr.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // amber grabbable handle, on v's tip only
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(vScr.x, vScr.y, 8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(vScr.x, vScr.y, 3, 0, TAU); ctx.fill();

    // readouts
    let deg = theta * DEG % 360; if (deg < 0) deg += 360;
    thetaOut.textContent = deg.toFixed(0) + '°';
    diffOut.textContent = diffDeg.toFixed(0) + '°';
    ratioOut.textContent = lenAv.toFixed(2);
    if (!M.eig.real) {
      statusOut.textContent = 'no real eigenvector';
    } else if (aligned) {
      statusOut.textContent = 'eigenvector · λ=' + dot.toFixed(2);
    } else {
      statusOut.textContent = 'off-axis';
    }
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

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px - g.ox, y: -(py - g.oy) };
  }

  function vHandlePos() {
    return { x: Math.cos(theta) * g.Rv, y: Math.sin(theta) * g.Rv };
  }

  function startDrag(e) {
    const p = localXY(e);
    const hp = vHandlePos();
    const dist = Math.hypot(p.x - hp.x, p.y - hp.y);
    if (dist > 40) return;
    dragging = true;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function moveDrag(e) {
    if (!dragging) return;
    const p = localXY(e);
    let t = Math.atan2(p.y, p.x);
    const M = PRESETS[presetKey];
    if (M.eig.real) {
      const snapRad = SNAP_DEG * RAD;
      for (const dr of M.eig.dirs) {
        const c1 = dr.angle, c2 = dr.angle + Math.PI;
        if (angDist(t, c1) < snapRad) { t = c1; break; }
        if (angDist(t, c2) < snapRad) { t = c2; break; }
      }
    }
    theta = t;
    e.preventDefault();
  }

  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  resetBtn.addEventListener('click', () => { theta = DEFAULT_DEG * RAD; });

  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    presetKey = b.dataset.preset;
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

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
