/* The Determinant, Seen as Area — Fathom No. 22
   Vanilla canvas, no dependencies. Two arrows u, v from a shared origin —
   the two columns of a 2x2 matrix. The parallelogram they span IS the
   determinant: base (|u|) times height (v's perpendicular distance off
   the line through u), signed by which side v falls on. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const baseOut = document.getElementById('baseOut');
  const heightOut = document.getElementById('heightOut');
  const areaOut = document.getElementById('areaOut');
  const detOut = document.getElementById('detOut');

  const TAU = Math.PI * 2;
  const UNIT = 60; // pixels per one "unit" of length, for readouts + grid

  // vector tips, stored as pixel offsets from the origin, y-up (math coords)
  let u = { x: 0, y: 0 };
  let v = { x: 0, y: 0 };
  let dragging = null; // 'u' | 'v' | null

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:    'transparent',
      axis:  F.axis   || 'rgba(15,23,42,0.16)',
      faint: F.faint  || 'rgba(15,23,42,0.10)',
      ink:   F.ink    || '#334155',
      muted: F.muted  || '#64748b',
      a:     F.a      || '#0891b2',   // vector u (teal)
      b:     F.b      || '#6366f1',   // vector v (indigo)
      fillA: F.fillA  || 'rgba(8,145,178,0.30)',
      fillB: F.fillB  || 'rgba(99,102,241,0.30)',
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
      u = { x: 2.6 * UNIT, y: 0.5 * UNIT };
      v = { x: 0.7 * UNIT, y: 1.9 * UNIT };
      g.inited = true;
    }
    clampVec(u);
    clampVec(v);
  }

  function clampVec(p) {
    const len = Math.hypot(p.x, p.y);
    if (len > g.rMax) { p.x *= g.rMax / len; p.y *= g.rMax / len; }
    else if (len < g.minLen) {
      const s = g.minLen / (len || 1);
      p.x *= s; p.y *= s;
    }
  }

  function toScreen(p) { return { x: g.ox + p.x, y: g.oy - p.y }; }

  function draw() {
    const { W, H, ox, oy, rMax } = g;
    ctx.clearRect(0, 0, W, H);

    // reference grid: unit squares, so area can be eyeballed as squares
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    const nx = Math.ceil((W / 2) / UNIT);
    const ny = Math.ceil((H / 2) / UNIT);
    ctx.beginPath();
    for (let k = -nx; k <= nx; k++) {
      const x = ox + k * UNIT;
      if (x < 0 || x > W) continue;
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    }
    for (let k = -ny; k <= ny; k++) {
      const y = oy + k * UNIT;
      if (y < 0 || y > H) continue;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.strokeStyle = theme.axis;
    ctx.beginPath();
    ctx.moveTo(g.pad, oy); ctx.lineTo(W - g.pad, oy);
    ctx.moveTo(ox, g.pad); ctx.lineTo(ox, H - g.pad);
    ctx.stroke();

    const lenU = Math.hypot(u.x, u.y) || 1e-6;
    const uHat = { x: u.x / lenU, y: u.y / lenU };
    const crossPx = u.x * v.y - u.y * v.x; // signed area in px^2, positive = counterclockwise (u -> v)
    const heightPx = crossPx / lenU; // signed perpendicular distance of v off u's line

    // foot of the perpendicular dropped from v onto the line through u
    const alongPx = u.x * v.x + u.y * v.y; // = dot(u,v)
    const footProj = alongPx / lenU;
    const P = { x: uHat.x * footProj, y: uHat.y * footProj };

    const positive = crossPx >= 0;
    const fill = positive ? theme.fillA : theme.fillB;
    const heightColor = positive ? theme.a : theme.b;

    // screen points
    const O = { x: ox, y: oy };
    const Uscr = toScreen(u);
    const Vscr = toScreen(v);
    const UVscr = toScreen({ x: u.x + v.x, y: u.y + v.y });
    const Pscr = toScreen(P);

    // dashed guide line through u's direction, spanning the whole stage
    const span = Math.max(W, H) * 1.5;
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - uHat.x * span, oy + uHat.y * span);
    ctx.lineTo(ox + uHat.x * span, oy - uHat.y * span);
    ctx.stroke();
    ctx.setLineDash([]);

    // the parallelogram itself
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(Uscr.x, Uscr.y);
    ctx.lineTo(UVscr.x, UVscr.y);
    ctx.lineTo(Vscr.x, Vscr.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = heightColor;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // base bar: thick translucent segment along u, from O to its tip
    ctx.strokeStyle = theme.a;
    ctx.globalAlpha = 0.30;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(Uscr.x, Uscr.y); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;

    // perpendicular drop from v's tip to the foot P — the height
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = heightColor;
    ctx.lineWidth = 1.75;
    ctx.beginPath(); ctx.moveTo(Vscr.x, Vscr.y); ctx.lineTo(Pscr.x, Pscr.y); ctx.stroke();
    ctx.setLineDash([]);

    // small right-angle marker at the foot, only when it isn't degenerate
    if (Math.hypot(Vscr.x - Pscr.x, Vscr.y - Pscr.y) > 6) {
      const s = 8;
      const dirU = { x: uHat.x, y: -uHat.y };
      const dirH = { x: (Vscr.x - Pscr.x), y: (Vscr.y - Pscr.y) };
      const hlen = Math.hypot(dirH.x, dirH.y) || 1;
      const nH = { x: dirH.x / hlen, y: dirH.y / hlen };
      const corner1 = { x: Pscr.x - dirU.x * s, y: Pscr.y - dirU.y * s };
      const corner2 = { x: Pscr.x + nH.x * s, y: Pscr.y + nH.y * s };
      const corner3 = { x: corner1.x + nH.x * s, y: corner1.y + nH.y * s };
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(corner1.x, corner1.y);
      ctx.lineTo(corner3.x, corner3.y);
      ctx.lineTo(corner2.x, corner2.y);
      ctx.stroke();
    }

    // origin marker
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, TAU); ctx.fill();

    // vectors u, v
    drawArrow(O.x, O.y, Uscr.x, Uscr.y, theme.a, 3);
    drawArrow(O.x, O.y, Vscr.x, Vscr.y, theme.b, 3);

    // amber grabbable tips
    handle(Uscr.x, Uscr.y);
    handle(Vscr.x, Vscr.y);

    // readouts
    const baseUnits = lenU / UNIT;
    const heightUnits = heightPx / UNIT;
    const detUnits = crossPx / (UNIT * UNIT);
    baseOut.textContent = baseUnits.toFixed(2);
    heightOut.textContent = (heightUnits >= 0 ? ' ' : '') + heightUnits.toFixed(2);
    areaOut.textContent = Math.abs(detUnits).toFixed(2);
    detOut.textContent = (detUnits >= 0 ? ' ' : '') + detUnits.toFixed(2);
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
    const dU = Math.hypot(p.x - u.x, p.y - u.y);
    const dV = Math.hypot(p.x - v.x, p.y - v.y);
    const near = Math.min(dU, dV);
    if (near > 30) return;
    dragging = dU <= dV ? 'u' : 'v';
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const p = localXY(e);
    const target = dragging === 'u' ? u : v;
    target.x = p.x; target.y = p.y;
    clampVec(target);
    e.preventDefault();
  }
  function endDrag() { dragging = null; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  resetBtn.addEventListener('click', () => {
    u = { x: 2.6 * UNIT, y: 0.5 * UNIT };
    v = { x: 0.7 * UNIT, y: 1.9 * UNIT };
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
