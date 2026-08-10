/* The Bar That Knows Exactly When to Stop — Fathom No. 21
   Vanilla canvas, no dependencies. Insertion sort, felt by hand: the next
   unsorted bar (amber) can be dragged left through the sorted stretch;
   every sorted bar taller than it slides out of the way, and it can go no
   further than the exact index where it belongs — a hard wall, computed
   from real comparisons against the (already sorted) prefix, not asserted.
   Release short of the wall and it springs back unsorted; reach the wall
   and it locks in, growing the sorted stretch by one. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const runBtn = document.getElementById('run');
  const stepBtn = document.getElementById('step');
  const shuffleBtn = document.getElementById('shuffle');
  const sortedOut = document.getElementById('sortedOut');
  const cmpOut = document.getElementById('cmpOut');
  const shiftOut = document.getElementById('shiftOut');
  const statusOut = document.getElementById('statusOut');

  const TAU = Math.PI * 2;
  const N = 9;
  const ANIM_MS = 420;
  const RUN_PAUSE_MS = 260;

  let theme;
  function readTheme() {
    const F = window.FATHOM || {};
    theme = {
      ink:    F.ink   || '#334155',
      muted:  F.muted || '#64748b',
      faint:  F.faint || 'rgba(15,23,42,0.10)',
      axis:   F.axis  || 'rgba(15,23,42,0.16)',
      teal:   F.a     || '#0891b2',
      amber:  F.handle || '#d97706',
      glow:   F.handleGlow || 'rgba(217,119,6,0.40)',
      mono:   F.mono || "'IBM Plex Mono', ui-monospace, monospace"
    };
  }
  readTheme();

  function hexA(hex, a) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex; // already a css color
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- sort state ----
  let original;      // fixed shuffle order for this round, length N, values 1..N
  let prefix;         // sorted-so-far values, ascending, length k
  let k;               // sortedBoundary: prefix.length, and index of the active value in `original`
  let activeValue;     // original[k], the bar currently being inserted (undefined once k === N)
  let minSlot;          // wall for the current activeValue, computed against `prefix`
  let displaySlot;        // continuous float, current visual slot of the active bar, in [minSlot, k]
  let dragging = false;
  let anim = null;         // {from, to, elapsed, duration, onDone}
  let running = false;
  let totalCmp = 0, totalShift = 0;
  let status = 'idle';       // idle | dragging | sorted
  let flashUntil = 0;         // ms timestamp; while > now, pulse the wall/lock glow

  function shuffled() {
    const arr = [];
    for (let i = 1; i <= N; i++) arr.push(i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function computeMinSlot(pre, value) {
    let i = pre.length;
    while (i > 0 && pre[i - 1] > value) i--;
    return i;
  }

  function newRound() {
    original = shuffled();
    prefix = [original[0]];
    k = 1;
    activeValue = original[k];
    minSlot = computeMinSlot(prefix, activeValue);
    displaySlot = k;
    dragging = false;
    anim = null;
    running = false;
    totalCmp = 0; totalShift = 0;
    status = 'idle';
    flashUntil = 0;
    updateRunBtn();
  }

  function commit() {
    // splice activeValue into prefix at minSlot
    prefix.splice(minSlot, 0, activeValue);
    totalShift += (k - minSlot);
    totalCmp += (k - minSlot) + (minSlot > 0 ? 1 : 0);
    k += 1;
    if (k >= N) {
      status = 'sorted';
      running = false;
      updateRunBtn();
      activeValue = undefined;
      displaySlot = k;
      return;
    }
    activeValue = original[k];
    minSlot = computeMinSlot(prefix, activeValue);
    displaySlot = k;
    status = 'idle';
  }

  function startAnim(from, to, onDone) {
    anim = { from, to, elapsed: 0, duration: ANIM_MS, onDone };
  }

  function doStep() {
    if (status === 'sorted' || dragging || anim) return;
    status = 'dragging';
    startAnim(k, minSlot, () => {
      flashUntil = performance.now() + 260;
      commit();
      if (running && status !== 'sorted') {
        setTimeout(() => { if (running) doStep(); }, RUN_PAUSE_MS);
      }
    });
  }

  function updateRunBtn() {
    runBtn.textContent = running ? 'Pause' : 'Run';
    runBtn.classList.toggle('primary', running);
    runBtn.disabled = status === 'sorted';
    stepBtn.disabled = status === 'sorted';
  }

  // ---- layout ----
  const g = {};
  function layout() {
    const cssW = canvas.clientWidth;
    const cssH = Math.max(300, Math.min(420, Math.round(cssW * 0.42)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.plotX0 = 22; g.plotX1 = cssW - 22;
    g.plotY0 = 34; g.plotY1 = cssH - 30;
    g.slotW = (g.plotX1 - g.plotX0) / N;
    g.barMaxH = g.plotY1 - g.plotY0 - 4;
    g.barW = Math.min(g.slotW * 0.62, 46);
  }
  function slotX(i) { return g.plotX0 + g.slotW * (i + 0.5); }
  function barH(value) { return g.barMaxH * (value / N); }

  // ---- render ----
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function currentDisplaySlot() {
    if (anim) {
      const t = Math.min(1, anim.elapsed / anim.duration);
      return anim.from + (anim.to - anim.from) * easeOutCubic(t);
    }
    return displaySlot;
  }

  function draw() {
    ctx.clearRect(0, 0, g.W, g.H);

    if (status === 'sorted') {
      drawSortedRow();
      updateReadouts();
      return;
    }

    const ds = currentDisplaySlot();
    const curSlot = Math.max(minSlot, Math.min(k, Math.round(ds)));

    // baseline
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.plotX0 - 4, g.plotY1 + 0.5);
    ctx.lineTo(g.plotX1 + 4, g.plotY1 + 0.5);
    ctx.stroke();

    // wall guide, while dragging/animating toward it
    if (status === 'dragging') {
      ctx.strokeStyle = hexA(theme.amber, 0.28);
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      const wx = slotX(minSlot) - g.slotW * 0.5 + 3;
      ctx.beginPath();
      ctx.moveTo(wx, g.plotY0 - 6);
      ctx.lineTo(wx, g.plotY1 + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // sorted-prefix bars (with active spliced at curSlot) — slots [0, k]
    for (let s = 0; s <= k; s++) {
      let value, isActive = false;
      if (s < curSlot) value = prefix[s];
      else if (s === curSlot) { value = activeValue; isActive = true; }
      else value = prefix[s - 1];
      const x = isActive ? g.plotX0 + g.slotW * (ds + 0.5) : slotX(s);
      drawBar(x, value, isActive ? 'active' : 'sorted');
    }

    // pending bars — untouched, slots [k+1, N-1]
    for (let s = k + 1; s < N; s++) {
      drawBar(slotX(s), original[s], 'pending');
    }

    // lock-in pulse
    if (performance.now() < flashUntil) {
      const t = 1 - (flashUntil - performance.now()) / 260;
      const x = slotX(minSlot);
      ctx.strokeStyle = hexA(theme.amber, 0.5 * (1 - t));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, g.plotY1 - barH(activeValue !== undefined ? activeValue : 1) * 0.5, 10 + t * 26, 0, TAU);
      ctx.stroke();
    }

    updateReadouts();
  }

  function drawSortedRow() {
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.plotX0 - 4, g.plotY1 + 0.5);
    ctx.lineTo(g.plotX1 + 4, g.plotY1 + 0.5);
    ctx.stroke();
    for (let s = 0; s < N; s++) drawBar(slotX(s), prefix[s], 'sorted');
  }

  function drawBar(x, value, kind) {
    const h = barH(value);
    const y = g.plotY1 - h;
    const w = g.barW;
    let fill, textColor, glow = false;
    if (kind === 'active') { fill = theme.amber; textColor = theme.amber; glow = true; }
    else if (kind === 'sorted') { fill = theme.teal; textColor = theme.ink; }
    else { fill = theme.faint; textColor = theme.muted; }

    ctx.save();
    if (glow) { ctx.shadowColor = theme.glow; ctx.shadowBlur = 14; }
    ctx.fillStyle = kind === 'pending' ? hexA(theme.axis, 0.55) : fill;
    const r = 4;
    roundRectTop(x - w / 2, y, w, h, r);
    ctx.fill();
    ctx.restore();

    ctx.font = `600 12px ${theme.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = textColor;
    ctx.fillText(String(value), x, Math.max(g.plotY0 - 8, y - 8));
  }

  function roundRectTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function updateReadouts() {
    sortedOut.textContent = `${status === 'sorted' ? N : k} / ${N}`;
    cmpOut.textContent = String(totalCmp);
    shiftOut.textContent = String(totalShift);
    statusOut.textContent = status === 'sorted' ? 'sorted!' : (dragging ? 'dragging' : (anim ? 'inserting' : 'idle'));
  }

  // ---- animation loop ----
  let lastT = null;
  function tick(t) {
    if (lastT == null) lastT = t;
    const dt = Math.min(50, t - lastT);
    lastT = t;

    if (anim) {
      anim.elapsed += dt;
      if (anim.elapsed >= anim.duration) {
        const done = anim.onDone;
        anim = null;
        if (done) done();
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function eventXY(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function activeBarRect() {
    if (status === 'sorted' || activeValue === undefined) return null;
    const ds = currentDisplaySlot();
    const x = g.plotX0 + g.slotW * (ds + 0.5);
    const h = barH(activeValue);
    const y = g.plotY1 - h;
    return { x0: x - g.barW / 2 - 6, x1: x + g.barW / 2 + 6, y0: y - 20, y1: g.plotY1 + 6 };
  }

  function startDrag(e) {
    if (status === 'sorted' || anim) return;
    const { x: px, y: py } = eventXY(e);
    const rect = activeBarRect();
    if (!rect || px < rect.x0 || px > rect.x1 || py < rect.y0 || py > rect.y1) return;
    dragging = true;
    running = false;
    updateRunBtn();
    status = 'dragging';
    displaySlot = k;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function moveDrag(e) {
    if (!dragging) return;
    const { x: px } = eventXY(e);
    const xMin = g.plotX0 + g.slotW * (minSlot + 0.5);
    const xMax = g.plotX0 + g.slotW * (k + 0.5);
    const xClamped = Math.max(xMin, Math.min(xMax, px));
    displaySlot = (xClamped - g.plotX0) / g.slotW - 0.5;
    e.preventDefault();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    const curSlot = Math.round(displaySlot);
    if (curSlot <= minSlot) {
      // reached the wall — lock in
      status = 'dragging';
      startAnim(displaySlot, minSlot, () => {
        flashUntil = performance.now() + 260;
        commit();
      });
    } else {
      // sprang back — not committed
      startAnim(displaySlot, k, () => { status = 'idle'; });
    }
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  canvas.style.cursor = 'grab';

  runBtn.addEventListener('click', () => {
    if (status === 'sorted') return;
    running = !running;
    updateRunBtn();
    if (running) doStep();
  });

  stepBtn.addEventListener('click', () => {
    if (running) { running = false; updateRunBtn(); }
    doStep();
  });

  shuffleBtn.addEventListener('click', () => { newRound(); });

  // ---- boot ----
  let ro;
  function boot() {
    newRound();
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
