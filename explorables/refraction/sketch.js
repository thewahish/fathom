/* The Ray That Bends Because Half of It Arrives Late — Fathom No. 13
   Vanilla canvas, no dependencies. A light ray hits a fixed point on a
   horizontal boundary between two media; drag the amber point above the
   boundary to set the angle of incidence. The refracted (and reflected)
   rays are drawn from real Snell's-law geometry, computed from each
   medium's index of refraction — never asserted, always recomputed live.

   The core visual, beyond the rays themselves: a row of small bent
   "chevrons" straddling the boundary. Each one is a snapshot of a single
   wavefront (a line of constant phase, perpendicular to the ray) crossing
   from one medium into the other. Their anchor points along the boundary
   are spaced by a constant S in BOTH media — that constant spacing is
   exactly the condition "the wave stays continuous, unbroken, across the
   boundary" (n1 sin(t1) = n2 sin(t2) is what makes that spacing come out
   equal). So the chevrons aren't decoration: they're the reason the ray
   bends, drawn directly, not asserted through a formula. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const resetBtn = document.getElementById('reset');
  const theta1Out = document.getElementById('theta1Out');
  const theta2Out = document.getElementById('theta2Out');
  const nOut = document.getElementById('nOut');
  const criticalOut = document.getElementById('criticalOut');

  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;
  const MIN_DEG = 2, MAX_DEG = 86;
  const DEFAULT_DEG = 40;

  const PRESETS = {
    'air-water': { n1: 1.00, n2: 1.33, label: 'air', label2: 'water' },
    'air-glass': { n1: 1.00, n2: 1.50, label: 'air', label2: 'glass' },
    'water-air': { n1: 1.33, n2: 1.00, label: 'water', label2: 'air' },
    'glass-air': { n1: 1.50, n2: 1.00, label: 'glass', label2: 'air' }
  };

  let presetKey = 'air-water';
  let theta1 = DEFAULT_DEG * Math.PI / 180; // signed, radians
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
      fillB:  F.fillB  || 'rgba(99,102,241,0.20)',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(340, Math.min(440, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 20;
    g.ox = cssW / 2;
    g.oy = Math.round(cssH * 0.42);
    g.Rh = Math.max(85, Math.min(140, cssW * 0.22));      // handle arc radius
    g.refrLen = g.Rh * 1.25;                                // refracted/reflected ray length
    g.chevS = Math.max(26, Math.min(40, cssW * 0.055));     // boundary spacing between chevrons
    g.chevL = Math.max(22, Math.min(36, cssW * 0.05));      // chevron leg length
  }

  // ---- physics ----
  function snell() {
    const P = PRESETS[presetKey];
    const sinT1 = Math.sin(theta1);
    const sinT2 = (P.n1 / P.n2) * sinT1;
    const tir = Math.abs(sinT2) > 1;
    const theta2 = tir ? null : Math.asin(Math.max(-1, Math.min(1, sinT2)));
    let thetaC = null;
    if (P.n1 > P.n2) thetaC = Math.asin(P.n2 / P.n1);
    return { P, theta2, tir, thetaC };
  }

  function perpAwayFrom(dir, wantNegY) {
    // returns the unit vector perpendicular to dir, oriented so its y
    // component has the requested sign (negative = "up", into medium 1)
    let p = { x: -dir.y, y: dir.x };
    const hasNegY = p.y < 0;
    if (hasNegY !== wantNegY) p = { x: -p.x, y: -p.y };
    return p;
  }

  // ---- drawing ----
  function draw() {
    const { W, H, ox, oy } = g;
    ctx.clearRect(0, 0, W, H);

    const { P, theta2, tir, thetaC } = snell();

    // medium 2 tint (the denser / slower-to-draw region, purely visual)
    ctx.fillStyle = theme.fillB;
    ctx.fillRect(0, oy, W, H - oy);

    // normal (dashed vertical) through the point of incidence
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, g.pad); ctx.lineTo(ox, H - g.pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // boundary
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();

    const dir1 = { x: Math.sin(theta1), y: Math.cos(theta1) };       // incident travel dir
    const dirR = { x: Math.sin(theta1), y: -Math.cos(theta1) };      // reflected travel dir
    const dir2 = tir ? null : { x: Math.sin(theta2), y: Math.cos(theta2) };

    const T1 = perpAwayFrom(dir1, true);                              // medium-1 wavefront tangent (points up)
    const TR = perpAwayFrom(dirR, true);                              // reflected wavefront tangent (points up)
    const T2 = tir ? null : perpAwayFrom(dir2, false);                // medium-2 wavefront tangent (points down)

    // chevrons: wavefronts kinking as they cross the boundary
    const maxSpan = Math.min(W * 0.46, 230);
    const numK = Math.max(2, Math.floor(maxSpan / g.chevS));
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'miter';
    for (let k = -numK; k <= numK; k++) {
      const xk = ox + k * g.chevS;
      if (xk < g.pad || xk > W - g.pad) continue;
      const legA = { x: xk + T1.x * g.chevL, y: oy + T1.y * g.chevL };
      const legB = tir
        ? { x: xk + TR.x * g.chevL, y: oy + TR.y * g.chevL }
        : { x: xk + T2.x * g.chevL, y: oy + T2.y * g.chevL };
      ctx.strokeStyle = hexA(theme.teal, 0.30);
      ctx.beginPath();
      ctx.moveTo(legA.x, legA.y);
      ctx.lineTo(xk, oy);
      ctx.lineTo(legB.x, legB.y);
      ctx.stroke();
      ctx.fillStyle = theme.axis;
      ctx.beginPath(); ctx.arc(xk, oy, 1.6, 0, TAU); ctx.fill();
    }

    // reflected ray (always drawn; the only ray when TIR)
    const Rend = { x: ox + dirR.x * g.refrLen, y: oy + dirR.y * g.refrLen };
    drawRay(ox, oy, Rend.x, Rend.y, theme.indigo, tir ? 3 : 2, true, tir ? 1 : 0.7);

    // incident ray + handle
    const hx = ox - dir1.x * g.Rh, hy = oy - dir1.y * g.Rh;
    drawRay(hx, hy, ox, oy, theme.teal, 3, false, 1);

    // refracted ray (only if it exists)
    if (!tir) {
      const Tend = { x: ox + dir2.x * g.refrLen, y: oy + dir2.y * g.refrLen };
      drawRay(ox, oy, Tend.x, Tend.y, theme.teal, 3, false, 1);
    }

    // angle arcs
    drawAngleArc(ox, oy, -Math.PI / 2, -Math.PI / 2 - theta1, theme.teal, 26); // between normal(up) and incident
    if (!tir) {
      drawAngleArc(ox, oy, Math.PI / 2, Math.PI / 2 + theta2, theme.teal, 26); // between normal(down) and refracted
    }

    // point of incidence + amber handle
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, TAU); ctx.fill();
    handle(hx, hy);

    // labels
    ctx.fillStyle = theme.muted;
    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'center';
    ctx.fillText(P.label + ' (n=' + P.n1.toFixed(2) + ')', ox, oy - (oy - g.pad) * 0.5);
    ctx.fillText(P.label2 + ' (n=' + P.n2.toFixed(2) + ')', ox, oy + (H - oy) * 0.82);
    if (tir) {
      ctx.fillStyle = hexA(theme.indigo, 0.9);
      ctx.font = 'bold 13px ' + theme.mono;
      ctx.fillText('total internal reflection', ox, oy + 26);
    }

    // readouts
    theta1Out.textContent = Math.round(Math.abs(theta1) * DEG) + '°';
    theta2Out.textContent = tir ? 'TIR' : Math.round(Math.abs(theta2) * DEG) + '°';
    nOut.textContent = P.n1.toFixed(2) + ' · ' + P.n2.toFixed(2);
    criticalOut.textContent = thetaC == null ? '—' : Math.round(thetaC * DEG) + '°';
  }

  function drawRay(x0, y0, x1, y1, color, w, dashed, alpha) {
    ctx.strokeStyle = hexA(color, alpha);
    ctx.lineWidth = w;
    if (dashed) ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([]);
    // arrowhead partway along, so it stays visible even if the ray runs offscreen
    const t = Math.min(1, 60 / Math.max(1, Math.hypot(x1 - x0, y1 - y0)));
    const ax = x0 + (x1 - x0) * Math.max(t, 0.5);
    const ay = y0 + (y1 - y0) * Math.max(t, 0.5);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const head = 9;
    ctx.fillStyle = hexA(color, alpha);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - head * Math.cos(ang - 0.4), ay - head * Math.sin(ang - 0.4));
    ctx.lineTo(ax - head * Math.cos(ang + 0.4), ay - head * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function drawAngleArc(cx, cy, a0, a1, color, r) {
    ctx.strokeStyle = hexA(color, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1, a1 < a0);
    ctx.stroke();
  }

  function handle(x, y) {
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  }

  // ---- interaction ----
  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function angleFromNormal(x, y) {
    const dx = x - g.ox, dy = Math.max(g.oy - y, 0.0001);
    return Math.atan2(dx, dy);
  }
  function clampAngle(a) {
    const s = a < 0 ? -1 : 1;
    const min = MIN_DEG * Math.PI / 180, max = MAX_DEG * Math.PI / 180;
    return s * Math.min(max, Math.max(min, Math.abs(a)));
  }
  function handleXY() {
    const dir1 = { x: Math.sin(theta1), y: Math.cos(theta1) };
    return { x: g.ox - dir1.x * g.Rh, y: g.oy - dir1.y * g.Rh };
  }
  function nearHandle(x, y) {
    const h = handleXY();
    return Math.hypot(x - h.x, y - h.y) < 34;
  }
  function clearPreset() {
    for (const b of presetSeg.querySelectorAll('button')) b.classList.remove('on');
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!nearHandle(x, y)) return;
    dragging = true;
    theta1 = clampAngle(angleFromNormal(x, y));
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x, y } = eventXY(e);
    theta1 = clampAngle(angleFromNormal(x, y));
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    presetKey = b.dataset.preset;
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

  resetBtn.addEventListener('click', () => {
    theta1 = DEFAULT_DEG * Math.PI / 180;
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
