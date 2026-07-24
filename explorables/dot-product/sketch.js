/* The Dot Product, Seen as a Shadow — Fathom No. 04
   Vanilla canvas, no dependencies. Two arrows from a shared origin; drag
   either tip. The dot product is drawn as the shadow one vector casts on
   the other's line, times that line's length — sign flips past 90°. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const magAOut = document.getElementById('magAOut');
  const magBOut = document.getElementById('magBOut');
  const angleOut = document.getElementById('angleOut');
  const dotOut = document.getElementById('dotOut');

  const TAU = Math.PI * 2;
  const UNIT = 70; // pixels per one "unit" of length, for readouts

  // vector tips, stored as pixel offsets from the origin, y-up
  let A = { x: 0, y: 0 };
  let B = { x: 0, y: 0 };
  let dragging = null; // 'A' | 'B' | null

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:    'transparent',
      axis:  F.axis   || 'rgba(15,23,42,0.16)',
      faint: F.faint  || 'rgba(15,23,42,0.10)',
      ink:   F.ink    || '#334155',
      muted: F.muted  || '#64748b',
      a:     F.a      || '#0891b2',   // vector A (teal)
      b:     F.b      || '#6366f1',   // vector B (indigo)
      fillA: F.fillA  || 'rgba(8,145,178,0.42)',
      fillB: F.fillB  || 'rgba(99,102,241,0.20)',
      amber: F.handle || '#d97706',
      glow:  F.handleGlow || 'rgba(217,119,6,0.40)'
    };
  }
  readTheme();

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(340, Math.min(460, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 28;
    g.ox = cssW / 2;
    g.oy = cssH / 2;
    g.rMax = Math.min(cssW / 2, cssH / 2) - g.pad;
    g.minLen = UNIT * 0.35;

    if (!g.inited) {
      A = { x: 2.5 * UNIT, y: 0.55 * UNIT };
      B = { x: 0.6 * UNIT, y: 1.9 * UNIT };
      g.inited = true;
    }
    clampVec(A);
    clampVec(B);
  }

  function clampVec(v) {
    const len = Math.hypot(v.x, v.y);
    if (len > g.rMax) { v.x *= g.rMax / len; v.y *= g.rMax / len; }
    else if (len < g.minLen) {
      const s = g.minLen / (len || 1);
      v.x *= s; v.y *= s;
    }
  }

  function toScreen(v) { return { x: g.ox + v.x, y: g.oy - v.y }; }

  function draw() {
    const { W, H, ox, oy, rMax } = g;
    ctx.clearRect(0, 0, W, H);

    // reference grid: concentric unit circles + axis cross
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    const rings = Math.floor(rMax / UNIT);
    for (let k = 1; k <= rings; k++) {
      ctx.beginPath(); ctx.arc(ox, oy, k * UNIT, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = theme.axis;
    ctx.beginPath();
    ctx.moveTo(g.pad, oy); ctx.lineTo(W - g.pad, oy);
    ctx.moveTo(ox, g.pad); ctx.lineTo(ox, H - g.pad);
    ctx.stroke();

    const lenA = Math.hypot(A.x, A.y);
    const lenB = Math.hypot(B.x, B.y);
    const uA = { x: A.x / lenA, y: A.y / lenA };
    const dotPx = A.x * B.x + A.y * B.y;
    const projPx = dotPx / lenA; // signed length of B's shadow on A's line

    // dashed guide line through A's direction, both ways across the stage
    const span = Math.max(W, H) * 1.5;
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - uA.x * span, oy + uA.y * span);
    ctx.lineTo(ox + uA.x * span, oy - uA.y * span);
    ctx.stroke();
    ctx.setLineDash([]);

    // foot of the perpendicular (the shadow point) in pixel offset + screen space
    const P = { x: uA.x * projPx, y: uA.y * projPx };
    const Pscr = toScreen(P);
    const Bscr = toScreen(B);
    const Ascr = toScreen(A);

    // triangle O–P–Btip, tinted, ties the perpendicular drop to an area
    ctx.fillStyle = theme.fillB;
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(Pscr.x, Pscr.y); ctx.lineTo(Bscr.x, Bscr.y);
    ctx.closePath(); ctx.fill();

    // perpendicular drop from B's tip to the shadow point
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = theme.b;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(Bscr.x, Bscr.y); ctx.lineTo(Pscr.x, Pscr.y); ctx.stroke();
    ctx.setLineDash([]);

    // the shadow itself: a thick bar from the origin to P, along A's line
    ctx.strokeStyle = theme.fillA;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(Pscr.x, Pscr.y); ctx.stroke();
    ctx.lineCap = 'butt';

    // small marker at the origin, so a negative (behind-origin) shadow reads clearly
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, TAU); ctx.fill();

    // vector A
    drawArrow(ox, oy, Ascr.x, Ascr.y, theme.a, 3);
    // vector B
    drawArrow(ox, oy, Bscr.x, Bscr.y, theme.b, 3);

    // amber grabbable tips
    handle(Ascr.x, Ascr.y);
    handle(Bscr.x, Bscr.y);

    // readouts
    magAOut.textContent = (lenA / UNIT).toFixed(2);
    magBOut.textContent = (lenB / UNIT).toFixed(2);
    const cosT = Math.max(-1, Math.min(1, dotPx / (lenA * lenB)));
    const angDeg = Math.acos(cosT) * 180 / Math.PI;
    angleOut.textContent = angDeg.toFixed(0) + '°';
    const dotUnits = dotPx / (UNIT * UNIT);
    dotOut.textContent = (dotUnits >= 0 ? ' ' : '') + dotUnits.toFixed(2);
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
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  }

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: px - g.ox, y: -(py - g.oy) }; // pixel offset from origin, y-up
  }

  function startDrag(e) {
    const p = localXY(e);
    const dA = Math.hypot(p.x - A.x, p.y - A.y);
    const dB = Math.hypot(p.x - B.x, p.y - B.y);
    const near = Math.min(dA, dB);
    if (near > 30) return;
    dragging = dA <= dB ? 'A' : 'B';
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const p = localXY(e);
    const v = dragging === 'A' ? A : B;
    v.x = p.x; v.y = p.y;
    clampVec(v);
    e.preventDefault();
  }
  function endDrag() { dragging = null; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  resetBtn.addEventListener('click', () => {
    A = { x: 2.5 * UNIT, y: 0.55 * UNIT };
    B = { x: 0.6 * UNIT, y: 1.9 * UNIT };
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
