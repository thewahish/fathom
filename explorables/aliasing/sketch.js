/* The Wave Hiding Behind the Dots — Fathom No. 18
   Vanilla canvas, no dependencies. A fixed continuous sine wave (teal) at
   true frequency f0 = 1 Hz. Drag the amber lever to set the sample rate fs
   — the only control. Dark dots mark the samples; the dashed indigo curve
   is the lowest-frequency sine that hits every one of those same dots
   exactly. Below the Nyquist rate (fs < 2*f0) that curve is a genuinely
   different, slower wave, visible between the dots though it agrees on
   every one of them. At or above fs = 2*f0 no such impostor exists and the
   dashed curve locks onto the real one.

   The matching-wave construction: any sinusoid sin(2*pi*d*t) whose signed
   frequency d differs from f0 by an exact integer multiple of fs takes
   identical values at every sample instant t_i = i/fs, because
   fs*t_i = i is always an integer and sin(x + 2*pi*integer) = sin(x). The
   lowest-frequency such d is d = f0 - fs*round(f0/fs) (picking the integer
   multiple of fs nearest f0). At an exact half-integer ratio f0/fs = k+0.5
   the nearest multiple is ambiguous (a genuine, real discontinuity in
   which mirror-image reconstruction wins) — biased here by a hair towards
   the oversampled side, so dragging the lever to exactly the Nyquist tick
   reads as "just barely faithful" rather than flickering. Verified in a
   standalone Node check: samples agree to float noise (~1e-14) across the
   full fs range on both sides of Nyquist, curves coincide exactly (to 0)
   once fs >= 2*f0, and genuinely diverge between samples when aliased. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const trueOut = document.getElementById('trueOut');
  const fsOut = document.getElementById('fsOut');
  const spcOut = document.getElementById('spcOut');
  const seenOut = document.getElementById('seenOut');
  const verdictOut = document.getElementById('verdictOut');

  const TAU = Math.PI * 2;
  const F0 = 1;          // true signal frequency, Hz — fixed, not draggable
  const T = 4;            // seconds of signal shown
  const FS_MIN = 0.4, FS_MAX = 6.5;
  const SNAP_TICKS = [1, 2];
  const SNAP_DIST = 0.045;

  let fs = 1.4;            // sample rate, Hz — the one draggable quantity
  let dragging = false;

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

  // ---- the math ----
  function signedAliasFreq(f0, fsv) {
    const ratio = f0 / fsv;
    // tiny epsilon biases an exact half-integer tie toward the oversampled
    // branch, so landing exactly on the Nyquist tick reads as faithful
    // instead of the (equally real) mirror-image branch.
    const q = Math.round(ratio - 1e-9);
    return f0 - q * fsv; // signed frequency; sign encodes the mirror-flip
  }
  function trueValue(t) { return Math.sin(TAU * F0 * t); }
  function aliasValue(t, fsv) {
    const d = signedAliasFreq(F0, fsv);
    return Math.sin(TAU * d * t);
  }
  function isFaithful(fsv) { return fsv >= 2 * F0 - 1e-9; }

  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(360, Math.min(460, Math.round(cssW * 0.5)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.padX = 26;

    g.leverY = 34;
    g.trackW = Math.min(340, cssW * 0.68);
    g.trackX0 = cssW / 2 - g.trackW / 2;

    g.plotX0 = g.padX;
    g.plotX1 = cssW - g.padX;
    g.plotY0 = g.leverY + 34;
    g.plotY1 = cssH - 34;
    g.midY = (g.plotY0 + g.plotY1) / 2;
    g.ampPx = (g.plotY1 - g.plotY0) / 2 * 0.82;
  }

  function tToX(t) { return g.plotX0 + (t / T) * (g.plotX1 - g.plotX0); }
  function valToY(v) { return g.midY - v * g.ampPx; }
  function fsToX(v) { return g.trackX0 + ((v - FS_MIN) / (FS_MAX - FS_MIN)) * g.trackW; }
  function xToFs(x) { return FS_MIN + ((x - g.trackX0) / g.trackW) * (FS_MAX - FS_MIN); }
  function snappedFs(raw) {
    for (const s of SNAP_TICKS) if (Math.abs(raw - s) < SNAP_DIST) return s;
    return raw;
  }

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }

  // ---- drawing ----
  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    drawLever();

    // aliasing-zone tint on the plot (fs currently below Nyquist)
    if (!isFaithful(fs)) {
      ctx.fillStyle = theme.faint;
      ctx.fillRect(g.plotX0, g.plotY0, g.plotX1 - g.plotX0, g.plotY1 - g.plotY0);
    }

    // zero axis
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.plotX0, g.midY);
    ctx.lineTo(g.plotX1, g.midY);
    ctx.stroke();

    // time ticks
    ctx.strokeStyle = theme.axis;
    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.textAlign = 'center';
    for (let s = 0; s <= T; s++) {
      const x = tToX(s);
      ctx.beginPath();
      ctx.moveTo(x, g.plotY1);
      ctx.lineTo(x, g.plotY1 + 5);
      ctx.stroke();
      ctx.fillText(s + 's', x, g.plotY1 + 18);
    }

    // the "impostor" dashed alias curve, drawn first so the real curve and
    // dots read on top of it
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = theme.indigo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * T;
      const x = tToX(t), y = valToY(aliasValue(t, fs));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // the true continuous wave, solid teal
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * T;
      const x = tToX(t), y = valToY(trueValue(t));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // sample points: thin guide + dark dot, where both curves are forced
    // to agree exactly
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.ink;
    for (let t = 0; t <= T + 1e-9; t += 1 / fs) {
      const x = tToX(t);
      if (x > g.plotX1 + 0.5) break;
      const y = valToY(trueValue(t));
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, g.midY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
    }

    // readouts
    const seen = Math.abs(signedAliasFreq(F0, fs));
    const faithful = isFaithful(fs);
    trueOut.textContent = F0.toFixed(2) + ' Hz';
    fsOut.textContent = fs.toFixed(2) + ' Hz';
    spcOut.textContent = (fs / F0).toFixed(2);
    seenOut.textContent = seen.toFixed(2) + ' Hz';
    verdictOut.textContent = faithful ? 'faithful' : 'ALIASED';
  }

  function drawLever() {
    // tint the safe (faithful) zone at and above the Nyquist tick
    ctx.fillStyle = theme.faint;
    const xNy = fsToX(2), xEnd = fsToX(FS_MAX);
    ctx.fillRect(xNy, g.leverY - 5, xEnd - xNy, 10);

    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.trackX0, g.leverY);
    ctx.lineTo(g.trackX0 + g.trackW, g.leverY);
    ctx.stroke();

    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.5;
    for (const s of SNAP_TICKS) {
      const x = fsToX(s);
      ctx.beginPath();
      ctx.moveTo(x, g.leverY - 8);
      ctx.lineTo(x, g.leverY + 8);
      ctx.stroke();
    }

    const hx = fsToX(fs);
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
    ctx.fillText('slower sampling', g.trackX0, g.leverY + 24);
    ctx.textAlign = 'right';
    ctx.fillText('faster sampling', g.trackX0 + g.trackW, g.leverY + 24);
    ctx.textAlign = 'center';
    ctx.fillText('1×', fsToX(1), g.leverY - 14);
    ctx.fillText(g.trackW < 260 ? '2×' : '2× (Nyquist)', fsToX(2), g.leverY - 14);
    ctx.textAlign = 'left';
  }

  // ---- interaction ----
  function clearPresetHighlight() {
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.remove('on');
  }
  presetSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]');
    if (!b) return;
    fs = parseFloat(b.dataset.preset);
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
  function setFsFromX(x) {
    fs = snappedFs(Math.max(FS_MIN, Math.min(FS_MAX, xToFs(x))));
  }
  function startDrag(e) {
    const { x, y } = eventXY(e);
    if (!nearLever(x, y)) return;
    dragging = true;
    clearPresetHighlight();
    setFsFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setFsFromX(eventXY(e).x);
    e.preventDefault();
  }
  function endDrag() { dragging = false; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

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
