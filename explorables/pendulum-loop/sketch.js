/* The Loop Every Pendulum Draws — Fathom No. 08
   Vanilla canvas, no dependencies. Left: a real pendulum, draggable by its
   bob. Right: the same motion plotted as angle vs. angular velocity — a
   closed loop whose shape is the whole story. The loop is drawn from the
   exact energy-conservation curve (instant feedback while dragging); the
   bright dot then traces it live from the actual simulated swing. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const angleOut = document.getElementById('angleOut');
  const periodOut = document.getElementById('periodOut');
  const presetSeg = document.getElementById('preset');

  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;
  const G = 9.8, L = 1;
  const OMEGA0 = Math.sqrt(G / L);       // small-angle angular frequency
  const MAX_DRAG = 178 * Math.PI / 180;  // never let it reach the true separatrix

  let theta0 = 90 * Math.PI / 180; // release angle (amplitude) of the current swing
  let theta = theta0, thetaDot = 0;
  let dragging = false;
  let lastT = null;

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
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)'
    };
  }
  readTheme();

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- pendulum physics ----
  // Energy conservation for a swing released from rest at theta0:
  //   thetaDot^2 = 2*OMEGA0^2*(cos(theta) - cos(theta0))
  function thetaDotAt(th, th0) {
    const v2 = 2 * OMEGA0 * OMEGA0 * (Math.cos(th) - Math.cos(th0));
    return Math.sqrt(Math.max(0, v2));
  }

  // Complete elliptic integral of the first kind via the AGM — a few dozen
  // iterations gives full precision even as k approaches 1.
  function ellipticK(k) {
    let a = 1, b = Math.sqrt(Math.max(0, 1 - k * k));
    for (let i = 0; i < 40; i++) {
      if (Math.abs(a - b) < 1e-13) break;
      const an = (a + b) / 2, bn = Math.sqrt(a * b);
      a = an; b = bn;
    }
    return Math.PI / (2 * a);
  }
  function periodFor(th0mag) {
    if (th0mag < 1e-4) return TAU / OMEGA0;
    const k = Math.sin(th0mag / 2);
    return 4 * ellipticK(k) / OMEGA0;
  }

  function integrate(dt) {
    const nSub = 16;
    const h = dt / nSub;
    for (let i = 0; i < nSub; i++) {
      thetaDot += -(G / L) * Math.sin(theta) * h;
      theta += thetaDot * h;
    }
  }

  // ---- geometry, recomputed on resize ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(320, Math.min(420, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    const narrow = cssW < 480;
    const pad = Math.max(14, Math.min(22, cssW * 0.045));
    const gap = Math.max(14, Math.min(36, cssW * 0.05));
    const leftW = Math.max(120, Math.min(230, cssW * 0.34));
    g.narrow = narrow;

    // the bob can swing almost all the way to straight up, so the pivot has
    // to sit centered, with room above it as well as below.
    g.pivotX = pad + leftW / 2;
    g.pivotY = pad + (cssH - 2 * pad) / 2;
    const vertRadius = (cssH - 2 * pad) / 2 - Math.max(14, (cssH - 2 * pad) * 0.12);
    const horizRadius = leftW / 2 - Math.max(12, leftW * 0.12);
    g.rodR = Math.max(40, Math.min(vertRadius, horizRadius));

    g.phaseX0 = pad + leftW + gap;
    g.phaseX1 = cssW - pad;
    g.phaseY0 = pad + 6;
    g.phaseY1 = cssH - 40;
    g.phaseCx = (g.phaseX0 + g.phaseX1) / 2;
    g.phaseCy = (g.phaseY0 + g.phaseY1) / 2;
    g.phaseHalfW = (g.phaseX1 - g.phaseX0) / 2;
    g.phaseHalfH = (g.phaseY1 - g.phaseY0) / 2;

    g.thetaRangeHalf = Math.PI * 1.04;
    g.wRangeHalf = 2 * OMEGA0 * 1.08;
  }

  function bobXY(th) {
    return { x: g.pivotX + g.rodR * Math.sin(th), y: g.pivotY + g.rodR * Math.cos(th) };
  }
  function phaseXY(th, w) {
    return {
      x: g.phaseCx + (th / g.thetaRangeHalf) * g.phaseHalfW,
      y: g.phaseCy - (w / g.wRangeHalf) * g.phaseHalfH
    };
  }

  // ---- drawing ----
  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);
    drawPendulum();
    drawPhasePlot();
  }

  function drawPendulum() {
    const { pivotX, pivotY, rodR } = g;

    // reference vertical (straight down)
    ctx.strokeStyle = theme.faint;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + rodR + 14); ctx.stroke();
    ctx.setLineDash([]);

    // faint arc showing the swing's full range (-theta0..theta0)
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, rodR, Math.PI / 2 - theta0, Math.PI / 2 + theta0);
    ctx.stroke();
    ctx.setLineDash([]);

    // rod
    const b = bobXY(theta);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(b.x, b.y); ctx.stroke();

    // pivot
    ctx.fillStyle = theme.muted;
    ctx.beginPath(); ctx.arc(pivotX, pivotY, 4.5, 0, TAU); ctx.fill();

    // bob (the grabbable handle)
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
  }

  function drawPhasePlot() {
    const { phaseX0, phaseX1, phaseY0, phaseY1, phaseCx, phaseCy } = g;

    // axes
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(phaseX0, phaseCy); ctx.lineTo(phaseX1, phaseCy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(phaseCx, phaseY0); ctx.lineTo(phaseCx, phaseY1); ctx.stroke();

    // axis tick labels
    ctx.fillStyle = theme.muted;
    ctx.font = `${g.narrow ? 10 : 11}px ${theme.mono || "'IBM Plex Mono', monospace"}`;
    ctx.textAlign = 'center';
    ctx.fillText('-180°', phaseX0 + 4, phaseCy + 16);
    ctx.fillText('0°', phaseCx, phaseCy + 16);
    ctx.fillText('180°', phaseX1 - 8, phaseCy + 16);
    if (!g.narrow) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillText('angle →', phaseX1 - 62, phaseCy - 6);
      ctx.translate(phaseCx + 8, phaseY0 + 4);
      ctx.textAlign = 'left';
      ctx.fillText('↑ speed', 0, 10);
      ctx.restore();
    }

    // the separatrix: the limiting loop as the release angle approaches the
    // top (theta0 -> pi). Every real loop lives strictly inside this curve.
    ctx.strokeStyle = theme.faint;
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const th = -Math.PI + (i / 120) * TAU * 0.998 + 0.002;
      const w = 2 * OMEGA0 * Math.cos(th / 2);
      const p = phaseXY(th, w);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const th = -Math.PI + (i / 120) * TAU * 0.998 + 0.002;
      const w = -2 * OMEGA0 * Math.cos(th / 2);
      const p = phaseXY(th, w);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // the current swing's exact loop (energy conservation curve)
    const N = 140;
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = -theta0 + (i / N) * 2 * theta0;
      const w = thetaDotAt(th, theta0);
      const p = phaseXY(th, w);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    for (let i = N; i >= 0; i--) {
      const th = -theta0 + (i / N) * 2 * theta0;
      const w = -thetaDotAt(th, theta0);
      const p = phaseXY(th, w);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    // release-point marker
    const rel = phaseXY(dragging ? theta : theta0, 0);
    ctx.fillStyle = hexA(theme.indigo, 0.85);
    ctx.beginPath(); ctx.arc(rel.x, rel.y, 4, 0, TAU); ctx.fill();

    // the live dot — actual simulated state, riding the loop in real time
    const live = phaseXY(theta, thetaDot);
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(live.x, live.y, 6, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateReadouts() {
    angleOut.textContent = Math.round(theta0 * DEG) + '°';
    const T = periodFor(Math.abs(theta0));
    periodOut.textContent = T.toFixed(2) + 's';
  }

  // ---- animation loop ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;
    if (!dragging) integrate(dt);
    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
    };
  }
  function angleFromPivot(x, y) {
    const dx = x - g.pivotX, dy = y - g.pivotY;
    let a = Math.atan2(dx, dy);
    return Math.max(-MAX_DRAG, Math.min(MAX_DRAG, a));
  }
  function nearBob(x, y) {
    const b = bobXY(theta);
    return Math.hypot(x - b.x, y - b.y) < 32;
  }
  function clearPreset() {
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.remove('on');
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!nearBob(x, y)) return;
    dragging = true;
    theta = angleFromPivot(x, y);
    theta0 = theta;
    thetaDot = 0;
    clearPreset();
    updateReadouts();
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    const { x, y } = eventXY(e);
    theta = angleFromPivot(x, y);
    theta0 = theta;
    thetaDot = 0;
    updateReadouts();
    e.preventDefault();
  }
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    theta = theta0;
    thetaDot = 0;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    theta0 = parseFloat(b.dataset.preset) * Math.PI / 180;
    theta = theta0;
    thetaDot = 0;
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
    updateReadouts();
  });

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    updateReadouts();
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
