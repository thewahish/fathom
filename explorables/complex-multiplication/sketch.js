/* The Product That Spins Before It Stretches — Fathom No. 17
   Vanilla canvas, no dependencies. Two arrows from the origin, A and B, both
   complex numbers, both draggable. The product A×B is built with no
   FOIL-ing at all: rotate A by B's own angle, then scale that by B's own
   length. Both steps are keyed directly to B's polar coordinates, so the
   picture *is* the mechanism — multiplying by a complex number is a
   rotate-and-scale operator, and B alone carries both instructions. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const presetGroup = document.getElementById('preset');
  const magAOut = document.getElementById('magAOut');
  const magBOut = document.getElementById('magBOut');
  const angAOut = document.getElementById('angAOut');
  const angBOut = document.getElementById('angBOut');
  const prodOut = document.getElementById('prodOut');

  const TAU = Math.PI * 2;
  const UNIT = 45; // pixels per one "unit" of length

  const MIN_UNITS = 0.4;
  const MAX_UNITS = 2.0;

  // vector tips, stored as pixel offsets from the origin, y-up (so
  // atan2(v.y, v.x) is the ordinary complex-plane angle, ccw positive)
  let A = { x: 0, y: 0 };
  let B = { x: 0, y: 0 };
  let dragging = null; // 'A' | 'B' | null
  let preset = 'free';

  const PRESETS = {
    // B fixed at these unit-length polar values; angle in degrees
    i:      { len: 1,           ang: 90 },
    two:    { len: 2,           ang: 0 },
    onepi:  { len: Math.SQRT2,  ang: 45 }
  };

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:    'transparent',
      axis:  F.axis   || 'rgba(15,23,42,0.16)',
      faint: F.faint  || 'rgba(15,23,42,0.10)',
      ink:   F.ink    || '#334155',
      muted: F.muted  || '#64748b',
      a:     F.a      || '#0891b2',   // A (teal)
      b:     F.b      || '#6366f1',   // B (indigo)
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
    g.pad = 30;
    g.ox = cssW / 2;
    g.oy = cssH / 2;
    g.rMax = Math.min(cssW / 2, cssH / 2) - g.pad;
    g.minLen = UNIT * MIN_UNITS;
    g.maxLen = UNIT * MAX_UNITS;

    if (!g.inited) {
      setVecPolar(A, 1.3, 32 * Math.PI / 180);
      setVecPolar(B, 1.05, -55 * Math.PI / 180);
      g.inited = true;
    }
    clampVec(A);
    clampVec(B);
    fitStage();
  }

  function setVecPolar(v, lenUnits, angRad) {
    v.x = lenUnits * UNIT * Math.cos(angRad);
    v.y = lenUnits * UNIT * Math.sin(angRad);
  }

  function clampVec(v) {
    const len = Math.hypot(v.x, v.y);
    if (len > g.maxLen) { v.x *= g.maxLen / len; v.y *= g.maxLen / len; }
    else if (len < g.minLen) {
      const s = g.minLen / (len || 1);
      v.x *= s; v.y *= s;
    }
  }

  // Keep the product A×B from overflowing the stage: if both vectors are
  // maxed out at once the drawn product could run off the canvas. While
  // free-dragging, scale both vectors down together (proportionally, so
  // the picture stays honest — both just dialed back the same amount).
  // When a preset just set B to an exact value, shrink A instead, so the
  // preset's own number (×2 means |B|=2, full stop) never gets distorted.
  function fitStage(preserve) {
    const lenAu = Math.hypot(A.x, A.y) / UNIT;
    const lenBu = Math.hypot(B.x, B.y) / UNIT;
    const capUnits = (g.rMax / UNIT) * 0.94;
    const prod = lenAu * lenBu;
    if (prod <= capUnits || prod <= 0) return;
    if (preserve === 'B' && lenAu > 0) {
      const s = capUnits / prod; // shrink A only, by the exact overflow ratio
      A.x *= s; A.y *= s;
    } else {
      const s = Math.sqrt(capUnits / prod);
      A.x *= s; A.y *= s; B.x *= s; B.y *= s;
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
    const angA = Math.atan2(A.y, A.x);
    const angB = Math.atan2(B.y, B.x);
    const lenBu = lenB / UNIT;

    // step 1: rotate A by B's own angle (same length as A, new direction)
    const angRot = angA + angB;
    const Arot = { x: lenA * Math.cos(angRot), y: lenA * Math.sin(angRot) };
    // step 2: stretch that by B's own length — the product
    const P = { x: Arot.x * lenBu, y: Arot.y * lenBu };

    const Ascr = toScreen(A);
    const Bscr = toScreen(B);
    const ArotScr = toScreen(Arot);
    const Pscr = toScreen(P);

    // small arc: A's own angle, from the positive x-axis (thin, teal)
    const arcR1 = Math.min(34, lenA * 0.55);
    ctx.strokeStyle = theme.a;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox, oy, arcR1, -angA, 0, angA > 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // small arc: the extra turn added by B's angle, continuing from A's
    // angle out to A's angle + B's angle — this sweep IS B's own angle
    const arcR2 = arcR1 + 9;
    ctx.strokeStyle = theme.b;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, arcR2, -angA, -angRot, angB > 0);
    ctx.stroke();

    // dashed guide ray along the final angle, both ways, faint
    const span = Math.max(W, H) * 1.4;
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const ux = Math.cos(angRot), uy = Math.sin(angRot);
    ctx.moveTo(ox - ux * span, oy + uy * span);
    ctx.lineTo(ox + ux * span, oy - uy * span);
    ctx.stroke();
    ctx.setLineDash([]);

    // step 2's stretch, drawn as a thick translucent bar from the rotated
    // point out to the product — the part of the ray that's new
    ctx.strokeStyle = theme.fillA;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ArotScr.x, ArotScr.y); ctx.lineTo(Pscr.x, Pscr.y); ctx.stroke();
    ctx.lineCap = 'butt';

    // step 1's rotated arrow (dashed teal) — A, turned, not yet stretched
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = theme.a;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ArotScr.x, ArotScr.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.a;
    ctx.beginPath(); ctx.arc(ArotScr.x, ArotScr.y, 4, 0, TAU); ctx.fill();

    // the two input arrows
    drawArrow(ox, oy, Ascr.x, Ascr.y, theme.a, 3);
    drawArrow(ox, oy, Bscr.x, Bscr.y, theme.b, 3);

    // the product — the thick, solid, final arrow
    drawArrow(ox, oy, Pscr.x, Pscr.y, theme.ink, 3.5);

    // amber grabbable tips (only for whichever vectors are actually draggable)
    handle(Ascr.x, Ascr.y);
    if (preset === 'free') handle(Bscr.x, Bscr.y);
    else {
      ctx.fillStyle = theme.b;
      ctx.beginPath(); ctx.arc(Bscr.x, Bscr.y, 5, 0, TAU); ctx.fill();
    }

    // readouts
    magAOut.textContent = (lenA / UNIT).toFixed(2);
    magBOut.textContent = lenBu.toFixed(2);
    angAOut.textContent = Math.round(deg(angA)) + '°';
    angBOut.textContent = Math.round(deg(angB)) + '°';
    const prodLenUnits = (lenA / UNIT) * lenBu;
    const prodAngDeg = wrapDeg(deg(angRot));
    prodOut.textContent = prodLenUnits.toFixed(2) + ' ∠' + Math.round(prodAngDeg) + '°';
  }

  function deg(rad) { return rad * 180 / Math.PI; }
  function wrapDeg(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d; }

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
    const dB = preset === 'free' ? Math.hypot(p.x - B.x, p.y - B.y) : Infinity;
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
    fitStage();
    e.preventDefault();
  }
  function endDrag() { dragging = null; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  resetBtn.addEventListener('click', () => {
    setVecPolar(A, 1.3, 32 * Math.PI / 180);
    if (preset === 'free') setVecPolar(B, 1.05, -55 * Math.PI / 180);
    else applyPreset(preset);
    fitStage();
  });

  function applyPreset(name) {
    preset = name;
    if (name === 'free') return;
    const p = PRESETS[name];
    setVecPolar(B, p.len, p.ang * Math.PI / 180);
    clampVec(B);
    fitStage('B');
  }

  presetGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-preset]');
    if (!btn) return;
    [...presetGroup.children].forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    applyPreset(btn.dataset.preset);
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
