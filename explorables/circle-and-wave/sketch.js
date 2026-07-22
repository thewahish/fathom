/* The Circle and the Wave — Fathom No. 01
   Vanilla canvas, no dependencies. A point circles on the left; its height
   traces a wave on the right. Drag the amber point to turn it by hand. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play');
  const speedEl = document.getElementById('speed');
  const angleOut = document.getElementById('angleOut');
  const valOut = document.getElementById('valOut');
  const modeSeg = document.getElementById('mode');

  const TAU = Math.PI * 2;

  let phase = 0;          // current angle of the driving point (radians)
  let playing = true;
  let mode = 'sin';       // 'sin' | 'cos' | 'both'
  let dragging = false;
  let lastT = null;

  // theme (canvas can't use CSS vars directly)
  let theme;
  function readTheme() {
    const light = window.matchMedia('(prefers-color-scheme: light)').matches;
    theme = light
      ? { bg: '#ffffff', axis: 'rgba(0,0,0,0.10)', ring: 'rgba(0,0,0,0.22)',
          text: '#6b7180', faint: 'rgba(0,0,0,0.05)' }
      : { bg: '#12151c', axis: 'rgba(255,255,255,0.10)', ring: 'rgba(255,255,255,0.20)',
          text: '#9aa1b0', faint: 'rgba(255,255,255,0.05)' };
    theme.blue = '#5b8def';   // sine leg + sine wave
    theme.violet = '#a855f7'; // cosine leg + cosine wave
    theme.amber = '#ffc857';  // the grabbable point
  }
  readTheme();
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', readTheme);

  // geometry, recomputed on resize
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(300, Math.min(400, Math.round(cssW * 0.46)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.pad = 22;
    g.R = Math.min(cssH * 0.34, 130);
    g.cx = g.pad + g.R + 10;
    g.cy = cssH / 2;
    g.waveX0 = g.cx + g.R + 42;
    g.waveX1 = cssW - g.pad;
    const waveW = g.waveX1 - g.waveX0;
    const periods = Math.max(1.6, waveW / 240); // ~one period per 240px
    g.pxPerRad = waveW / (periods * TAU);
  }

  function pointXY(a) {
    return { x: g.cx + g.R * Math.cos(a), y: g.cy - g.R * Math.sin(a) };
  }

  function draw() {
    const { W, H, cx, cy, R, waveX0, waveX1, pxPerRad } = g;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // zero axis across the whole stage
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.pad, cy); ctx.lineTo(waveX1, cy); ctx.stroke();

    // amplitude guides
    ctx.strokeStyle = theme.faint;
    ctx.beginPath(); ctx.moveTo(waveX0, cy - R); ctx.lineTo(waveX1, cy - R);
    ctx.moveTo(waveX0, cy + R); ctx.lineTo(waveX1, cy + R); ctx.stroke();

    // the circle
    ctx.strokeStyle = theme.ring;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

    const p = pointXY(phase);
    const showSin = mode === 'sin' || mode === 'both';
    const showCos = mode === 'cos' || mode === 'both';

    // right triangle legs inside the circle
    // cosine leg (horizontal): from center to point's x, at center height
    ctx.lineWidth = 3;
    ctx.strokeStyle = hexA(theme.violet, showCos ? 0.95 : 0.28);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, cy); ctx.stroke();
    // sine leg (vertical): from point's x at center height up to the point
    ctx.strokeStyle = hexA(theme.blue, showSin ? 0.95 : 0.28);
    ctx.beginPath(); ctx.moveTo(p.x, cy); ctx.lineTo(p.x, p.y); ctx.stroke();

    // radius to point
    ctx.strokeStyle = hexA(theme.amber, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();

    // the wave(s) — a static function of phase, so it "scrolls" as phase grows
    if (showCos) drawWave('cos', hexA(theme.violet, showSin ? 0.85 : 1));
    if (showSin) drawWave('sin', theme.blue);

    // connector from the point to the wave's leading edge (ties leg → wave)
    const leadY = showSin ? cy - R * Math.sin(phase) : cy - R * Math.cos(phase);
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = hexA(showSin ? theme.blue : theme.violet, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p.x, showSin ? p.y : p.y); ctx.lineTo(waveX0, leadY); ctx.stroke();
    ctx.setLineDash([]);

    // leading-edge dot
    ctx.fillStyle = showSin ? theme.blue : theme.violet;
    dot(waveX0, leadY, 4);

    // the grabbable point
    ctx.fillStyle = theme.amber;
    ctx.shadowColor = 'rgba(255,200,87,0.55)';
    ctx.shadowBlur = 14;
    dot(p.x, p.y, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    dot(p.x, p.y, 3);

    // readouts
    let deg = ((phase % TAU) + TAU) % TAU * 180 / Math.PI;
    angleOut.textContent = deg.toFixed(0) + '°';
    const v = (mode === 'cos') ? Math.cos(phase) : Math.sin(phase);
    valOut.textContent = (v >= 0 ? ' ' : '') + v.toFixed(2);
  }

  function drawWave(kind, color) {
    const { cy, R, waveX0, waveX1, pxPerRad } = g;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = waveX0; x <= waveX1; x += 1) {
      const a = phase - (x - waveX0) / pxPerRad;
      const y = cy - R * (kind === 'cos' ? Math.cos(a) : Math.sin(a));
      if (x === waveX0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- animation loop ----
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    if (playing && !dragging) {
      const v = (speedEl.value / 100) * 2.4; // rad/s
      phase = (phase + v * dt) % TAU;
    }
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

  modeSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    mode = b.dataset.mode;
    for (const btn of modeSeg.querySelectorAll('button')) btn.classList.toggle('on', btn === b);
  });

  function eventAngle(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { a: Math.atan2(g.cy - y, x - g.cx), x, y };
  }
  function nearPoint(x, y) {
    const p = pointXY(phase);
    return Math.hypot(x - p.x, y - p.y) < 26 || Math.hypot(x - g.cx, y - g.cy) < g.R + 20;
  }
  function startDrag(e) {
    const { a, x, y } = eventAngle(e);
    if (!nearPoint(x, y)) return;
    dragging = true;
    setPlaying(false);
    phase = (a + TAU) % TAU;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    phase = (eventAngle(e).a + TAU) % TAU;
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
