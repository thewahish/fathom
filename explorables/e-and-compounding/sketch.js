/* The Number Compound Interest Can't Get Past — Fathom No. 05
   Vanilla canvas, no dependencies. Left panel: the curve of (1+1/n)^n as n
   (compounding periods/year) grows, flattening toward e. Drag the amber dot
   along that curve. Right panel: the same n rendered as an actual year of
   compounding, a staircase chasing a dashed continuous-growth curve. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const presetSeg = document.getElementById('preset');
  const nOut = document.getElementById('nOut');
  const valOut = document.getElementById('valOut');
  const gapOut = document.getElementById('gapOut');

  const NMAX = 3000;      // "every instant" cap — compounding roughly every 3 hours
  const LOG_NMAX = Math.log(NMAX);
  const E = Math.E;
  const Y_TOP_VAL = E + 0.035;   // a little headroom above the asymptote
  const Y_BOT_VAL = 1;           // the starting dollar

  let curLogN = Math.log(12);    // rendered / dragged position (log space)
  let targetLogN = curLogN;      // preset lerp target
  let dragging = false;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      bg:    'transparent',
      axis:  F.axis   || 'rgba(15,23,42,0.16)',
      faint: F.faint  || 'rgba(15,23,42,0.10)',
      ink:   F.ink    || '#334155',
      muted: F.muted  || '#64748b',
      a:     F.a      || '#0891b2',   // the limit curve + staircase reference
      b:     F.b      || '#6366f1',   // the actual staircase
      amber: F.handle || '#d97706',
      glow:  F.handleGlow || 'rgba(217,119,6,0.40)',
      sans:  F.sans   || "'Inter Tight', system-ui, sans-serif",
      mono:  F.mono   || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

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
    const pad = 24;
    const gap = 46;
    const avail = cssW - 2 * pad - gap;
    const leftW = Math.max(150, Math.round(avail * 0.4));
    g.pad = pad;
    g.L0 = pad; g.L1 = pad + leftW;
    g.R0 = g.L1 + gap; g.R1 = cssW - pad;
    g.top = 26;
    g.bottom = cssH - 34;
  }

  function valueForN(n) { return Math.pow(1 + 1 / n, n); }
  function valueToY(v) {
    return g.bottom - (v - Y_BOT_VAL) / (Y_TOP_VAL - Y_BOT_VAL) * (g.bottom - g.top);
  }
  function xForLogN(logN) { return g.L0 + (logN / LOG_NMAX) * (g.L1 - g.L0); }
  function logNForX(x) {
    const f = clamp((x - g.L0) / (g.L1 - g.L0), 0, 1);
    return f * LOG_NMAX;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function draw() {
    const { W, H, L0, L1, R0, R1, bottom } = g;
    ctx.clearRect(0, 0, W, H);

    const n = Math.exp(curLogN);
    const nDisplay = Math.max(1, Math.round(n));
    const curVal = valueForN(n);

    // baseline: value = 1, the starting dollar, across the whole stage
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    line(g.pad, valueToY(1), R1, valueToY(1));

    // faint guide: value = 2, what one lump-sum yearly compounding gives you
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = theme.faint;
    line(g.pad, valueToY(2), R1, valueToY(2));
    ctx.setLineDash([]);
    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.textAlign = 'left';
    ctx.fillText('2× (once a year)', L0 + 58, valueToY(2) - 6);

    // the wall: value = e, across the whole stage
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = hexA(theme.ink, 0.45);
    ctx.lineWidth = 1.3;
    line(g.pad, valueToY(E), R1, valueToY(E));
    ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.ink;
    ctx.fillText('e ≈ 2.718281828…', R1, valueToY(E) - 7);

    // ---- left panel: the limit curve ----
    ctx.strokeStyle = theme.a;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = L0; x <= L1; x++) {
      const nx = Math.exp(logNForX(x));
      const y = valueToY(valueForN(nx));
      if (x === L0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // x-axis ticks for n
    ctx.font = '10.5px ' + theme.mono;
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'center';
    for (const tn of [1, 10, 100, 1000]) {
      const tx = xForLogN(Math.log(tn));
      ctx.strokeStyle = theme.faint;
      ctx.beginPath(); ctx.moveTo(tx, bottom); ctx.lineTo(tx, bottom + 5); ctx.stroke();
      ctx.fillText(tn >= 1000 ? '1,000' : String(tn), tx, bottom + 17);
    }
    ctx.textAlign = 'left';
    ctx.fillText('n (compounding periods per year, log scale) →', L0, bottom + 32);

    // ---- right panel: the actual year, staircase vs. continuous ----
    // dashed continuous-growth reference e^t
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = hexA(theme.a, 0.55);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = R0; x <= R1; x++) {
      const t = (x - R0) / (R1 - R0);
      const y = valueToY(Math.exp(t));
      if (x === R0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // solid staircase for nDisplay actual compounding periods
    ctx.strokeStyle = theme.b;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = R0; x <= R1; x++) {
      const t = (x - R0) / (R1 - R0);
      const k = Math.min(nDisplay, Math.floor(t * nDisplay));
      const y = valueToY(Math.pow(1 + 1 / nDisplay, k));
      if (x === R0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.font = '10.5px ' + theme.mono;
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'left';
    ctx.fillText('start', R0, bottom + 17);
    ctx.textAlign = 'right';
    ctx.fillText('1 year', R1, bottom + 17);

    // ---- connector: dot's height IS the year-end value ----
    const dotX = xForLogN(curLogN);
    const dotY = valueToY(curVal);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = hexA(theme.amber, 0.5);
    ctx.lineWidth = 1.3;
    line(dotX, dotY, R1, dotY);
    ctx.setLineDash([]);
    ctx.fillStyle = theme.b;
    dot(R1, dotY, 3.5);

    // the grabbable point
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    dot(dotX, dotY, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    dot(dotX, dotY, 3);

    // readouts
    nOut.textContent = nDisplay.toLocaleString() + '×/yr';
    valOut.textContent = curVal.toFixed(6);
    gapOut.textContent = (E - curVal).toFixed(6);
  }

  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function hexA(hex, a) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- interaction ----
  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
    };
  }
  function inLeftPanel(x, y) {
    return x > g.L0 - 18 && x < g.L1 + 18 && y > g.top - 30 && y < g.bottom + 30;
  }
  function setFromX(x) {
    curLogN = targetLogN = logNForX(x);
  }
  function clearPresetHighlight() {
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.remove('on');
  }
  function startDrag(e) {
    const { x, y } = localXY(e);
    if (!inLeftPanel(x, y)) return;
    dragging = true;
    clearPresetHighlight();
    setFromX(x);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    setFromX(localXY(e).x);
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
    const nv = b.dataset.preset === 'max' ? NMAX : parseInt(b.dataset.preset, 10);
    targetLogN = Math.log(nv);
    for (const btn of presetSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

  // ---- animation loop (lerps toward preset targets in log space; instant while dragging) ----
  function tick() {
    if (!dragging) curLogN += (targetLogN - curLogN) * 0.18;
    draw();
    requestAnimationFrame(tick);
  }

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
