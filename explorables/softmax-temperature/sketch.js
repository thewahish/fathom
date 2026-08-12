/* The Dial Between a Coin Flip and a Sure Thing — Fathom No. 23
   Vanilla canvas, no dependencies. Five draggable amber score bars feed a
   real softmax: p_i = exp(x_i/T) / sum_j exp(x_j/T), rendered as a single
   horizontal bar split into five segments whose widths ARE the resulting
   probabilities and always sum to the full width. A temperature slider (and
   cold/neutral/hot presets) rescale every score before exponentiating —
   the same dial a language model's sampler uses. */

(function () {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('reset');
  const presetEl = document.getElementById('preset');
  const tempSlider = document.getElementById('temp');
  const tempOut = document.getElementById('tempOut');
  const winnerOut = document.getElementById('winnerOut');

  const TAU = Math.PI * 2;
  const N = 5;
  const SCORE_MIN = -4, SCORE_MAX = 4;
  const T_MIN = 0.15, T_MAX = 4;

  const DEFAULT_SCORES = [1.6, 0.4, -0.8, 2.2, -0.3];
  let scores = DEFAULT_SCORES.slice();
  let temperature = 1;

  // tween state — scores and temperature animate together on reset/preset
  let fromScores = scores.slice(), toScores = scores.slice();
  let fromT = temperature, toT = temperature;
  let animStart = null;
  const ANIM_MS = 500;

  let dragging = -1;
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
      fillB:   F.fillB || 'rgba(99,102,241,0.20)',
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
    const cssH = Math.max(420, Math.min(560, Math.round(cssW * 0.58)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.W = cssW; g.H = cssH;
    g.plotX0 = 26;
    g.plotX1 = cssW - 26;
    g.barSpacing = (g.plotX1 - g.plotX0) / N;

    g.scoreTop = 34;
    g.scoreBottom = g.scoreTop + Math.max(120, Math.round(cssH * 0.34));

    g.connY0 = g.scoreBottom + 22;
    g.connY1 = g.connY0 + Math.max(46, Math.round(cssH * 0.14));

    g.stackY0 = g.connY1 + 6;
    g.stackH = Math.max(46, Math.round(cssH * 0.16));
    g.stackY1 = g.stackY0 + g.stackH;
  }

  function barCenterX(i) { return g.plotX0 + g.barSpacing * (i + 0.5); }
  function scoreToY(v) {
    const t = (v - SCORE_MIN) / (SCORE_MAX - SCORE_MIN); // 0..1, 0 = bottom
    return g.scoreBottom - t * (g.scoreBottom - g.scoreTop);
  }
  function yToScore(y) {
    const t = (g.scoreBottom - y) / (g.scoreBottom - g.scoreTop);
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, t * (SCORE_MAX - SCORE_MIN) + SCORE_MIN));
  }

  // ---- the math ----
  function softmax(sArr, T) {
    const t = Math.max(T_MIN, T);
    const scaled = sArr.map(s => s / t);
    const m = Math.max.apply(null, scaled);
    const exps = scaled.map(v => Math.exp(v - m));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }
  function argmax(arr) {
    let best = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
    return best;
  }

  // ---- tween ----
  function animateTo(newScores, newT) {
    fromScores = currentScores();
    toScores = newScores.slice();
    fromT = currentTemp();
    toT = newT;
    animStart = performance.now();
  }
  function currentScores() {
    if (animStart == null) return scores.slice();
    const t = Math.min(1, (performance.now() - animStart) / ANIM_MS);
    const ease = 1 - Math.pow(1 - t, 3);
    return fromScores.map((v, i) => v + (toScores[i] - v) * ease);
  }
  function currentTemp() {
    if (animStart == null) return temperature;
    const t = Math.min(1, (performance.now() - animStart) / ANIM_MS);
    const ease = 1 - Math.pow(1 - t, 3);
    return fromT + (toT - fromT) * ease;
  }
  function stepAnim() {
    if (animStart == null) return;
    const t = (performance.now() - animStart) / ANIM_MS;
    scores = currentScores();
    temperature = currentTemp();
    tempSlider.value = String(temperature);
    if (t >= 1) { scores = toScores.slice(); temperature = toT; animStart = null; }
  }

  // ---- drawing ----
  function draw() {
    const { W, H } = g;
    ctx.clearRect(0, 0, W, H);

    const probs = softmax(scores, temperature);
    const winner = argmax(probs);

    // ---- score bars ----
    const zeroY = scoreToY(0);
    ctx.strokeStyle = theme.faint;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.plotX0, zeroY);
    ctx.lineTo(g.plotX1, zeroY);
    ctx.stroke();

    ctx.font = '12px ' + theme.mono;
    ctx.textAlign = 'center';
    const barX = new Array(N);
    for (let i = 0; i < N; i++) {
      const x = barCenterX(i);
      barX[i] = x;
      const y = scoreToY(scores[i]);
      const isWinner = i === winner;

      // track
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, g.scoreTop);
      ctx.lineTo(x, g.scoreBottom);
      ctx.stroke();

      // filled stem from zero to value
      ctx.strokeStyle = isWinner ? theme.indigo : theme.teal;
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

      // score value label
      ctx.fillStyle = active ? theme.ink : theme.muted;
      ctx.fillText(scores[i].toFixed(2), x, y - 14 < g.scoreTop + 8 ? y + 22 : y - 14);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.fillText('raw score', g.plotX0, g.scoreTop - 14);

    // ---- connectors: score bar -> probability segment ----
    let cum = 0;
    const segX = new Array(N), segW = new Array(N);
    for (let i = 0; i < N; i++) {
      segW[i] = probs[i] * (g.plotX1 - g.plotX0);
      segX[i] = g.plotX0 + cum;
      cum += segW[i];
    }
    for (let i = 0; i < N; i++) {
      const midX = segX[i] + segW[i] / 2;
      const isWinner = i === winner;
      ctx.strokeStyle = isWinner ? theme.indigo : theme.axis;
      ctx.globalAlpha = isWinner ? 0.6 : 0.5;
      ctx.lineWidth = isWinner ? 2 : 1.25;
      ctx.beginPath();
      ctx.moveTo(barX[i], g.connY0);
      ctx.bezierCurveTo(barX[i], (g.connY0 + g.connY1) / 2, midX, (g.connY0 + g.connY1) / 2, midX, g.connY1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---- stacked probability bar ----
    const r = 8;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g.plotX0 + r, g.stackY0);
    ctx.arcTo(g.plotX1, g.stackY0, g.plotX1, g.stackY1, r);
    ctx.arcTo(g.plotX1, g.stackY1, g.plotX0, g.stackY1, r);
    ctx.arcTo(g.plotX0, g.stackY1, g.plotX0, g.stackY0, r);
    ctx.arcTo(g.plotX0, g.stackY0, g.plotX1, g.stackY0, r);
    ctx.closePath();
    ctx.clip();

    for (let i = 0; i < N; i++) {
      const isWinner = i === winner;
      ctx.fillStyle = isWinner ? theme.fillB.replace(/[\d.]+\)$/, '0.85)') : theme.fillA.replace(/[\d.]+\)$/, '0.60)');
      ctx.fillRect(segX[i], g.stackY0, segW[i], g.stackH);
    }
    ctx.restore();

    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.plotX0 + r, g.stackY0);
    ctx.arcTo(g.plotX1, g.stackY0, g.plotX1, g.stackY1, r);
    ctx.arcTo(g.plotX1, g.stackY1, g.plotX0, g.stackY1, r);
    ctx.arcTo(g.plotX0, g.stackY1, g.plotX0, g.stackY0, r);
    ctx.arcTo(g.plotX0, g.stackY0, g.plotX1, g.stackY0, r);
    ctx.closePath();
    ctx.stroke();

    // segment dividers + labels
    ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(segX[i], g.stackY0);
        ctx.lineTo(segX[i], g.stackY1);
        ctx.stroke();
      }
      const pct = Math.round(probs[i] * 100);
      const label = pct + '%';
      const midX = segX[i] + segW[i] / 2;
      ctx.font = (i === winner ? '600 12px ' : '12px ') + theme.mono;
      if (segW[i] > 30) {
        ctx.fillStyle = i === winner ? '#fff' : theme.ink;
        ctx.fillText(label, midX, g.stackY0 + g.stackH / 2 + 4);
      } else {
        ctx.fillStyle = theme.muted;
        ctx.fillText(label, midX, g.stackY1 + 16);
      }
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.muted;
    ctx.font = '11px ' + theme.mono;
    ctx.fillText('probability (always sums to 100%)', g.plotX0, g.stackY1 + 30);

    // ---- readouts ----
    tempOut.textContent = temperature.toFixed(2);
    winnerOut.textContent = Math.round(probs[winner] * 100) + '%';
  }

  function tick() {
    stepAnim();
    draw();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  function eventX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  }
  function eventY(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  }
  function nearestBar(x, y) {
    if (y < g.scoreTop - 20 || y > g.scoreBottom + 30) return -1;
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
    animStart = null; // manual control cancels any running tween
    scores[i] = yToScore(y);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function moveDrag(e) {
    if (dragging >= 0) {
      scores[dragging] = yToScore(eventY(e));
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

  tempSlider.addEventListener('input', () => {
    animStart = null; // manual control cancels any running tween
    temperature = parseFloat(tempSlider.value);
    for (const btn of presetEl.children) btn.classList.remove('on');
  });

  presetEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-t]');
    if (!btn) return;
    for (const b of presetEl.children) b.classList.toggle('on', b === btn);
    animateTo(scores.slice(), parseFloat(btn.dataset.t));
  });

  resetBtn.addEventListener('click', () => {
    animateTo(DEFAULT_SCORES, 1);
    for (const btn of presetEl.children) btn.classList.toggle('on', btn.dataset.t === '1');
  });

  // ---- boot ----
  let ro;
  function boot() {
    layout();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => { layout(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', layout);
    }
    requestAnimationFrame(tick);
  }
  boot();
})();
