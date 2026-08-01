/* The Shape That's Secretly a Sum of Sines — Fathom No. 12
   Vanilla canvas, no dependencies. Eight sine harmonics, each with a
   draggable amber amplitude lever. Their sum is drawn live as one curve.
   Presets snap the levers to the exact recipe for a square, sawtooth, or
   triangle wave, drawn as a dashed target so the approximation (and its
   Gibbs-phenomenon ringing at sharp corners) is visible against the ideal. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const resetBtn = document.getElementById('reset');
  const presetEl = document.getElementById('preset');
  const matchOut = document.getElementById('matchOut');

  const TAU = Math.PI * 2;
  const N = 8;             // number of harmonics
  const AMP_MAX = 1.35;    // lever range: -AMP_MAX .. +AMP_MAX

  let amps = new Array(N).fill(0);
  amps[0] = 1;             // start on a plain sine — harmonic 1 at full amplitude

  let fromAmps = amps.slice();
  let toAmps = amps.slice();
  let animStart = null;
  const ANIM_MS = 550;

  let activePreset = 'none';
  let targetSamples = null;  // cached ideal curve for the active preset, or null

  let playing = false;
  let phase = 0;
  let dragging = -1;         // index of harmonic currently being dragged, or -1
  let hover = -1;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      ink:     F.ink   || '#334155',
      muted:   F.muted || '#64748b',
      faint:   F.faint || 'rgba(15,23,42,0.10)',
      axis:    F.axis  || 'rgba(15,23,42,0.16)',
      teal:    F.a     || '#0891b2',
      indigo:  F.b     || '#6366f1',
      fillA:   F.fillA || 'rgba(8,145,178,0.42)',
      amber:   F.handle || '#d97706',
      glow:    F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:    F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  // ---- geometry ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(440, Math.min(600, Math.round(cssW * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 20;

    g.graphX0 = g.pad + 6;
    g.graphX1 = cssW - g.pad;
    g.graphY0 = 16;
    g.graphY1 = Math.round(cssH * 0.56);
    g.graphMidY = (g.graphY0 + g.graphY1) / 2;
    g.graphAmpMax = 2.6;  // vertical scale of the graph (sum can exceed 1)

    g.barsY0 = g.graphY1 + 34;
    g.barsY1 = cssH - 30;
    const barsW = g.graphX1 - g.graphX0;
    g.barSpacing = barsW / N;
    g.barTrackTop = g.barsY0;
    g.barTrackBottom = g.barsY1;
  }

  function barCenterX(i) { return g.graphX0 + g.barSpacing * (i + 0.5); }
  function valueToBarY(v) {
    const t = (v + AMP_MAX) / (2 * AMP_MAX); // 0..1, 0 = bottom
    return g.barTrackBottom - t * (g.barTrackBottom - g.barTrackTop);
  }
  function barYToValue(y) {
    const t = (g.barTrackBottom - y) / (g.barTrackBottom - g.barTrackTop);
    return Math.min(AMP_MAX, Math.max(-AMP_MAX, t * 2 * AMP_MAX - AMP_MAX));
  }
  function graphYToPixel(v) {
    return g.graphMidY - (v / g.graphAmpMax) * (g.graphMidY - g.graphY0);
  }

  // ---- the math ----
  // theta domain is [-pi, pi) across the graph width, so a sawtooth is one
  // clean ramp and a triangle peaks symmetrically instead of getting cut
  // by the window edge.
  function thetaAt(x) {
    const t = (x - g.graphX0) / (g.graphX1 - g.graphX0);
    return -Math.PI + t * TAU;
  }
  function sumAt(theta, coeffs, shift) {
    let s = 0;
    for (let n = 1; n <= N; n++) s += coeffs[n - 1] * Math.sin(n * (theta - shift));
    return s;
  }

  function presetCoeff(type, n) {
    if (type === 'square') {
      if (n % 2 === 0) return 0;
      return 4 / (Math.PI * n);
    }
    if (type === 'sawtooth') {
      return (2 / Math.PI) * (n % 2 === 0 ? -1 : 1) / n;
    }
    if (type === 'triangle') {
      if (n % 2 === 0) return 0;
      const k = (n - 1) / 2;
      return (8 / (Math.PI * Math.PI)) * (k % 2 === 0 ? 1 : -1) / (n * n);
    }
    return 0;
  }

  // the ideal (infinitely many harmonics) target curve for the active preset
  function buildTargetSamples(type) {
    if (type === 'none') return null;
    const IDEAL_TERMS = 250;
    const idealCoeffs = new Array(IDEAL_TERMS);
    for (let n = 1; n <= IDEAL_TERMS; n++) idealCoeffs[n - 1] = presetCoeff(type, n);
    const steps = 360;
    const pts = new Array(steps + 1);
    for (let i = 0; i <= steps; i++) {
      const x = g.graphX0 + (i / steps) * (g.graphX1 - g.graphX0);
      const theta = thetaAt(x);
      let s = 0;
      for (let n = 1; n <= IDEAL_TERMS; n++) s += idealCoeffs[n - 1] * Math.sin(n * theta);
      pts[i] = s;
    }
    return pts;
  }

  // ---- animation to a preset / reset ----
  function animateTo(newAmps) {
    fromAmps = currentAmps();
    toAmps = newAmps.slice();
    animStart = performance.now();
  }
  function currentAmps() {
    if (animStart == null) return amps.slice();
    const t = Math.min(1, (performance.now() - animStart) / ANIM_MS);
    const ease = 1 - Math.pow(1 - t, 3);
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = fromAmps[i] + (toAmps[i] - fromAmps[i]) * ease;
    return out;
  }
  function stepAnim() {
    if (animStart == null) return;
    const t = (performance.now() - animStart) / ANIM_MS;
    amps = currentAmps();
    if (t >= 1) { amps = toAmps.slice(); animStart = null; }
  }

  function setPreset(type) {
    activePreset = type;
    for (const btn of presetEl.children) btn.classList.toggle('on', btn.dataset.preset === type);
    if (type === 'none') {
      targetSamples = null;
    } else {
      const target = new Array(N);
      for (let n = 1; n <= N; n++) target[n - 1] = presetCoeff(type, n);
      animateTo(target);
      targetSamples = null; // rebuilt lazily in layout-dependent draw below
    }
  }

  function ensureTargetSamples() {
    if (activePreset !== 'none' && targetSamples === null) {
      targetSamples = buildTargetSamples(activePreset);
    }
  }

  // ---- drawing ----
  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    // graph: zero line + faint amplitude guides
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    for (const v of [-2, -1, 1, 2]) {
      const y = graphYToPixel(v);
      ctx.beginPath();
      ctx.moveTo(g.graphX0, y);
      ctx.lineTo(g.graphX1, y);
      ctx.stroke();
    }
    ctx.strokeStyle = theme.axis;
    ctx.beginPath();
    ctx.moveTo(g.graphX0, g.graphMidY);
    ctx.lineTo(g.graphX1, g.graphMidY);
    ctx.stroke();

    // target (ideal, dashed)
    ensureTargetSamples();
    if (targetSamples) {
      ctx.strokeStyle = theme.indigo;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const steps = targetSamples.length - 1;
      for (let i = 0; i <= steps; i++) {
        const x = g.graphX0 + (i / steps) * (g.graphX1 - g.graphX0);
        const y = graphYToPixel(targetSamples[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ghost curve for the harmonic currently being dragged / hovered
    const spot = dragging >= 0 ? dragging : hover;
    if (spot >= 0) {
      const n = spot + 1;
      ctx.strokeStyle = theme.muted;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const x = g.graphX0 + (i / steps) * (g.graphX1 - g.graphX0);
        const theta = thetaAt(x) - phase;
        const y = graphYToPixel(amps[spot] * Math.sin(n * theta));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // the sum curve — the whole point
    ctx.strokeStyle = theme.teal;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const steps = 360;
    let errAcc = 0;
    for (let i = 0; i <= steps; i++) {
      const x = g.graphX0 + (i / steps) * (g.graphX1 - g.graphX0);
      const theta = thetaAt(x) - phase;
      const v = sumAt(theta, amps, 0);
      const y = graphYToPixel(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      if (targetSamples) {
        const d = v - targetSamples[i];
        errAcc += d * d;
      }
    }
    ctx.stroke();

    if (targetSamples) {
      const rms = Math.sqrt(errAcc / (steps + 1));
      const match = Math.max(0, 100 - rms * 62); // rms=0 -> 100%, scaled so a flat line reads near 0%
      matchOut.textContent = Math.round(match) + '%';
    } else {
      matchOut.textContent = '—';
    }

    // graph border
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.graphX0, g.graphY0, g.graphX1 - g.graphX0, g.graphY1 - g.graphY0);

    // levers
    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      const x = barCenterX(i);
      const zeroY = valueToBarY(0);
      const y = valueToBarY(amps[i]);

      // track
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, g.barTrackTop);
      ctx.lineTo(x, g.barTrackBottom);
      ctx.stroke();

      // zero tick
      ctx.strokeStyle = theme.faint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, zeroY);
      ctx.lineTo(x + 9, zeroY);
      ctx.stroke();

      // filled stem from zero to value
      ctx.strokeStyle = theme.fillA;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, zeroY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // handle
      const active = (i === dragging || i === hover);
      ctx.fillStyle = theme.amber;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = active ? 16 : 10;
      ctx.beginPath();
      ctx.arc(x, y, active ? 8 : 7, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;

      // harmonic number label
      ctx.fillStyle = theme.muted;
      ctx.fillText(String(i + 1), x, g.barTrackBottom + 18);

      // value label near the handle when active
      if (active) {
        ctx.fillStyle = theme.ink;
        ctx.fillText(amps[i].toFixed(2), x, y - 14);
      }
    }
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.fillText('harmonic n', g.graphX0, g.barTrackBottom + 30);
  }

  function tick(t) {
    stepAnim();
    if (playing) phase += 0.012;
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

  resetBtn.addEventListener('click', () => {
    const clean = new Array(N).fill(0);
    clean[0] = 1;
    animateTo(clean);
    setPreset('none');
  });

  presetEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-preset]');
    if (!btn) return;
    setPreset(btn.dataset.preset);
  });

  function eventX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  }
  function eventY(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  }
  function nearestBar(x, y) {
    if (y < g.barTrackTop - 20 || y > g.barTrackBottom + 26) return -1;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(x - barCenterX(i));
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD < g.barSpacing * 0.5 ? best : -1;
  }
  function startDrag(e) {
    const x = eventX(e), y = eventY(e);
    const i = nearestBar(x, y);
    if (i < 0) return;
    dragging = i;
    animStart = null; // manual control cancels any running preset animation
    amps[i] = barYToValue(y);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (dragging >= 0) {
      amps[dragging] = barYToValue(eventY(e));
      e.preventDefault();
      return;
    }
    hover = nearestBar(eventX(e), eventY(e));
  }
  function endDrag() { dragging = -1; canvas.style.cursor = 'grab'; }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', () => { if (dragging < 0) hover = -1; });
  canvas.style.cursor = 'grab';

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => { layout(); targetSamples = activePreset === 'none' ? null : buildTargetSamples(activePreset); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
