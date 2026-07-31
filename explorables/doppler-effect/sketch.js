/* The Wave That Piles Up Ahead of You — Fathom No. 11
   Vanilla canvas, no dependencies. A source travels along a line at a
   constant speed (a multiple of the wave speed c) and fires an expanding
   ring at a fixed rate. The rings never learn the source's speed — they
   always grow at exactly c — so they end up bunched ahead of the source
   and spread out behind it. Two fixed listener posts measure how often
   rings actually arrive; that measured rate is checked live against the
   closed-form Doppler ratio. Push the source past c and the rings can no
   longer get in front of it at all — they pile into a trailing V instead. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const presetSeg = document.getElementById('preset');
  const speedOut = document.getElementById('speedOut');
  const aheadOut = document.getElementById('aheadOut');
  const behindOut = document.getElementById('behindOut');

  const TAU = Math.PI * 2;
  const C = 1;                 // wave speed, in "c" units
  const T0 = 0.5;               // seconds between emissions -> f0 = 2/s
  const VMIN = -1.8, VMAX = 1.8;
  const SNAP_TICKS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  const SNAP_DIST = 0.045;

  let v = 0.5;                  // source speed, multiple of c
  let dragging = false;
  let playing = true;
  let simT = 0;
  let emitAcc = 0;
  let fronts = [];              // {x0, y0, tEmit, prevR}
  let flashLeft = -10, flashRight = -10; // simT of last arrival, for the flash pulse

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
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
    const cssH = Math.max(360, Math.min(460, Math.round(cssW * 0.46)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 26;
    g.cx = cssW / 2;

    g.leverY = 34;
    g.trackW = Math.min(340, cssW * 0.66);
    g.trackX0 = g.cx - g.trackW / 2;

    g.lineY = Math.round(cssH * 0.6);
    g.leftX = g.pad;
    g.rightX = cssW - g.pad;
    g.margin = 55; // how far past the visible edge the source travels before wrapping
    g.span = (g.rightX + g.margin) - (g.leftX - g.margin);

    g.px = Math.max(70, Math.min(120, cssW / 7.5)); // pixels per second at v = 1c
    g.obsY = g.lineY - Math.min(70, cssH * 0.16);
    g.obsLeftX = g.leftX + 40;
    g.obsRightX = g.rightX - 40;

    if (sourceX === undefined) resetSource();
  }

  let sourceX;
  function resetSource() {
    sourceX = v >= 0 ? g.leftX - g.margin : g.rightX + g.margin;
  }

  function vToX(vv) { return g.trackX0 + ((vv - VMIN) / (VMAX - VMIN)) * g.trackW; }
  function xToV(x) { return VMIN + ((x - g.trackX0) / g.trackW) * (VMAX - VMIN); }

  function snappedV(raw) {
    for (const t of SNAP_TICKS) if (Math.abs(raw - t) < SNAP_DIST) return t;
    return raw;
  }

  // ---- physics ----
  function ratioAhead(vv) {
    // observer the source is moving toward; undefined (shock) at |v| >= c
    const denom = C - Math.abs(vv);
    if (denom <= 0.02) return null;
    return C / denom;
  }
  function ratioBehind(vv) {
    return C / (C + Math.abs(vv));
  }

  function step(dt) {
    if (!playing) return;
    simT += dt;

    sourceX += v * g.px * dt;
    if (sourceX > g.rightX + g.margin) sourceX -= g.span;
    if (sourceX < g.leftX - g.margin) sourceX += g.span;

    emitAcc += dt;
    while (emitAcc >= T0) {
      fronts.push({ x0: sourceX, y0: g.lineY, tEmit: simT, prevR: 0 });
      emitAcc -= T0;
    }

    const maxR = Math.hypot(g.W, g.H) + g.margin;
    for (const f of fronts) {
      const r = (simT - f.tEmit) * g.px * C;
      checkObserver(f, g.obsLeftX, g.obsY, r, 'left');
      checkObserver(f, g.obsRightX, g.obsY, r, 'right');
      f.prevR = r;
    }
    fronts = fronts.filter(f => (simT - f.tEmit) * g.px * C < maxR);
  }

  const arrivals = { left: [], right: [] };
  function checkObserver(f, ox, oy, r, side) {
    const dist = Math.hypot(ox - f.x0, oy - f.y0);
    if (f.prevR < dist && r >= dist) {
      const arr = arrivals[side];
      arr.push(simT);
      if (arr.length > 5) arr.shift();
      if (side === 'left') flashLeft = simT; else flashRight = simT;
    }
  }
  function measuredRatio(side) {
    const arr = arrivals[side];
    if (arr.length < 2) return null;
    let sum = 0, n = 0;
    for (let i = 1; i < arr.length; i++) { sum += arr[i] - arr[i - 1]; n++; }
    const meanInterval = sum / n;
    if (meanInterval <= 0) return null;
    return T0 / meanInterval;
  }

  // ---- drawing ----
  function fmtRatio(r) {
    return r == null ? '—' : r.toFixed(2) + '×';
  }

  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    // travel line
    ctx.strokeStyle = theme.faint;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.leftX, g.lineY);
    ctx.lineTo(g.rightX, g.lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // wavefronts
    const maxR = Math.hypot(g.W, g.H) * 0.65;
    ctx.lineWidth = 1.6;
    for (const f of fronts) {
      const r = (simT - f.tEmit) * g.px * C;
      if (r <= 0) continue;
      const alpha = Math.max(0, 1 - r / maxR);
      ctx.strokeStyle = theme.teal.startsWith('#') ? hexA(theme.teal, alpha * 0.85) : theme.teal;
      ctx.beginPath();
      ctx.arc(f.x0, f.y0, r, 0, TAU);
      ctx.stroke();
    }

    // Mach cone once supersonic
    if (Math.abs(v) >= 1.001) {
      const dir = Math.sign(v);
      const mu = Math.asin(Math.min(1, C / Math.abs(v)));
      const len = Math.hypot(W, H) * 1.2;
      const d1x = -dir * Math.cos(mu), d1y = -Math.sin(mu);
      const d2x = -dir * Math.cos(mu), d2y = Math.sin(mu);
      ctx.strokeStyle = hexA(theme.indigo, 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sourceX, g.lineY);
      ctx.lineTo(sourceX + d1x * len, g.lineY + d1y * len);
      ctx.moveTo(sourceX, g.lineY);
      ctx.lineTo(sourceX + d2x * len, g.lineY + d2y * len);
      ctx.stroke();
    }

    // observer posts
    drawObserver(g.obsLeftX, g.obsY, flashLeft);
    drawObserver(g.obsRightX, g.obsY, flashRight);

    // source
    if (sourceX > g.leftX - 14 && sourceX < g.rightX + 14) {
      ctx.fillStyle = theme.teal;
      ctx.beginPath();
      ctx.arc(sourceX, g.lineY, 5.5, 0, TAU);
      ctx.fill();
      // little direction wedge
      if (Math.abs(v) > 0.02) {
        const dir = Math.sign(v);
        ctx.beginPath();
        ctx.moveTo(sourceX + dir * 10, g.lineY);
        ctx.lineTo(sourceX + dir * 2, g.lineY - 4);
        ctx.lineTo(sourceX + dir * 2, g.lineY + 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawLever();

    // readouts
    const dirLabel = Math.abs(v) < 0.02 ? 'stationary' : (v > 0 ? '→' : '←');
    speedOut.textContent = Math.abs(v).toFixed(2) + 'c ' + dirLabel;

    const aheadSide = v >= 0 ? 'right' : 'left';
    const behindSide = v >= 0 ? 'left' : 'right';
    const aPred = ratioAhead(v);
    const bPred = ratioBehind(v);
    const aMeas = measuredRatio(aheadSide);
    const bMeas = measuredRatio(behindSide);
    aheadOut.textContent = aPred == null
      ? 'shock front (meas ' + fmtRatio(aMeas) + ')'
      : 'pred ' + fmtRatio(aPred) + ' · meas ' + fmtRatio(aMeas);
    behindOut.textContent = 'pred ' + fmtRatio(bPred) + ' · meas ' + fmtRatio(bMeas);
  }

  function drawObserver(x, y, flashAt) {
    const sinceFlash = simT - flashAt;
    const flashing = sinceFlash >= 0 && sinceFlash < 0.35;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, g.lineY + 8);
    ctx.stroke();
    if (flashing) {
      const t = sinceFlash / 0.35;
      ctx.strokeStyle = hexA(theme.indigo, 1 - t);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 10, 6 + t * 12, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = flashing ? theme.indigo : theme.muted;
    ctx.beginPath();
    ctx.arc(x, y - 10, 5, 0, TAU);
    ctx.fill();
  }

  function drawLever() {
    // supersonic shading beyond |v| = 1
    ctx.fillStyle = theme.faint;
    const x1 = vToX(-VMAX), xNeg1 = vToX(-1), xPos1 = vToX(1), x2 = vToX(VMAX);
    ctx.fillRect(x1, g.leverY - 5, xNeg1 - x1, 10);
    ctx.fillRect(xPos1, g.leverY - 5, x2 - xPos1, 10);

    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.trackX0, g.leverY);
    ctx.lineTo(g.trackX0 + g.trackW, g.leverY);
    ctx.stroke();

    // tick at 0 and at +-1 (the sound-barrier threshold)
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.5;
    for (const t of [0, -1, 1]) {
      const x = vToX(t);
      ctx.beginPath();
      ctx.moveTo(x, g.leverY - 8);
      ctx.lineTo(x, g.leverY + 8);
      ctx.stroke();
    }

    const hx = vToX(v);
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(hx, g.leverY, 8, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx, g.leverY, 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.textAlign = 'left';
    ctx.fillText('← behind', g.trackX0, g.leverY + 24);
    ctx.textAlign = 'right';
    ctx.fillText('ahead →', g.trackX0 + g.trackW, g.leverY + 24);
    ctx.textAlign = 'center';
    ctx.fillText('c', vToX(1), g.leverY - 14);
    ctx.fillText('c', vToX(-1), g.leverY - 14);
    ctx.textAlign = 'left';
  }

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }

  // ---- loop ----
  let lastT = null;
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    step(dt);
    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.classList.toggle('primary', on);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));

  function clearPresetHighlight() {
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.remove('on');
  }
  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    v = parseFloat(b.dataset.preset);
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function nearLever(x, y) {
    return Math.abs(y - g.leverY) < 22 && x > g.trackX0 - 20 && x < g.trackX0 + g.trackW + 20;
  }
  function setVFromX(x) {
    v = snappedV(Math.max(VMIN, Math.min(VMAX, xToV(x))));
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    clearPresetHighlight();
    setVFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setVFromX(eventXY(e).x);
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  // ---- boot ----
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
